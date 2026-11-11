import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBideaseReports } from "../api.js";

export function registerBideaseReportsTool(server: McpServer): void {
  server.tool(
    "get_bidease_reports",
    "Get daily Bidease reports by date range, including impressions, clicks, conversions, partner_net_spend and mapped FeedMob click URL, campaign and vendor metadata. Includes unmatched rows with matched=false and null FeedMob metadata. No client_id required.",
    {
      start_date: z.string().date().describe("Start date in YYYY-MM-DD format (inclusive)"),
      end_date: z.string().date().describe("End date in YYYY-MM-DD format (inclusive)"),
    },
    async ({ start_date, end_date }) => {
      try {
        if (start_date > end_date) {
          throw new Error("start_date cannot be after end_date");
        }
        const data = await getBideaseReports(start_date, end_date);
        let text = `Bidease reports data:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
        if (data.csv_file_path) {
          text += `\n\nCSV file saved to: ${data.csv_file_path}`;
        }
        return { content: [{ type: "text", text }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch Bidease reports";
        return {
          content: [{ type: "text", text: `Error fetching Bidease reports: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
