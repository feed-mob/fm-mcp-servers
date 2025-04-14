import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KayzenClient } from "./kayzen-client.js";

// Create an MCP server
const server = new McpServer({
  name: "Kayzen Analytics",
  version: "1.0.0"
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
          text: `Error getting report results: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Add analyze report results prompt
server.prompt(
  "analyze_report_results",
  {
    report_id: z.string().describe("ID of the report to analyze")
  },
  (params: { report_id: string }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please analyze the results of report ${params.report_id} and provide insights about:
        1. Performance metrics
        2. Key trends
        3. Areas for optimization
        4. Any unusual patterns or anomalies`
      }
    }]
  })
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
