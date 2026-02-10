#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "IronSource Reporting MCP Server",
  version: "0.0.3"
});

const IRONSOURCE_API_BASE_URL = "https://api.ironsrc.com/advertisers/v2/reports";
const IRONSOURCE_AUTH_URL = "https://platform.ironsrc.com/partners/publisher/auth";
const IRONSOURCE_SECRET_KEY = process.env.IRONSOURCE_SECRET_KEY || '';
const IRONSOURCE_REFRESH_TOKEN = process.env.IRONSOURCE_REFRESH_TOKEN || '';

let bearerToken = '';
let tokenExpirationTime = 0;

if (!IRONSOURCE_SECRET_KEY || !IRONSOURCE_REFRESH_TOKEN) {
  console.error("Missing IronSource API credentials. Please set IRONSOURCE_SECRET_KEY and IRONSOURCE_REFRESH_TOKEN environment variables.");
  process.exit(1);
}

/**
 * Get a valid Bearer token for IronSource API
 */
async function getIronSourceBearerToken(): Promise<string> {
  // Check if token is still valid (with 5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (bearerToken && tokenExpirationTime > now + 300) {
    return bearerToken;
  }

  try {
    console.error('Fetching new IronSource bearer token');
    const response = await fetch(IRONSOURCE_AUTH_URL, {
      method: 'GET',
      headers: {
        'secretkey': IRONSOURCE_SECRET_KEY,
        'refreshToken': IRONSOURCE_REFRESH_TOKEN
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`IronSource Auth Error: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const token = await response.text();
    // Remove quotes if they exist in the response
    bearerToken = token.replace(/"/g, '');

    // Set expiration time (60 minutes from now)
    tokenExpirationTime = now + 3600;

    console.error('Successfully obtained IronSource bearer token');
    return bearerToken;
  } catch (error: any) {
    console.error('Error obtaining IronSource bearer token:', error);
    throw new Error(`Failed to get authentication token: ${error.message}`);
  }
}

/**
 * Make request to IronSource Reporting API
 */
async function fetchIronSourceReport(params: Record<string, string>) {
  // Get a valid token
  const token = await getIronSourceBearerToken();

  // Construct URL with query parameters
  const queryParams = new URLSearchParams(params);
  const reportUrl = `${IRONSOURCE_API_BASE_URL}?${queryParams.toString()}`;

  try {
    console.error(`Requesting IronSource report with params: ${JSON.stringify(params)}`);
    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json; */*',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`IronSource API Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
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
     console.error(`Error fetching IronSource report:`, error);
     throw new Error(`Failed to get IronSource report: ${error.message}`);
  }
}

// Tool: Get Advertiser Report
server.tool("get_advertiser_report_from_ironsource",
  "Get campaign spending data from IronSource Reporting API for advertisers.",
  {
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)"),
    metrics: z.string().optional().default("impressions,clicks,completions,installs,spend").describe("Comma-separated list of metrics to include (default: 'impressions,clicks,completions,installs,spend')"),
    breakdowns: z.string().optional().default("day,campaign").describe("Comma-separated list of breakdowns (default: 'day,campaign')"),
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

    // Build parameters with defaults matching the example query
    const params: Record<string, string> = {
      startDate,
      endDate,
      metrics: metrics || "impressions,clicks,completions,installs,spend",
      breakdowns: breakdowns || "day,campaign",
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

    const data = await fetchIronSourceReport(params);

    return {
      content: [
        {
          type: "text",
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        }
      ]
    };
  } catch (error: any) {
    const errorMessage = `Error getting IronSource advertiser report: ${error.message}`;

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
  console.error("IronSource Reporting MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
