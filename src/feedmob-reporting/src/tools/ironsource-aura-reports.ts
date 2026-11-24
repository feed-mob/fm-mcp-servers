import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getIronsourceAuraReports, getIronsourceAuraReportsGeo } from "../api.js";

export function registerIronsourceAuraReportsTools(server: McpServer): void {
  const matchingDescription = "Matches Aura Click URLs (vendor 288) by the trailing Click URL ID in campaign names, or by campaign name when no ID is present. Unmatched campaigns are retained with matched: false and null FeedMob metadata. Multiple matching Click URLs repeat campaign metrics; do not sum these across Click URLs. No client_id required. Nonempty results include a CSV file path.";
  const reports = [
    {
      name: "get_ironsource_aura_reports",
      label: "IronSource Aura reports",
      description: `Get IronSource Aura daily campaign reports over an inclusive date range, including impressions, clicks, completions, installs and partner_net_spend. One row per day, Aura campaign and matching Click URL. ${matchingDescription}`,
      fetch: getIronsourceAuraReports,
    },
    {
      name: "get_ironsource_aura_reports_geo",
      label: "IronSource Aura geo reports",
      description: `Get IronSource Aura daily campaign reports broken down by country over an inclusive date range, including country_code, impressions, clicks, completions, installs and partner_net_spend. ${matchingDescription}`,
      fetch: getIronsourceAuraReportsGeo,
    },
  ];

  for (const report of reports) {
    server.tool(
      report.name,
      report.description,
      {
        start_date: z.string().date().describe("Start date in YYYY-MM-DD format (inclusive)"),
        end_date: z.string().date().describe("End date in YYYY-MM-DD format (inclusive)"),
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
}
