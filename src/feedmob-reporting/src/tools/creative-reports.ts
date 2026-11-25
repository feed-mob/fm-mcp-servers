import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBeeswaxCreative, getBeeswaxReportsCreative, getBideaseReportsCreative } from "../api.js";

export function registerCreativeReportsTools(server: McpServer): void {
  const reports = [
    {
      name: "get_beeswax_reports_creative",
      label: "Beeswax creative reports",
      description: "Get Beeswax daily creative spend over an inclusive date range, with campaign, line item and creative IDs and mapped FeedMob metadata. partner_net_spend is media spend plus vendor fees, excluding bid shading fees, matching the worker creative spend calculation. apac_fee is separate; count it once per click URL and date across all rows. No client_id required. Nonempty results include a CSV file path.",
      fetch: getBeeswaxReportsCreative,
    },
    {
      name: "get_bidease_reports_creative",
      label: "Bidease creative reports",
      description: "Get Bidease daily creative spend over an inclusive date range, grouped by day, advertiser, campaign and creative. Includes bidease_creative_id, impressions, clicks, conversions, partner_net_spend and mapped FeedMob metadata. Unmatched rows are retained with matched=false and null FeedMob metadata. No client_id required. Nonempty results include a CSV file path.",
      fetch: getBideaseReportsCreative,
    },
  ];

  for (const report of reports) {
    server.tool(
      report.name,
      report.description,
      {
        start_date: z.string().date().describe("First date, inclusive, in YYYY-MM-DD format"),
        end_date: z.string().date().describe("Last date, inclusive, in YYYY-MM-DD format"),
      },
      async ({ start_date, end_date }) => {
        try {
          if (start_date > end_date) {
            throw new Error("start_date cannot be after end_date");
          }
          const data = await report.fetch(start_date, end_date);
          let text = `${report.label} data:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
          if (data.csv_file_path) {
            text += `\n\nCSV file saved to: ${data.csv_file_path}`;
          }
          return { content: [{ type: "text", text }] };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : `Failed to fetch ${report.label}`;
          return {
            content: [{ type: "text", text: `Error fetching ${report.label}: ${message}` }],
            isError: true,
          };
        }
      }
    );
  }

  server.tool(
    "get_beeswax_creative",
    "Get the Beeswax REST creative details for one positive creative ID, returning the original JSON response inside data.",
    {
      creative_id: z.string().regex(/^[0-9]+$/).refine((value) => /[1-9]/.test(value), "creative_id must be a positive integer").describe("Positive Beeswax creative ID as a string"),
    },
    async ({ creative_id }) => {
      try {
        const data = await getBeeswaxCreative(creative_id);
        return {
          content: [{ type: "text", text: `Beeswax creative data:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`` }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch Beeswax creative";
        return {
          content: [{ type: "text", text: `Error fetching Beeswax creative: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
