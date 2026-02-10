#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

// Corrected Base URL
const APPSAMURAI_API_BASE = "http://api.appsamurai.com/api";
const APPSAMURAI_API_KEY = process.env.APPSAMURAI_API_KEY;

if (!APPSAMURAI_API_KEY) {
  console.error("Error: APPSAMURAI_API_KEY environment variable is not set.");
  process.exit(1);
}

// Create server instance
const server = new McpServer({
  name: "appsamurai-reporting",
  version: "0.0.6",
  capabilities: {
    tools: {},
    prompts: {},
  },
});

// --- Corrected Helper Function for API Call ---
async function fetchAppSamuraiData(
  startDate: string,
  endDate: string,
  campaignId?: string,
  bundleId?: string,
  platform?: string,
  campaignName?: string,
  country?: string
): Promise<any> {
  // Construct URL with API key in the path
  const url = `${APPSAMURAI_API_BASE}/customer-pull/spent/${APPSAMURAI_API_KEY}`;
  try {
    const response = await axios.get(url, {
      headers: { // No Authorization header needed
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      params: { // Query parameters
        start_date: startDate,
        end_date: endDate,
        ...(campaignId && { campaign_id: campaignId }),
        ...(bundleId && { bundle_id: bundleId }),
        ...(platform && { platform }),
        ...(campaignName && { campaign_name: campaignName }),
        ...(country && { country }),
      },
      timeout: 30000, // 30 second timeout
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching data from AppSamurai API:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      });
      // Provide more specific error messages based on status code
      if (error.response?.status === 401) {
        throw new Error(`AppSamurai API request failed: Unauthorized (Invalid API Key?)`);
      } else if (error.response?.status === 400) {
         throw new Error(`AppSamurai API request failed: Bad Request (Invalid Date Format?)`);
      } else if (error.response?.status === 404) {
         throw new Error(`AppSamurai API request failed: Not Found (No data matches filters?)`);
      } else {
        throw new Error(`AppSamurai API request failed: ${error.response?.status || error.message}`);
      }
    }
    throw new Error(`Failed to fetch data from AppSamurai API: ${error}`);
  }
}

// --- Tool Definition ---
server.tool(
  "get_appsamurai_campaign_spend", // Tool name
  "Get campaign spending data via AppSamurai Campaign Spend API.", // Tool description
  { // Input schema using Zod
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("End date in YYYY-MM-DD format"),
    campaignId: z.string().optional().describe("Filter by specific campaign ID"),
    bundleId: z.string().optional().describe("Filter by specific application bundle ID"),
    platform: z.string().optional().describe("Filter by platform (e.g., ios, play)"),
    campaignName: z.string().optional().describe("Filter by campaign name"),
    country: z.string().optional().describe("Filter by country in ISO 3166-1 alpha-2 format (e.g., US, GB)"),
  },
  async ({ startDate, endDate, campaignId, bundleId, platform, campaignName, country }) => { // Tool execution logic
    try {
      const spendData = await fetchAppSamuraiData(
        startDate,
        endDate,
        campaignId,
        bundleId,
        platform,
        campaignName,
        country
      );
      // Format the data nicely for the LLM/user
      const formattedData = JSON.stringify(spendData, null, 2);
      return {
        content: [{
          type: "text",
          text: `Campaign spend data from ${startDate} to ${endDate}:\n\`\`\`json\n${formattedData}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching campaign spend.";
      console.error("Error in get_campaign_spend tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error fetching campaign spend: ${errorMessage}` }],
        isError: true, // Indicate that the tool execution resulted in an error
      };
    }
  }
);

// --- Prompt Definition ---
server.prompt(
  "check_appsamurai_campaign_spend", // Prompt name
  "Check campaign spending for a specific period through the AppSamurai Campaign Spend API.", // Prompt description
  { // Argument schema using Zod
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("End date (YYYY-MM-DD)"),
    campaignId: z.string().optional().describe("Filter by specific campaign ID"),
    bundleId: z.string().optional().describe("Filter by specific application bundle ID"),
    platform: z.string().optional().describe("Filter by platform (e.g., ios, play)"),
    campaignName: z.string().optional().describe("Filter by campaign name"),
    country: z.string().optional().describe("Filter by country in ISO 3166-1 alpha-2 format (e.g., US, GB)"),
  },
  ({ startDate, endDate, campaignId, bundleId, platform, campaignName, country }) => {
    // Build filters text based on provided optional parameters
    const filters = [];
    if (campaignId) filters.push(`campaign ID: ${campaignId}`);
    if (bundleId) filters.push(`bundle ID: ${bundleId}`);
    if (platform) filters.push(`platform: ${platform}`);
    if (campaignName) filters.push(`campaign name: ${campaignName}`);
    if (country) filters.push(`country: ${country}`);

    const filtersText = filters.length > 0
      ? ` with filters: ${filters.join(', ')}`
      : '';

    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please retrieve and summarize the AppSamurai campaign spend data from ${startDate} to ${endDate}${filtersText}.`,
        }
      }],
    };
  }
);


// --- Run the Server ---
async function main() {
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    console.error("AppSamurai Reporting MCP Server running on stdio...");
  } catch (error) {
    console.error("Failed to start AppSamurai Reporting MCP Server:", error);
    process.exit(1);
  }
}

main();
