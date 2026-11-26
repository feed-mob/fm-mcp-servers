import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClientReportRequest, getClientReportRequestOptions, getClientReportRequests, updateClientReportRequest } from "../api.js";
import { clientReportRequestSchema, clientReportRequestsQuerySchema, updateClientReportRequestSchema } from "../schemas/client-report-request.js";

async function toolResult(label: string, operation: () => Promise<unknown>) {
  try {
    const result = await operation();
    return { content: [{ type: "text" as const, text: `${label}:\n${JSON.stringify(result, null, 2)}` }] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { content: [{ type: "text" as const, text: `${label} failed: ${message}` }], isError: true };
  }
}

export function registerClientReportRequestsTools(server: McpServer): void {
  server.tool(
    "get_client_report_requests",
    "Query non-deleted client report requests via GET /ai/api/client_report_requests, newest first. All filters are optional and intersect. creator_user_id is the original owner, including delegated creation. Client/vendor filters also match all selections. Date bounds are inclusive; start_date/end_date filter creation dates in the application time zone, automation_start_date/automation_end_date bound the automation start date. Returns all matching records. Requires API authentication.",
    clientReportRequestsQuerySchema.shape,
    (params) => toolResult("Client report requests", () => getClientReportRequests(params))
  );
  server.tool(
    "get_client_report_request_options",
    "Get live field types, defaults, option labels/values and lookup APIs via GET /ai/api/client_report_requests/options. Call before creating or updating a client report request; submit option values rather than labels. Includes active/paused Report Jobs and verified requester lookup. No parameters required. Requires API authentication; write and delegation permissions are only needed for writes.",
    () => toolResult("Client report request parameter options", getClientReportRequestOptions)
  );
  server.tool(
    "create_client_report_request",
    "Create a client report request via POST /ai/api/client_report_requests. First call get_client_report_request_options for current choices and lookup APIs; submit option values rather than labels. Requires nonblank report_name and feedmob-reporting/create_client_report_request permission. Omitted fields keep model defaults; report_number and report_code are generated when absent. client_ids/vendor_ids use [0] for all, [] for none; do not mix 0 and specific IDs. Assignees are email strings. Optional top-level on_behalf_of_user_id requires this action's delegation permission and sets the creator and audit user to the verified requester; otherwise the API key owner is used.",
    clientReportRequestSchema.shape,
    (params) => toolResult("Client report request creation", () => createClientReportRequest(params))
  );
  server.tool(
    "update_client_report_request",
    "Update a client report request via PATCH /ai/api/client_report_requests/:id. First call get_client_report_request_options. Supply id and at least one writable field at the top level. Omitted fields are preserved; arrays replace selections and [] clears them. null clears nullable references, type, scope and automation date. The final report_name must be nonblank. Original creator and report_number are preserved. Requires feedmob-reporting/update_client_report_request permission, independently of creation permission. Optional on_behalf_of_user_id requires this action's delegation permission and attributes audits to the verified requester. No record is created if missing.",
    updateClientReportRequestSchema.shape,
    (params) => toolResult("Client report request update", () => updateClientReportRequest(params))
  );
}
