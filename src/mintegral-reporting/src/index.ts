#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// ============= Server Setup =============
const server = new McpServer({
  name: "mintegral-reporting",
  version: "0.0.4"
});

// ============= Mintegral Implementation =============
const MINTEGRAL_API_HOST = "ss-api.mintegral.com";
const MINTEGRAL_API_PATH = "/api/v1/reports/data";
const MINTEGRAL_ACCESS_KEY = process.env.MINTEGRAL_ACCESS_KEY || '';
const MINTEGRAL_API_KEY = process.env.MINTEGRAL_API_KEY || '';

// Check credentials on startup
if (!MINTEGRAL_ACCESS_KEY || !MINTEGRAL_API_KEY) {
  console.error("[Mintegral] Missing API credentials. Please set MINTEGRAL_ACCESS_KEY and MINTEGRAL_API_KEY environment variables.");
  process.exit(1);
}

/**
 * Get current timestamp in seconds (Unix timestamp)
 */
function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generate token for Mintegral API authentication
 *
 * Token is Md5(API key.md5(timestamp)) as per documentation
 */
function getMintegralToken(timestamp: number): string {
  const timestampMd5 = crypto.createHash('md5').update(timestamp.toString()).digest('hex');
  const token = crypto.createHash('md5').update(MINTEGRAL_API_KEY + timestampMd5).digest('hex');
  return token;
}

/**
 * Validate Mintegral API parameters
 */
function validateMintegralParams(params: Record<string, any>): void {
  const { start_date, end_date } = params;

  // Check date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    throw new Error("Dates must be in YYYY-MM-DD format");
  }

  // Check date range
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  if (startDate > endDate) {
    throw new Error("Start date cannot be after end date");
  }

  // Check if dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid date values");
  }

  // Check if date range exceeds 8 days as per API docs
  const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff > 8) {
    throw new Error("Date range cannot exceed 8 days for a single request");
  }

  // Check if per_page exceeds maximum
  if (params.per_page && params.per_page > 5000) {
    throw new Error("per_page cannot exceed 5000");
  }
}

/**
 * Make request to Mintegral Performance Reporting API
 */
async function fetchMintegralReport(params: Record<string, string>) {
  try {
    // Validate parameters
    validateMintegralParams(params);

    // Construct URL with query parameters
    const queryParams = new URLSearchParams(params);
    const reportUrl = `https://${MINTEGRAL_API_HOST}${MINTEGRAL_API_PATH}?${queryParams.toString()}`;

    // Generate authentication headers based on documentation at:
    // https://adv-new.mintegral.com/doc/en/guide/introduction/token.html
    const timestamp = getTimestamp();
    const token = getMintegralToken(timestamp);

    console.error(`[Mintegral] Auth: timestamp=${timestamp}, token=${token}`);
    console.error(`[Mintegral] Requesting report with params: ${JSON.stringify(params)}`);

    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'access-key': MINTEGRAL_ACCESS_KEY,
        'token': token,
        'timestamp': timestamp.toString()
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Mintegral] API Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API error codes in the response
    if (data.code && data.code !== 200) {
      console.error(`[Mintegral] API Error Code: ${data.code}, Message: ${data.msg || 'Unknown error'}`);
      throw new Error(`API returned error code ${data.code}: ${data.msg || 'Unknown error'}`);
    }

    return data;
  } catch (error: any) {
     console.error(`[Mintegral] Error fetching report:`, error);
     throw new Error(`Failed to get Mintegral report: ${error.message}`);
  }
}

// Tool: Get Mintegral Performance Report
server.tool("get_mintegral_performance_report",
  "Get performance data from Mintegral Reporting API.",
  {
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe("Start date for the report (YYYY-MM-DD)"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe("End date for the report (YYYY-MM-DD)"),
    utc: z.string().optional().default("+8").describe("Timezone (default: '+8')"),
    per_page: z.number().optional().default(50).describe("Number of results per page (max: 5000)"),
    page: z.number().optional().default(1).describe("Page number"),
    dimension: z.string().optional().describe("Data dimension (e.g., 'location', 'sub_id', 'creative')"),
    uuid: z.string().optional().describe("Filter by uuid"),
    campaign_id: z.number().optional().describe("Filter by campaign_id"),
    package_name: z.string().optional().describe("Filter by android bundle id or ios app store id"),
    not_empty_field: z.string().optional().describe("Fields that can't be empty (comma-separated: 'click', 'install', 'impression', 'spend')")
  },
  async (params) => {
    try {
      // Build parameters to match example request format
      const apiParams: Record<string, string> = {};

      // Add parameters in the order shown in the example
      apiParams.start_date = params.start_date;
      apiParams.end_date = params.end_date;
      if (params.per_page) apiParams.per_page = params.per_page.toString();
      if (params.page) apiParams.page = params.page.toString();
      if (params.utc) apiParams.utc = params.utc;
      if (params.dimension) apiParams.dimension = params.dimension;

      // Add remaining optional parameters
      if (params.uuid) apiParams.uuid = params.uuid;
      if (params.campaign_id) apiParams.campaign_id = params.campaign_id.toString();
      if (params.package_name) apiParams.package_name = params.package_name;
      if (params.not_empty_field) apiParams.not_empty_field = params.not_empty_field;

      const data = await fetchMintegralReport(apiParams);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error getting Mintegral performance report: ${error.message}`;

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
  }
);

// ============= Server Startup =============
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[Server] mintegral-reporting MCP Server running on stdio");
  } catch (error) {
    console.error("[Server] Error during server startup:", error);
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error("[Server] Fatal error running server:", error);
  process.exit(1);
});
