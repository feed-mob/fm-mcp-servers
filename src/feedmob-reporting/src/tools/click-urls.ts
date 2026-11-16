import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClickUrls } from "../api.js";
import { clickUrlsQuerySchema } from "../schemas/click-urls.js";

export function registerClickUrlsTool(server: McpServer): void {
  server.tool(
    "get_click_urls",
    "List Click URLs via GET /ai/api/click_urls. All filters are optional and intersected. campaign_id, vendor_id and click_url_id accept a single ID or nonempty array. Returns one page in descending ID order, with associated names, pricing, paid actions, tracking details, status and meta (current_page, per_page, total_count, total_pages). Defaults: page=1, per_page=100, maximum 100 per page. Deleted records are excluded by the model default scope. Read meta.total_pages and request subsequent pages before treating results as complete. Use this lookup to choose click_url_ids for create_direct_spend_request. Requires API authentication.",
    clickUrlsQuerySchema.shape,
    async (params) => {
      try {
        const result = await getClickUrls(params);
        return {
          content: [{ type: "text", text: `Click URLs:\n${JSON.stringify(result, null, 2)}` }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch Click URLs";
        return {
          content: [{ type: "text", text: `Error fetching Click URLs: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
