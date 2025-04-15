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
  version: "0.0.1",
});

// Define the params directly as a ZodRawShape
const createReportParams = {
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format"),
  source: z.string().optional().describe("Optional. Filter results by specific source")
} as const;

server.tool(
  "create_report",
  "Getting reporting data from Singular via generates an asynchronous report query",
  createReportParams,  // Use the params directly
  async (params) => {
    try {
      const requestBody = {
        ...params,
        dimensions: "app,source,unified_campaign_name",
        metrics: "custom_impressions,custom_clicks,custom_installs,adn_cost",
        time_breakdown: "day",
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
        }]
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

// Add new parameter schema for download report
const downloadReportParams = {
  download_url: z.string(),
};

const getReportStatusSchema = z.object(getReportStatusParams);
const downloadReportSchema = z.object(downloadReportParams);

type GetReportStatusParams = z.infer<typeof getReportStatusSchema>;
type DownloadReportParams = z.infer<typeof downloadReportSchema>;

interface SingularErrorResponse {
  message: string;
}

server.tool(
  "get_report_status",
  "Get the status of an asynchronous report from Singular until status is 'DONE'",
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
      return {
        content: [{
          type: "text",
          text: JSON.stringify(response.data, null, 2)
        }]
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

// Add new tool for downloading report
server.tool(
  "download_report",
  "Download the CSV report from the provided S3 URL",
  downloadReportParams,
  async (params: DownloadReportParams) => {
    try {
      const response = await axios.get(params.download_url, {
        responseType: 'text'
      });

      return {
        content: [{
          type: "text",
          text: response.data
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? `Download error: ${(error as AxiosError<SingularErrorResponse>).response?.data?.message || error.message}`
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

   Fixed settings:
   - dimensions: app,source,unified_campaign_name
   - metrics: custom_impressions,custom_clicks,custom_installs,adn_cost
   - time_breakdown: day
   - format: csv

2. get_report_status
   Gets the status of an asynchronous report until staus is 'DONE'.
   Parameters:
   - report_id: string (required) - The ID of the report to check

3. download_report
   Downloads the CSV report from the provided S3 URL.
   Parameters:
   - download_url: string (required) - The S3 URL to download the report
        `
      }
    }]
  })
);

// Set up STDIO transport
const transport = new StdioServerTransport();

// Connect server to transport
await server.connect(transport);
