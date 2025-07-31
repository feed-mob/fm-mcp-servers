#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KayzenClient } from "./kayzen-client.js";

// Create an MCP server
const server = new McpServer({
  name: "Kayzen Reporting",
  version: "0.0.6"
});

// Initialize Kayzen client
const kayzenClient = new KayzenClient();

interface ReportListResponse {
  reports: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface ReportResultsResponse {
  data: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

// Add list reports tool
server.tool(
  "list_reports",
  "Get a list of all the existing reports from Kayzen Reporting API",
  {},
  async () => {
    try {
      const result = await kayzenClient.listReports() as ReportListResponse;
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error listing reports: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Add get report results tool
server.tool(
  "get_report_results",
  "Get the results of a report from Kayzen Reporting API",
  {
    report_id: z.string().describe("ID of the report to fetch results for"),
    start_date: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().optional().describe("End date in YYYY-MM-DD format")
  },
  async (params: { report_id: string; start_date?: string; end_date?: string }) => {
    try {
      const result = await kayzenClient.getReportResults(
        params.report_id,
        params.start_date,
        params.end_date
      ) as ReportResultsResponse;

      const response = {
        ...result,
        time_range: {
          start_date: params.start_date,
          end_date: params.end_date
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error getting report results: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
