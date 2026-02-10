#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "AppLovin Reporting MCP Server",
  version: "0.0.2"
});

const APPLOVIN_API_BASE_URL = "https://r.applovin.com/report";
const APPLOVIN_API_KEY = process.env.APPLOVIN_API_KEY || '';

if (!APPLOVIN_API_KEY) {
  console.error("Missing AppLovin API credentials. Please set APPLOVIN_API_KEY environment variable.");
  process.exit(1);
}

/**
 * Make request to AppLovin Reporting API
 */
async function fetchAppLovinReport(params: Record<string, string>) {
  // Construct URL with query parameters
  const queryParams = new URLSearchParams({
    api_key: APPLOVIN_API_KEY,
    ...params
  });

  const reportUrl = `${APPLOVIN_API_BASE_URL}?${queryParams.toString()}`;

  try {
    console.error(`Requesting AppLovin report with params: ${JSON.stringify(params)}`);
    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json; */*'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`AppLovin API Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      // If response is CSV or other format
      return await response.text();
    }
  } catch (error: any) {
     console.error(`Error fetching AppLovin report:`, error);
     throw new Error(`Failed to get AppLovin report: ${error.message}`);
  }
}

// Tool: Get Advertiser Report
server.tool("get_advertiser_report",
  "Get campaign spending data from AppLovin Reporting API for advertisers.",
  {
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)"),
    columns: z.string().optional().describe("Comma-separated list of columns to include (e.g., 'day,campaign,impressions,clicks,conversions,cost')"),
    format: z.enum(["json", "csv"]).default("json").describe("Format of the report data"),
    filter_campaign: z.string().optional().describe("Filter results by campaign name"),
    filter_country: z.string().optional().describe("Filter results by country (e.g., 'US,JP')"),
    filter_platform: z.string().optional().describe("Filter results by platform (e.g., 'android,ios')"),
    sort_column: z.string().optional().describe("Column to sort by (e.g., 'cost')"),
    sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort order (ASC or DESC)")
}, async ({ start_date, end_date, columns, format, filter_campaign, filter_country, filter_platform, sort_column, sort_order }) => {
  try {
    // Validate date range logic
    if (new Date(start_date) > new Date(end_date)) {
      throw new Error("Start date cannot be after end date.");
    }

    // Default columns if not specified
    const reportColumns = columns || "day,campaign,impressions,clicks,ctr,conversions,conversion_rate,cost";

    // Build parameters
    const params: Record<string, string> = {
      start: start_date,
      end: end_date,
      columns: reportColumns,
      format: format,
      report_type: "advertiser" // Specify advertiser report type
    };

    // Add optional filters if provided
    if (filter_campaign) params['filter_campaign'] = filter_campaign;
    if (filter_country) params['filter_country'] = filter_country;
    if (filter_platform) params['filter_platform'] = filter_platform;

    // Add sorting if provided
    if (sort_column && sort_order) {
      params[`sort_${sort_column}`] = sort_order;
    }

    const data = await fetchAppLovinReport(params);

    return {
      content: [
        {
          type: "text",
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error getting AppLovin advertiser report: ${error.message}`;

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
  console.error("AppLovin Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
