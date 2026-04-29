import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "feedmob-client-reports",
  version: "0.0.1",
  instructions: `This is an MCP server for querying FeedMob client reports data, including report status, logs, and requests.`,
});

const CLIENT_REPORTS_API_URL = process.env.CLIENT_REPORTS_API_URL;
const REPORT_REQUESTS_API_URL = process.env.REPORT_REQUESTS_API_URL;
const API_TOKEN = process.env.API_TOKEN;

if (!CLIENT_REPORTS_API_URL || !REPORT_REQUESTS_API_URL || !API_TOKEN) {
  console.error(
    "Error: CLIENT_REPORTS_API_URL, REPORT_REQUESTS_API_URL, and API_TOKEN environment variables must be set."
  );
  process.exit(1);
}

server.addTool({
  name: "list_reports",
  description:
    "Query all reports' automatic upload status (first/last upload time). Returns report name, auto-upload settings, upload type, report type, and upload time range.",
  parameters: z.object({}),
  execute: async (_args, { log }) => {
    try {
      log.info("Fetching report status...");

      const response = await fetch(
        `${CLIENT_REPORTS_API_URL}/api/mcp/daily_report_status`,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      const reports = data as Array<{
        name: string;
        auto_upload: boolean;
        upload_type: string;
        report_type: string;
        first_upload_time: string | null;
        last_upload_time: string | null;
      }>;

      const header =
        "| Name | Auto Upload | Upload Type | Report Type | First Upload | Last Upload |\n";
      const separator =
        "|------|-------------|-------------|-------------|--------------|-------------|\n";
      const rows = reports
        .map(
          (r) =>
            `| ${r.name} | ${r.auto_upload ? "Yes" : "No"} | ${r.upload_type} | ${r.report_type} | ${r.first_upload_time || "N/A"} | ${r.last_upload_time || "N/A"} |`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `## Report Upload Status\n\nTotal: ${reports.length} reports\n\n${header}${separator}${rows}`,
          },
        ],
      };
    } catch (error) {
      log.error(`Failed to fetch report status: ${error}`);
      throw new Error(
        `Failed to fetch report status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

server.addTool({
  name: "report_logs",
  description:
    "Query report execution logs with multi-dimensional filtering and pagination. Returns detailed log entries including status, upload info, and report metadata.",
  parameters: z.object({
    client_id: z
      .number()
      .optional()
      .describe("Filter by client ID"),
    report_category: z
      .union([z.number(), z.array(z.number())])
      .optional()
      .describe("Filter by report category (single or array)"),
    scope: z
      .enum(["internal", "external"])
      .optional()
      .describe("Filter by scope"),
    client: z
      .string()
      .optional()
      .describe("Filter by client name (fuzzy search)"),
    report_config_id: z
      .number()
      .optional()
      .describe("Filter by report config ID"),
    status: z
      .enum(["in_progress", "finished", "failed"])
      .optional()
      .describe("Filter by status"),
    allow_empty_upload_time: z
      .string()
      .optional()
      .describe(
        "Filter by upload time range (format: 'YYYY-MM-DD - YYYY-MM-DD')"
      ),
    allow_empty_report_time: z
      .string()
      .optional()
      .describe("Filter by report time (format: 'YYYY-MM-DD')"),
    pa_user: z.string().optional().describe("Filter by PA user"),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number (default: 1)"),
  }),
  execute: async (args, { log }) => {
    try {
      log.info("Fetching report logs...");

      const params = new URLSearchParams();
      if (args.client_id) params.set("client_id", String(args.client_id));
      if (args.report_category !== undefined) {
        if (Array.isArray(args.report_category)) {
          args.report_category.forEach((cat) =>
            params.append("report_category[]", String(cat))
          );
        } else {
          params.set("report_category", String(args.report_category));
        }
      }
      if (args.scope) params.set("scope", args.scope);
      if (args.client) params.set("client", args.client);
      if (args.report_config_id)
        params.set("report_config_id", String(args.report_config_id));
      if (args.status) params.set("status", args.status);
      if (args.allow_empty_upload_time)
        params.set("allow_empty_upload_time", args.allow_empty_upload_time);
      if (args.allow_empty_report_time)
        params.set("allow_empty_report_time", args.allow_empty_report_time);
      if (args.pa_user) params.set("pa_user", args.pa_user);
      params.set("page", String(args.page));

      const response = await fetch(
        `${CLIENT_REPORTS_API_URL}/api/mcp/daily_report_logs?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();
      const { data, meta } = result as {
        data: Array<{
          id: number;
          user: string;
          client_name: string;
          status: string;
          date_range: string;
          upload_at: string | null;
          upload_path: string | null;
          upload_file: string | null;
          memo: string | null;
          destination: string[];
          email_subject: string | null;
          total_spend: number | null;
          report_config: {
            id: number;
            frontend_report_name: string;
            report_name: string;
          } | null;
        }>;
        meta: {
          current_page: number;
          total_pages: number;
          total_count: number;
        };
      };

      const header =
        "| ID | Client | Status | Date Range | Upload Time | Destination | Spend |\n";
      const separator =
        "|----|--------|--------|------------|-------------|-------------|-------|\n";
      const rows = data
        .map(
          (log) =>
            `| ${log.id} | ${log.client_name} | ${log.status} | ${log.date_range} | ${log.upload_at || "N/A"} | ${log.destination.join(", ")} | ${log.total_spend ?? "N/A"} |`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `## Report Logs\n\nPage ${meta.current_page} of ${meta.total_pages} (Total: ${meta.total_count} records)\n\n${header}${separator}${rows}`,
          },
        ],
      };
    } catch (error) {
      log.error(`Failed to fetch report logs: ${error}`);
      throw new Error(
        `Failed to fetch report logs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

server.addTool({
  name: "report_requests",
  description:
    "Query report requests list with filtering and pagination. Returns report request details including configuration, clients, vendors, and status.",
  parameters: z.object({
    status: z
      .enum([
        "initialized",
        "in_progress",
        "auto_upload",
        "paused",
        "archived",
      ])
      .optional()
      .describe("Filter by status"),
    report_type: z
      .enum(["client_report", "vendor_report", "internel_report"])
      .optional()
      .describe("Filter by report type"),
    scope: z
      .enum(["internal", "external"])
      .optional()
      .describe("Filter by scope"),
    client_id: z.number().optional().describe("Filter by client ID"),
    vendor_id: z.number().optional().describe("Filter by vendor ID"),
    report_categories: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe("Filter by report categories"),
    report_name: z
      .string()
      .optional()
      .describe("Filter by report name (fuzzy search)"),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number (default: 1)"),
  }),
  execute: async (args, { log }) => {
    try {
      log.info("Fetching report requests...");

      const params = new URLSearchParams();
      if (args.status) params.set("status", args.status);
      if (args.report_type) params.set("report_type", args.report_type);
      if (args.scope) params.set("scope", args.scope);
      if (args.client_id) params.set("client_id", String(args.client_id));
      if (args.vendor_id) params.set("vendor_id", String(args.vendor_id));
      if (args.report_categories !== undefined) {
        if (Array.isArray(args.report_categories)) {
          args.report_categories.forEach((cat) =>
            params.append("report_categories[]", cat)
          );
        } else {
          params.set("report_categories", args.report_categories);
        }
      }
      if (args.report_name) params.set("report_name", args.report_name);
      params.set("page", String(args.page));

      const response = await fetch(
        `${REPORT_REQUESTS_API_URL}/api/mcp/report_requests?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();
      const { data, meta } = result as {
        data: Array<{
          id: number;
          report_code: string;
          report_name: string;
          clients: string;
          vendors: string;
          report_categories: string[];
          delivery_methods: string[];
          scope: string;
          data_source: string;
          automation_start_date: string | null;
          created_at: string;
          status: string;
        }>;
        meta: {
          current_page: number;
          total_pages: number;
          total_count: number;
        };
      };

      const header =
        "| ID | Report Name | Clients | Status | Scope | Categories | Delivery |\n";
      const separator =
        "|----|-------------|---------|--------|-------|------------|----------|\n";
      const rows = data
        .map(
          (req) =>
            `| ${req.id} | ${req.report_name} | ${req.clients} | ${req.status} | ${req.scope} | ${req.report_categories.join(", ")} | ${req.delivery_methods.join(", ")} |`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `## Report Requests\n\nPage ${meta.current_page} of ${meta.total_pages} (Total: ${meta.total_count} records)\n\n${header}${separator}${rows}`,
          },
        ],
      };
    } catch (error) {
      log.error(`Failed to fetch report requests: ${error}`);
      throw new Error(
        `Failed to fetch report requests: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

server.start({ transportType: "stdio" });
