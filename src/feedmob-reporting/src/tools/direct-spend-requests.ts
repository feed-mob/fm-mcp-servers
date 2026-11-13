import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDirectSpendRequest, getDirectSpendRequestOptions, updateDirectSpendRequest } from "../api.js";
import { directSpendRequestSchema, updateDirectSpendRequestSchema } from "../schemas/direct-spend-request.js";

export function registerDirectSpendRequestsTool(server: McpServer): void {
  server.tool(
    "get_direct_spend_request_options",
    "Get live parameter guidance for create_direct_spend_request and update_direct_spend_request via GET /ai/api/direct_spend_requests/options. No parameters required. Returns field types, required fields, defaults, option labels and submitted values, custom source instructions, and lookup APIs. Call this before creating or updating a request; submit option values rather than labels. The API does not apply admin-page JavaScript autofill. Requires API authentication; write and delegation permissions are only needed when creating or updating a request.",
    async () => {
      try {
        const result = await getDirectSpendRequestOptions();
        return {
          content: [{ type: "text", text: `Direct spend request parameter options:\n${JSON.stringify(result, null, 2)}` }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch direct spend request options";
        return {
          content: [{ type: "text", text: `Error fetching direct spend request options: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "create_direct_spend_request",
    "Create a spend automation request via POST /ai/api/direct_spend_requests using admin-form fields. First call get_direct_spend_request_options for current field choices, defaults and lookup APIs; submit option values rather than labels. Keep formula fields to short admin-style phrases or expressions, source fields to short names, and notes to necessary extra context. Omit long explanations, repeated IDs and current rate snapshots. Admin-page JavaScript autofill is not applied. Requires client_id and nonblank margin_source, margin_type, gross_spend_source, margin_formula, gross_spend_formula, net_spend_formula and net_spend_source, plus direct spend write permission; status defaults to initialized. on_behalf_of_user_id requires actor delegation permission and attributes business permissions, creator and audits to the verified requester; omit to use the API key user. The API sends the same creation notifications as the admin form. HTTP 201 warnings indicate notification failures after a successful save; do not retry creation because of warnings. Duplicate requests return HTTP 400.",
    directSpendRequestSchema.shape,
    async (params) => {
      try {
        const result = await createDirectSpendRequest(params);
        return {
          content: [{ type: "text", text: `Direct spend request created successfully:\n${JSON.stringify(result, null, 2)}` }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to create direct spend request";
        return {
          content: [{ type: "text", text: `Error creating direct spend request: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "update_direct_spend_request",
    "Update a spend automation request via PATCH /ai/api/direct_spend_requests/:id. First call get_direct_spend_request_options for field values. Supply id and at least one admin-form field at the top level. Only supplied fields change; omitted fields and status are preserved, arrays replace existing values and [] clears them. The final record must have nonblank margin_source, margin_type, gross_spend_source, net_spend_source, gross_spend_formula, net_spend_formula and margin_formula; complete missing legacy fields in the same update. Keep formulas and sources brief. Existing status restrictions and duplicate Click URL checks apply. Requires direct spend write permission; optional on_behalf_of_user_id requires actor delegation permission and attributes business permissions and update audits to the verified requester. The original creator is preserved.",
    updateDirectSpendRequestSchema.shape,
    async (params) => {
      try {
        const result = await updateDirectSpendRequest(params);
        return {
          content: [{ type: "text", text: `Direct spend request updated successfully:\n${JSON.stringify(result, null, 2)}` }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update direct spend request";
        return {
          content: [{ type: "text", text: `Error updating direct spend request: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
