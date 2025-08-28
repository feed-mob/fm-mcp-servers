#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import axios from "axios";
import { z } from "zod";
import type { AxiosError } from "axios";
import { fetchImpactRaidusCampaignMapping } from "./fm_impact_radius_mapping.js";

// Load environment variables
dotenv.config();

const impactRadiusSid = process.env.IMPACT_RADIUS_SID;
const impactRadiusToken = process.env.IMPACT_RADIUS_TOKEN;

if (!impactRadiusSid || !impactRadiusToken) {
  throw new Error("Missing required environment variables: IMPACT_RADIUS_SID and IMPACT_RADIUS_TOKEN");
}

// Create MCP server
const server = new McpServer({
  name: "Impact Radius MCP Server",
  version: "0.0.1",
});

// Define the params for Impact Radius FCO reporting
const fetchFcoParams = {
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format")
} as const;

interface ImpactRadiusRecord {
  date_display: string;
  [key: string]: any;
}

interface ImpactRadiusResponse {
  Records?: ImpactRadiusRecord[];
}

server.tool(
  "fetch_action_list_from_impact_radius",
  "Fetch action list from Impact Radius API with campaign mapping integration for a date range",
  fetchFcoParams,
  async (params) => {
    try {
      // First, get campaign mappings from FeedMob API
      const campaignMappings = await fetchImpactRaidusCampaignMapping({});

      if (!campaignMappings || !campaignMappings.data || !Array.isArray(campaignMappings.data)) {
        throw new Error("Invalid campaign mapping response");
      }

      const url = `https://api.impact.com/Mediapartners/${impactRadiusSid}/Reports/mp_action_listing_sku.json`;
      const allRecords: ImpactRadiusRecord[] = [];

      // Make API call for each mapping
      for (const mapping of campaignMappings.data) {
        const requestParams = {
          ResultFormat: 'JSON',
          StartDate: `${params.start_date}T00:00:00Z`,
          EndDate: `${params.end_date}T23:59:59Z`,
          PUB_CAMPAIGN: mapping.impact_brand || '',
          MP_AD_ID: mapping.impact_ad || '',
          PUB_ACTION_TRACKER: mapping.impact_event_type || '',
          SUPERSTATUS_MS: ['APPROVED', 'NA', 'PENDING'],
        };

        try {
          const response = await axios.get(url, {
            params: requestParams,
            auth: {
              username: impactRadiusSid,
              password: impactRadiusToken
            },
            headers: {
              'Accept': 'application/json'
            }
          });

          if (response.status === 200) {
            const data: ImpactRadiusResponse = response.data;
            const records = data.Records || [];

            // Add mapping info to each record
            const recordsWithMapping = records.map(record => ({
              ...record,
              mapping_impact_brand: mapping.impact_brand,
              mapping_impact_ad: mapping.impact_ad,
              mapping_impact_event_type: mapping.impact_event_type,
              campaign: mapping.campaign_name,
              client_name: mapping.client_name,
            }));

            allRecords.push(...recordsWithMapping);
          }
        } catch (error) {
          console.error(`Error fetching data for mapping ${mapping.id}:`, error);
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            allrecords: allRecords,
            total_count: allRecords.length
          }, null, 2)
        }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? `Impact Radius API error: ${(error as AxiosError).response?.data || error.message}`
        : 'Unknown error occurred';
      return {
        content: [{
          type: "text",
          text: errorMessage
        }],
        isError: true
      };
    }
  }
);

// Add documentation prompt
server.prompt(
  "help",
  {},
  () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `
Impact Radius MCP Server

Available tools:

1. fetch_action_list_from_impact_radius
   Fetch action list from Impact Radius API with campaign mapping integration for a date range.

   Parameters:
   - start_date: string (required) - Start date in YYYY-MM-DD format
   - end_date: string (required) - End date in YYYY-MM-DD format

   Returns:
   - JSON object with allrecords array containing action data with mapping context
   - Each record includes: original Impact Radius action data plus mapping fields
   - Additional fields: mapping_impact_brand, mapping_impact_ad, mapping_impact_event_type, campaign, client_name
   - Includes total_count of all records returned

   Authentication:
   - Requires IMPACT_RADIUS_SID and IMPACT_RADIUS_TOKEN environment variables for Impact Radius API
   - Requires FEEDMOB_KEY and FEEDMOB_SECRET environment variables for FeedMob campaign mapping API
   - Uses HTTP Basic Authentication for Impact Radius and JWT authentication for FeedMob

   Data Integration:
   - First fetches campaign mappings from FeedMob API
   - Then queries Impact Radius API for each mapping configuration
   - Combines action data with campaign mapping context

   Example usage:
   fetch_action_list_from_impact_radius({
     start_date: "2024-01-01",
     end_date: "2024-01-31"
   })
        `
      }
    }]
  })
);

// Set up STDIO transport
const transport = new StdioServerTransport();

// Connect server to transport
await server.connect(transport);
