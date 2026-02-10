#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import axios from "axios";
import { z } from "zod";
import type { AxiosError } from "axios";

// Load environment variables
dotenv.config();

const apiKey = process.env.SINGULAR_API_KEY;
const apiBaseUrl = process.env.SINGULAR_API_BASE_URL;

if (!apiKey || !apiBaseUrl) {
  throw new Error("Missing required environment variables: SINGULAR_API_KEY and SINGULAR_API_BASE_URL");
}

// Create MCP server
const server = new McpServer({
  name: "Singular MCP Server",
  version: "0.0.4",
});

// Define the params directly as a ZodRawShape
const createReportParams = {
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format"),
  source: z.string().optional().describe("Optional. Filter results by specific source"),
  time_breakdown: z.string().optional().describe("Optional. Time breakdown: 'day' for daily data, 'all' for aggregated data (default: 'all')")
} as const;

server.tool(
  "create_report",
  "Getting reporting data from Singular via generates an asynchronous report query",
  createReportParams,  // Use the params directly
  async (params) => {
    try {
      const requestBody = {
        ...params,
        dimensions: "unified_campaign_name",
        metrics: "custom_impressions,custom_clicks,custom_installs,adn_cost",
        time_breakdown: params.time_breakdown || "all",
        format: "csv"
      };

      // Only add source filter if it's provided
      if (params.source) {
        requestBody.source = params.source;
      }

      const response = await axios.post(
        `${apiBaseUrl}/create_async_report`,
        requestBody,
        {
          params: { api_key: apiKey }
        }
      );
      return {
        content: [{
          type: "text",
          text: JSON.stringify(response.data, null, 2)
        }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? `Singular API error: ${(error as AxiosError<SingularErrorResponse>).response?.data?.message || error.message}`
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

const getReportStatusParams = {
  report_id: z.string(),
};

const getReportStatusSchema = z.object(getReportStatusParams);
type GetReportStatusParams = z.infer<typeof getReportStatusSchema>;

interface SingularErrorResponse {
  message: string;
}

server.tool(
  "get_singular_report",
  "Get the complete report from Singular. Checks status and automatically downloads the CSV report data when ready.",
  getReportStatusParams,
  async (params: GetReportStatusParams) => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}/get_report_status`,
        {
          params: {
            api_key: apiKey,
            report_id: params.report_id
          }
        }
      );

      const reportData = response.data;

      // If status is DONE and download_url is available, automatically download the report
      if (reportData.value && reportData.value.status === 'DONE' && reportData.value.download_url) {
        try {
          const downloadResponse = await axios.get(reportData.value.download_url, {
            responseType: 'text'
          });

          // Return data in the specified format
          const formattedResponse = {
            status: 0,
            substatus: 0,
            value: {
              csv_report: downloadResponse.data
            }
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formattedResponse)
            }]
          };
        } catch (downloadError) {
          const downloadErrorMessage = downloadError instanceof Error
            ? `Download error: ${(downloadError as AxiosError<SingularErrorResponse>).response?.data?.message || downloadError.message}`
            : 'Unknown download error occurred';
          return {
            content: [{
              type: "text",
              text: `Report is ready but download failed: ${downloadErrorMessage}\n\nStatus response: ${JSON.stringify(reportData, null, 2)}`
            }],
            isError: true
          };
        }
      } else {
        // Return status information if not done yet
        return {
          content: [{
            type: "text",
            text: JSON.stringify(reportData, null, 2)
          }]
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? `Singular API error: ${(error as AxiosError<SingularErrorResponse>).response?.data?.message || error.message}`
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
Available tools:

1. create_report
   Creates an asynchronous report in Singular with predefined settings.
   Parameters:
   - start_date: string (required) - Start date (YYYY-MM-DD)
   - end_date: string (required) - End date (YYYY-MM-DD)
   - source: string (optional) - Filter results by specific source
   - time_breakdown: string (optional) - Time breakdown: 'day' for daily data, 'all' for aggregated data (default: 'all')

   Fixed settings:
   - dimensions: unified_campaign_name
   - metrics: custom_impressions,custom_clicks,custom_installs,adn_cost
   - format: csv

2. get_singular_report
   Gets the complete report from Singular. Checks status and automatically downloads the CSV report data when ready.
   Parameters:
   - report_id: string (required) - The ID of the report to check

   Returns:
   - If report is still processing: Status information in JSON format
   - If report is complete: Full CSV report data wrapped in JSON format with csv_report field

   Note: This tool handles the complete workflow - you don't need to manually check status or download separately.
        `
      }
    }]
  })
);

// Set up STDIO transport
const transport = new StdioServerTransport();

// Connect server to transport
await server.connect(transport);
