#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodSchema } from "zod";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import * as process from 'process';

dotenv.config(); // Load environment variables from .env file

// Liftoff API Configuration
const LIFTOFF_API_BASE = "https://data.liftoff.io/api/v1";
const LIFTOFF_API_KEY = process.env.LIFTOFF_API_KEY;
const LIFTOFF_API_SECRET = process.env.LIFTOFF_API_SECRET;

if (!LIFTOFF_API_KEY || !LIFTOFF_API_SECRET) {
  console.error("Error: LIFTOFF_API_KEY or LIFTOFF_API_SECRET environment variable is not set.");
  process.exit(1);
}

// Create server instance
const server = new McpServer({
  name: "liftoff-reporting",
  version: "0.0.4", // Updated version
  capabilities: {
    tools: {}, // Only tools capability needed for now
  },
});

// --- Helper Function for Liftoff API Calls ---
interface LiftoffErrorResponse {
  error_type?: string;
  message?: string;
  errors?: string[];
}

async function makeLiftoffApiRequest(
  method: 'get' | 'post',
  endpoint: string,
  params?: Record<string, any>,
  data?: Record<string, any>
): Promise<any> {
  const url = `${LIFTOFF_API_BASE}${endpoint}`;
  const auth = {
    username: LIFTOFF_API_KEY!,
    password: LIFTOFF_API_SECRET!,
  };
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const response = await axios({
      method: method,
      url: url,
      auth: auth,
      headers: headers,
      params: params, // GET request parameters
      data: data,     // POST request body
      timeout: 60000, // 60 second timeout for potentially long reports
    });
    // For data download, response might not be JSON if format=csv
    if (endpoint.endsWith('/data') && response.headers['content-type']?.includes('text/csv')) {
        return response.data; // Return raw CSV string
    }
    return response.data;
  } catch (error: unknown) {
    console.error(`Error making Liftoff API request to ${method.toUpperCase()} ${url}:`, error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<LiftoffErrorResponse>;
      console.error("Axios error details:", {
        message: axiosError.message,
        code: axiosError.code,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      });
      const errorData = axiosError.response?.data;
      const errorType = errorData?.error_type || 'Unknown Error';
      const errorMessage = errorData?.message || axiosError.message;
      const errorDetails = errorData?.errors?.join(', ') || 'No details provided.';
      throw new Error(`Liftoff API Error (${axiosError.response?.status} ${errorType}): ${errorMessage} Details: ${errorDetails}`);
    }
    throw new Error(`Failed to call Liftoff API: ${error}`);
  }
}

// --- Tool Definitions ---

const reportGroupBySchema = z.array(z.string()).optional().default(["apps", "campaigns", "country"]).describe(
  "Group metrics by one of the available presets. e.g., [\"apps\", \"campaigns\"], [\"apps\", \"campaigns\", \"country\"]"
);

const reportFormatSchema = z.enum(["csv", "json"]).optional().default("csv").describe("Format of the report data");

const createReportInputSchema = z.object({
    start_time: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/).describe("Start date (YYYY-MM-DD) or timestamp (YYYY-MM-DDTHH:mm:ssZ) in UTC."),
    end_time: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/).describe("End date (YYYY-MM-DD) or timestamp (YYYY-MM-DDTHH:mm:ssZ) in UTC."),
    group_by: reportGroupBySchema,
    app_ids: z.array(z.string()).optional().describe("Optional. Filter by specific app IDs."),
    campaign_ids: z.array(z.string()).optional().describe("Optional. Filter by specific campaign IDs."),
    event_ids: z.array(z.string()).optional().describe("Optional. Filter by specific event IDs."),
    cohort_window: z.number().int().min(1).max(90).optional().describe("Optional. Number of days since install (1-90)."),
    format: reportFormatSchema,
    callback_url: z.string().url().optional().describe("Optional. URL to receive POST when report is done."),
    timezone: z.string().optional().default("UTC").describe("Optional. TZ database name (e.g., 'America/Los_Angeles')."),
    include_repeat_events: z.boolean().optional().default(true),
    remove_zero_rows: z.boolean().optional().default(false),
    use_two_letter_country: z.boolean().optional().default(false),
});

