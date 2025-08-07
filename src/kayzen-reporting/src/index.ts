#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KayzenClient } from "./kayzen-client.js";

// Create an MCP server
const server = new McpServer({
  name: "Kayzen Reporting",
  version: "0.0.8"
});

// Initialize Kayzen client
const kayzenClient = new KayzenClient();

interface ReportListResponse {
  data: Array<{
    id: number;
    advertiser_id: number;
    report_type_id: string;
    name: string;
    start_date: string;
    end_date: string;
    date_macro: string;
    time_zone_id: number;
    created_at: string;
    report_schedule_frequency: string | null;
    report_schedule_end_date: string | null;
    report_schedule_recipients: string | null;
    report_schedule_status: string | null;
    report_schedule_flag_reason: string | null;
    report_schedule_last_sent: string | null;
    time_zone_name: string;
  }>;
  meta: {
    current_page: number;
    total_pages: number;
    total_entries: number;
  };
}

interface ReportResultsResponse {
  data: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

// Add list reports tool
server.tool(
  "list_reports",
  "Get a list of all the existing reports from Kayzen Reporting API with filtering, pagination, and sorting options",
  {
    advertiser_id: z.number().optional().describe("Filter reports by advertiser ID"),
    q: z.string().optional().describe("Search reports by name or ID"),
    page: z.number().min(1).default(1).describe("Page number (default: 1)"),
    per_page: z.number().min(1).max(100).default(30).describe("Number of rows per page (default: 30, max: 100)"),
    sort_field: z.enum([
      "id",
      "advertiser_id",
      "name",
      "report_type",
      "time_range",
      "report_schedule_frequency",
      "report_schedule_status",
      "report_schedule_last_sent"
    ]).optional().describe("Sort reports by this field"),
    sort_direction: z.enum(["asc", "desc"]).optional().describe("Sort direction (asc or desc)")
  },
  async (params: {
    advertiser_id?: number;
    q?: string;
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
  }) => {
    try {
      const result = await kayzenClient.listReports(params) as ReportListResponse;

      const summary = {
        pagination: {
          current_page: result.meta.current_page,
          total_pages: result.meta.total_pages,
          total_entries: result.meta.total_entries,
          per_page: params.per_page || 30
        },
        filters_applied: {
          advertiser_id: params.advertiser_id,
          search_query: params.q,
          sort_field: params.sort_field,
          sort_direction: params.sort_direction
        }
      };

      return {
        content: [
          {
            type: "text",
            text: `## Reports Summary
${summary.pagination.total_entries} total reports found
Page ${summary.pagination.current_page} of ${summary.pagination.total_pages}

### Applied Filters
${JSON.stringify(summary.filters_applied, null, 2)}

### Reports Data
${JSON.stringify(result.data, null, 2)}`
          }
        ]
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
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format")
  },
  async (params: { report_id: string; start_date: string; end_date: string }) => {
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
