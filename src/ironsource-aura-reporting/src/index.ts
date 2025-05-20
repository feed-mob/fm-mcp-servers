#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "IronSource Aura Reporting MCP Server",
  version: "0.0.1"
});

const IRONSOURCE_AURA_API_BASE_URL = process.env.IRONSOURCE_AURA_API_BASE_URL || "";
const IRONSOURCE_AURA_API_KEY = process.env.IRONSOURCE_AURA_API_KEY || '';

if (!IRONSOURCE_AURA_API_KEY) {
  console.error("Missing IronSource Aura API credentials. Please set IRONSOURCE_AURA_API_KEY environment variable.");
  process.exit(1);
}

/**
 * Make request to IronSource Aura Reporting API with retry mechanism
 */
async function fetchIronSourceAuraReport(params: Record<string, string>, maxRetries = 3, baseInterval = 3000): Promise<any> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.error(`Requesting IronSource Aura report with params: ${JSON.stringify(params)}`);
      const queryParams = new URLSearchParams(params);
      const reportUrl = `${IRONSOURCE_AURA_API_BASE_URL}?${queryParams.toString()}`;

      const response = await fetch(reportUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json; */*',
          'Authorization': IRONSOURCE_AURA_API_KEY
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`IronSource Aura API Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data.data || data; // Return data.data if it exists (matching Ruby implementation)
      } else {
        // If response is CSV or other format
        return await response.text();
      }
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries) {
        console.error(`Error fetching IronSource Aura report after ${maxRetries} attempts:`, error);
        throw new Error(`Failed to get IronSource Aura report: ${error.message}`);
      }

      // Exponential backoff with jitter
      const delay = baseInterval * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
      console.error(`Retrying in ${Math.round(delay / 1000)} seconds... (Attempt ${attempt} of ${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to fetch IronSource Aura report after maximum retries");
}

// Tool: Get Advertiser Report
server.tool("get_advertiser_report_from_aura",
  "Get campaign spending data from Aura(IronSource) Reporting API for advertisers.",
  {
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)"),
    metrics: z.string().optional().default("impressions,clicks,completions,installs,spend").describe("Comma-separated list of metrics to include (default: 'impressions,clicks,completions,installs,spend')"),
    breakdowns: z.string().optional().default("day,campaign_name").describe("Comma-separated list of breakdowns (default: 'day,campaign_name')"),
    format: z.enum(["json", "csv"]).default("json").describe("Format of the report data"),
    count: z.number().optional().describe("Number of records to return (default: 10000, max: 250000)"),
    campaignId: z.string().optional().describe("Filter by comma-separated list of campaign IDs"),
    bundleId: z.string().optional().describe("Filter by comma-separated list of bundle IDs"),
    creativeId: z.string().optional().describe("Filter by comma-separated list of creative IDs"),
    country: z.string().optional().describe("Filter by comma-separated list of countries (ISO 3166-2)"),
    os: z.enum(["ios", "android"]).optional().describe("Filter by operating system (ios or android)"),
    deviceType: z.enum(["phone", "tablet"]).optional().describe("Filter by device type"),
    adUnit: z.string().optional().describe("Filter by ad unit type (e.g., 'rewardedVideo,interstitial')"),
    order: z.string().optional().describe("Order results by breakdown/metric"),
    direction: z.enum(["asc", "desc"]).optional().default("asc").describe("Order direction (asc or desc)")
}, async ({ startDate, endDate, metrics, breakdowns, format, count, campaignId, bundleId, creativeId, country, os, deviceType, adUnit, order, direction }) => {
  try {
    // Validate date range logic
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date.");
    }

    // Build parameters with defaults matching the Ruby implementation
    const params: Record<string, string> = {
      start_date: startDate,    // Change to snake_case to match Ruby implementation
      end_date: endDate,        // Change to snake_case to match Ruby implementation
      metrics: metrics || "impressions,clicks,completions,installs,spend",
      breakdowns: breakdowns || "day,campaign_name",  // Default to campaign_name instead of campaign
      format: format || "json"
    };

    // Add optional parameters if provided
    if (count) params.count = count.toString();
    if (campaignId) params.campaignId = campaignId;
    if (bundleId) params.bundleId = bundleId;
    if (creativeId) params.creativeId = creativeId;
    if (country) params.country = country;
    if (os) params.os = os;
    if (deviceType) params.deviceType = deviceType;
    if (adUnit) params.adUnit = adUnit;
    if (order) params.order = order;
    if (direction) params.direction = direction;

    const data = await fetchIronSourceAuraReport(params);

    return {
      content: [
        {
          type: "text",
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error getting IronSource Aura advertiser report: ${error.message}`;

    return {
      content: [
        {
          type: "text",
          text: errorMessage
        }
      ],
      isError: true
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("IronSource Aura Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
