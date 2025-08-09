#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KayzenClient } from "./kayzen-client.js";

// Create an MCP server
const server = new McpServer({
  name: "Kayzen Reporting",
  version: "0.1.0"
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

// Helper function to parse and normalize dates with smart defaults
function parseDateWithDefaults(dateString: string): string {
  const currentYear = new Date().getFullYear();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // MM-DD format (add current year)
  if (/^\d{1,2}-\d{1,2}$/.test(dateString)) {
    const [month, day] = dateString.split('-');
    return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD format (add current year)
  if (/^\d{1,2}\/\d{1,2}$/.test(dateString)) {
    const [month, day] = dateString.split('/');
    return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Month name patterns (January, Jan, 1月)
  const monthNames = {
    'january': '01', 'jan': '01', '1月': '01', '一月': '01',
    'february': '02', 'feb': '02', '2月': '02', '二月': '02',
    'march': '03', 'mar': '03', '3月': '03', '三月': '03',
    'april': '04', 'apr': '04', '4月': '04', '四月': '04',
    'may': '05', '5月': '05', '五月': '05',
    'june': '06', 'jun': '06', '6月': '06', '六月': '06',
    'july': '07', 'jul': '07', '7月': '07', '七月': '07',
    'august': '08', 'aug': '08', '8月': '08', '八月': '08',
    'september': '09', 'sep': '09', '9月': '09', '九月': '09',
    'october': '10', 'oct': '10', '10月': '10', '十月': '10',
    'november': '11', 'nov': '11', '11月': '11', '十一月': '11',
    'december': '12', 'dec': '12', '12月': '12', '十二月': '12'
  };

  const lowerDate = dateString.toLowerCase();
  for (const [name, monthNum] of Object.entries(monthNames)) {
    if (lowerDate.includes(name)) {
      return `${currentYear}-${monthNum}-01`;
    }
  }

  // Single number (assume month, use first day)
  if (/^\d{1,2}$/.test(dateString)) {
    const month = parseInt(dateString);
    if (month >= 1 && month <= 12) {
      return `${currentYear}-${month.toString().padStart(2, '0')}-01`;
    }
  }

  // Return original if no pattern matched
  return dateString;
}

// Helper function to get month end date
function getMonthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
}

// Helper function to parse date ranges with smart defaults
function parseDateRange(startDate: string, endDate: string): { start: string; end: string } {
  const currentYear = new Date().getFullYear();
  let parsedStart = parseDateWithDefaults(startDate);
  let parsedEnd = parseDateWithDefaults(endDate);

  // If start date is just a month (ends with -01), set end date to month end
  if (parsedStart.endsWith('-01') && parsedEnd === parsedStart) {
    const [year, month] = parsedStart.split('-').map(Number);
    parsedEnd = getMonthEnd(year, month);
  }

  return { start: parsedStart, end: parsedEnd };
}

// Helper function to get report details by ID
async function getReportDetails(reportId: string): Promise<{
  id: number;
  start_date: string;
  end_date: string;
  name: string;
} | null> {
  try {
    const result = await kayzenClient.listReports({ q: reportId }) as ReportListResponse;
    const report = result.data.find(r => r.id.toString() === reportId);
    return report ? {
      id: report.id,
      start_date: report.start_date,
      end_date: report.end_date,
      name: report.name
    } : null;
  } catch (error) {
    console.error('Error getting report details:', error);
    return null;
  }
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
${JSON.stringify(result.data, null, 2)}

---
**Note for LLM**: When the user asks for report results for specific date ranges, remember to use those dates as start_date and end_date parameters in get_report_results calls. Each report above shows its original date range (start_date/end_date), but you can override these with user-specified dates if needed.

**Date Format Guidelines for LLM**:
- If user only mentions month/date without year, assume current year (${new Date().getFullYear()})
- Supported formats: "January", "Jan", "1月", "1", "01-15", "1/15", "2024-01-15"
- Examples: "January" → "${new Date().getFullYear()}-01-01 to ${new Date().getFullYear()}-01-31", "3" → "${new Date().getFullYear()}-03-01 to ${new Date().getFullYear()}-03-31"
- Use the smart date parsing by passing flexible date strings to get_report_results`
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
  "Get the results of a report from Kayzen Reporting API. Supports flexible date formats with smart defaults. If start_date and end_date are not provided, uses the report's original date range.",
  {
    report_id: z.string().describe("ID of the report to fetch results for"),
    start_date: z.string().optional().describe("Start date - supports flexible formats: YYYY-MM-DD, MM-DD, MM/DD, month names (January, Jan, 1月), or month numbers (1-12). Defaults to current year if year not specified."),
    end_date: z.string().optional().describe("End date - supports same flexible formats as start_date. If same as start_date for month-only queries, automatically sets to month end.")
  },
  async (params: { report_id: string; start_date?: string; end_date?: string }) => {
    try {
      let actualStartDate = params.start_date;
      let actualEndDate = params.end_date;
      let dateSource = 'user_specified';

      // If dates provided, parse them with smart defaults
      if (actualStartDate && actualEndDate) {
        const parsed = parseDateRange(actualStartDate, actualEndDate);
        actualStartDate = parsed.start;
        actualEndDate = parsed.end;
      } else if (actualStartDate && !actualEndDate) {
        // If only start date provided, try to infer end date
        const parsedStart = parseDateWithDefaults(actualStartDate);
        if (parsedStart.endsWith('-01')) {
          // Month-only query, set end to month end
          const [year, month] = parsedStart.split('-').map(Number);
          actualStartDate = parsedStart;
          actualEndDate = getMonthEnd(year, month);
        } else {
          actualEndDate = parsedStart; // Same day
          actualStartDate = parsedStart;
        }
      } else if (!actualStartDate && actualEndDate) {
        actualStartDate = parseDateWithDefaults(actualEndDate);
        actualEndDate = parseDateWithDefaults(actualEndDate);
      }

      // If no dates provided, get from report details
      if (!actualStartDate || !actualEndDate) {
        const reportDetails = await getReportDetails(params.report_id);
        if (!reportDetails) {
          throw new Error(`Report with ID ${params.report_id} not found`);
        }

        actualStartDate = actualStartDate || reportDetails.start_date;
        actualEndDate = actualEndDate || reportDetails.end_date;
        dateSource = 'report_original';
      }

      const result = await kayzenClient.getReportResults(
        params.report_id,
        actualStartDate,
        actualEndDate
      ) as ReportResultsResponse;

      const response = {
        ...result,
        time_range: {
          start_date: actualStartDate,
          end_date: actualEndDate,
          source: dateSource
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