// 1. Create Report Tool
server.tool(
  "create_liftoff_report",
  "Generate a report via the Liftoff Reporting API.",
  createReportInputSchema.shape,
  async (reportParams: z.infer<typeof createReportInputSchema>) => {
    try {
      const response = await makeLiftoffApiRequest('post', '/reports', undefined, reportParams);
      return {
        content: [{
          type: "text",
          text: `Report creation initiated successfully. Report ID: ${response.id}, State: ${response.state}`,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred creating the report.";
      console.error("Error in create_liftoff_report tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error creating report: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// 2. Check Report Status Tool
const checkStatusInputSchema = z.object({
    report_id: z.string().describe("The ID of the report to check."),
});

server.tool(
  "check_liftoff_report_status",
  "Get the status of a previously created Liftoff report once every minute until it is completed.",
  checkStatusInputSchema.shape,
  async ({ report_id }: z.infer<typeof checkStatusInputSchema>) => {
    try {
      const response = await makeLiftoffApiRequest('get', `/reports/${report_id}/status`);
      return {
        content: [{
          type: "text",
          text: `Report Status for ID ${report_id}: ${response.state}. Created at: ${response.created_at}. Parameters: ${JSON.stringify(response.parameters)}`,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred checking report status.";
      console.error("Error in check_liftoff_report_status tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error checking report status: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// 3. Download Report Data Tool
const downloadDataInputSchema = z.object({
    report_id: z.string().describe("The ID of the completed report to download."),
    // Format is determined at creation time, not download time according to docs.
    // If download format override was possible, add 'format' here.
});

server.tool(
  "download_liftoff_report_data",
  "Download the data for a completed Liftoff report.",
  downloadDataInputSchema.shape,
  async ({ report_id }: z.infer<typeof downloadDataInputSchema>) => {
    try {
      // Note: The API might return CSV text or JSON based on creation 'format'.
      // This tool returns the raw response text. The LLM might need to parse it.
      const reportData = await makeLiftoffApiRequest('get', `/reports/${report_id}/data`);
      let outputText = '';
      if (typeof reportData === 'string') {
        // Likely CSV data
        outputText = `Report data (CSV) for ID ${report_id}:\n\`\`\`csv\n${reportData}\n\`\`\``;
      } else if (typeof reportData === 'object') {
         // Likely JSON data
         outputText = `Report data (JSON) for ID ${report_id}:\n\`\`\`json\n${JSON.stringify(reportData, null, 2)}\n\`\`\``;
      } else {
        outputText = `Received unexpected data format for report ID ${report_id}.`;
      }

      return {
        content: [{ type: "text", text: outputText }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred downloading report data.";
      console.error("Error in download_liftoff_report_data tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error downloading report data: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// 4. List Apps Tool
const listAppsInputSchema = z.object({}); // Keep the object for inference
server.tool(
  "list_liftoff_apps",
  "Fetch app details from the Liftoff Reporting API.",
  listAppsInputSchema.shape,
  async () => {
    try {
      const apps = await makeLiftoffApiRequest('get', '/apps');
      return {
        content: [{
          type: "text",
          text: `Available Liftoff Apps:\n\`\`\`json\n${JSON.stringify(apps, null, 2)}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred listing apps.";
      console.error("Error in list_liftoff_apps tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error listing apps: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// 5. List Campaigns Tool
const listCampaignsInputSchema = z.object({}); // Keep the object for inference
server.tool(
  "list_liftoff_campaigns",
  "Fetch campaign details from the Liftoff Reporting API.",
  listCampaignsInputSchema.shape,
  async () => {
    try {
      const campaigns = await makeLiftoffApiRequest('get', '/campaigns');
      return {
        content: [{
          type: "text",
          text: `Available Liftoff Campaigns:\n\`\`\`json\n${JSON.stringify(campaigns, null, 2)}\n\`\`\``,
        }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred listing campaigns.";
      console.error("Error in list_liftoff_campaigns tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error listing campaigns: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// 6. Download Report Data with Campaign Names Tool
server.tool(
  "download_liftoff_report_with_names",
  "Download the data for a completed Liftoff report with campaign names.",
  downloadDataInputSchema.shape,
  async ({ report_id }: z.infer<typeof downloadDataInputSchema>) => {
    try {
      // Get report data
      const reportData = await makeLiftoffApiRequest('get', `/reports/${report_id}/data`);

      // Get campaign information
      const campaignsResponse = await makeLiftoffApiRequest('get', '/campaigns');

      if (!Array.isArray(campaignsResponse)) {
        throw new Error("Failed to retrieve campaign information");
      }

      // Create map of campaign IDs to names
      const campaignMap = new Map();
      campaignsResponse.forEach((campaign: any) => {
        campaignMap.set(campaign.id, campaign.name);
      });

      // Process the report data to include campaign names
      let outputData;

      if (typeof reportData === 'string') {
        // If CSV format, need to parse and modify
        const rows = reportData.split('\n');
        const headers = rows[0].split(',');

        // Add campaign_name header
        const campaignIdIndex = headers.indexOf('campaign_id');
        if (campaignIdIndex > -1) {
          headers.push('campaign_name');
          rows[0] = headers.join(',');

          // Add campaign name to each data row
          for (let i = 1; i < rows.length; i++) {
            if (rows[i].trim()) {
              const values = rows[i].split(',');
              const campaignId = values[campaignIdIndex];
              const campaignName = campaignMap.get(campaignId) || 'Unknown Campaign';
              values.push(`"${campaignName}"`);
              rows[i] = values.join(',');
            }
          }
        }
        outputData = rows.join('\n');
        return {
          content: [{ type: "text", text: `Report data (CSV) with campaign names for ID ${report_id}:\n\`\`\`csv\n${outputData}\n\`\`\`` }],
        };
      } else if (typeof reportData === 'object') {
        // If JSON format
        if (reportData.columns && reportData.rows && Array.isArray(reportData.rows)) {
          // Add campaign_name to columns
          const campaignIdIndex = reportData.columns.indexOf('campaign_id');
          if (campaignIdIndex > -1) {
            reportData.columns.push('campaign_name');

            // Add campaign name to each row
            reportData.rows.forEach((row: any[]) => {
              const campaignId = row[campaignIdIndex];
              const campaignName = campaignMap.get(campaignId) || 'Unknown Campaign';
              row.push(campaignName);
            });
          }
        }
        return {
          content: [{ type: "text", text: `Report data (JSON) with campaign names for ID ${report_id}:\n\`\`\`json\n${JSON.stringify(reportData, null, 2)}\n\`\`\`` }],
        };
      } else {
        return {
          content: [{ type: "text", text: `Received unexpected data format for report ID ${report_id}.` }],
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred downloading report data with campaign names.";
      console.error("Error in download_liftoff_report_with_names tool:", errorMessage);
      return {
        content: [{ type: "text", text: `Error downloading report data with campaign names: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// --- Run the Server ---
async function main() {
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    console.error("Liftoff Reporting MCP Server running on stdio..."); // Updated message
  } catch (error) {
    console.error("Failed to start Liftoff Reporting MCP Server:", error); // Updated message
    process.exit(1);
  }
}

main();
