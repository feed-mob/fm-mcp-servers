import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  getPartnerCampaignMappings, getMmpCampaignMappings, getMmpEventMappings,
  createPartnerCampaignMapping, updatePartnerCampaignMapping,
} from "../api.js";
import {
  partnerCampaignMappingsQuerySchema, mmpCampaignMappingsQuerySchema, mmpEventMappingsQuerySchema,
  createPartnerCampaignMappingSchema, updatePartnerCampaignMappingSchema,
} from "../schemas/mappings.js";

const paginationGuidance = "Filters are intersected. Returns one page with data and meta (current_page, per_page, total_count, total_pages), ordered by created_at DESC, id DESC. Defaults: page=1, per_page=25; the API caps page size at 100. Read meta.total_pages and request subsequent pages before treating results as complete. Nonempty results are saved as CSV under ./tmp in the MCP server's working directory; csv_file_path is returned. Each CSV contains only the current page, not a full export. Nested objects and arrays, including mapping, are stored as JSON strings in a single CSV cell without expanding their fields. Requires API authentication.";
const writePermissions = "Requires this tool's execution permission in AiToolPermission (mcp_name=feedmob-reporting); create and update permissions are separate. on_behalf_of_user_id additionally requires actor delegation permission on that row and a verified active, approved requester. Denied emails override permission lists for actor and requester. Bidease requires the effective user's QA/PM role. Do not retry a rejected request without attribution. No automatic retries.";

async function mappingResult(request: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await request(), null, 2) }] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to request mappings";
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerMappingsTools(server: McpServer): void {
  server.tool(
    "get_partner_campaign_mappings",
    "List partner campaign mappings via GET /ai/api/partner_campaign_mappings. Requires a partner channel; MMP channels are excluded. Returns related client/campaign/vendor/Click URL IDs, channel-specific mapping fields and timestamps. vendor_id filtering is unsupported for liftoff. Deleted/discarded records follow each channel's existing scope. " + paginationGuidance,
    partnerCampaignMappingsQuerySchema.shape,
    (params) => mappingResult(() => getPartnerCampaignMappings(params)),
  );
  server.tool(
    "get_mmp_campaign_mappings",
    "List MMP campaign mappings via GET /ai/api/mmp_campaign_mappings. Supports adjust, branch, impact, kochava and appsflyer (ClickUrlParamsMapping); Singular is unsupported. click_url_id filtering supports only impact, kochava and appsflyer. Returns related IDs, mapping fields and timestamps; unavailable IDs are null. Deleted/discarded mappings are excluded. " + paginationGuidance,
    mmpCampaignMappingsQuerySchema.shape,
    (params) => mappingResult(() => getMmpCampaignMappings(params)),
  );
  server.tool(
    "get_mmp_event_mappings",
    "List MMP event mappings via GET /ai/api/mmp_event_mappings. Supports adjust, impact, kochava and appsflyer; Branch and Singular are unsupported. app_id is an external string ID and is unsupported for impact. status (active or paused) supports only adjust and appsflyer. Deleted/discarded records are excluded; paused records remain unless filtered. Event values are parsed by the API; malformed historical strings are preserved. " + paginationGuidance,
    mmpEventMappingsQuerySchema.shape,
    (params) => mappingResult(() => getMmpEventMappings(params)),
  );
  server.tool(
    "create_partner_campaign_mapping",
    "Create a partner campaign mapping via POST /ai/api/partner_campaign_mappings using {channel, mapping, on_behalf_of_user_id?}. Supports bidease, freewheel and remerge only. All require click_url_id. Bidease also requires bidease_advertiser_id and bidease_campaign_id; Freewheel requires freewheel_campaign_id and freewheel_campaign_name; Remerge requires remerge_campaign_name. Freewheel permits line_item_id, line_item_name and memo (allocation 0-100 with at most two decimals, note up to 255 characters). Freewheel duplicate campaign/line-item pairs are allowed. Returns HTTP/business status 201 and the created mapping. " + writePermissions,
    createPartnerCampaignMappingSchema.shape,
    (params) => mappingResult(() => createPartnerCampaignMapping(params)),
  );
  server.tool(
    "update_partner_campaign_mapping",
    "Update a partner campaign mapping via PATCH /ai/api/partner_campaign_mappings/:id. Supports bidease, freewheel and remerge only. Supply channel, id and at least one channel-specific field inside mapping. Omitted fields are preserved; nulls, protected fields and other partners' fields are rejected. Freewheel memo replaces the entire object; {} clears it. Discarded Bidease/Freewheel mappings cannot be updated. Returns status 200 and the updated mapping, including no-op updates. " + writePermissions,
    updatePartnerCampaignMappingSchema.shape,
    (params) => mappingResult(() => updatePartnerCampaignMapping(params)),
  );
}
