#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import axios from "axios";
import { z } from "zod";
import type { AxiosError } from "axios";

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

// Define the params for Impact Radius spend reporting
const fetchSpendParams = {
  pub_campaign: z.string().describe("Publisher campaign ID"),
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
  "fetch_spend",
  "Fetch spend data from Impact Radius API for a specific publisher campaign and date range",
  fetchSpendParams,
  async (params) => {
    try {
      const url = `https://api.impact.com/Mediapartners/${impactRadiusSid}/Reports/partner_performance_by_day`;

      const requestParams = {
        ResultFormat: 'JSON',
        StartDate: `${params.start_date}T00:00:00Z`,
        EndDate: `${params.end_date}T23:59:59Z`,
        PUB_CAMPAIGN: params.pub_campaign
      };

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

        // Filter records by date range to ensure accuracy
        const filteredRecords = records.filter(record => {
          const recordDate = new Date(record.date_display);
          const startDate = new Date(params.start_date);
          const endDate = new Date(params.end_date);
          return recordDate >= startDate && recordDate <= endDate;
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              records: filteredRecords,
              count: filteredRecords.length
            }, null, 2)
          }],
        };
      } else {
        throw new Error(`API returned status code: ${response.status}`);
      }
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

1. fetch_spend
   Fetch spend data from Impact Radius API for a specific publisher campaign and date range.

   Parameters:
   - pub_campaign: string (required) - Publisher campaign ID
   - start_date: string (required) - Start date in YYYY-MM-DD format
   - end_date: string (required) - End date in YYYY-MM-DD format

   Returns:
   - JSON array of daily performance records including spend data
   - Each record contains: date_display, campaign_name, spend, clicks, impressions, etc.

   Authentication:
   - Requires IMPACT_RADIUS_SID and IMPACT_RADIUS_TOKEN environment variables
   - Uses HTTP Basic Authentication

   Example usage:
   fetch_spend({
     pub_campaign: "12345",
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
