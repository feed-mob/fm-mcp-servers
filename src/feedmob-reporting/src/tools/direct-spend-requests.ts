import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDirectSpendRequest, getDirectSpendRequestOptions } from "../api.js";
import { directSpendRequestSchema } from "../schemas/direct-spend-request.js";

export function registerDirectSpendRequestsTool(server: McpServer): void {
  server.tool(
    "get_direct_spend_request_options",
    "Get live parameter guidance for create_direct_spend_request via GET /ai/api/direct_spend_requests/options. No parameters required. Returns field types, required fields, defaults, option labels and submitted values, custom source instructions, and lookup APIs. Call this before creating a request; submit option values rather than labels. The API does not apply admin-page JavaScript autofill. Requires API authentication; write and delegation permissions are only needed when creating a request.",
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
    "Create a spend automation request via POST /ai/api/direct_spend_requests using admin-form fields. First call get_direct_spend_request_options for current field choices, defaults and lookup APIs; submit option values rather than labels. Admin-page JavaScript autofill is not applied. Requires client_id and direct spend write permission; status defaults to initialized. on_behalf_of_user_id records the requester in the audit comment and requires additional delegation permission; the API key owner remains the creator. The API sends the same creation notifications as the admin form. HTTP 201 warnings indicate notification failures after a successful save; do not retry creation because of warnings. Duplicate requests return HTTP 400.",
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
}
