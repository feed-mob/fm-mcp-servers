import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateClickUrlPrices } from "../api.js";

function priceValueSchema(nonnegative: boolean) {
  const number = nonnegative ? z.number().finite().nonnegative() : z.number().finite();
  const numericString = z.string().trim()
    .regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/)
    .refine((value) => Number.isFinite(Number(value)), "Value must be finite")
    .refine((value) => !nonnegative || Number(value) >= 0, "Rate must be nonnegative");
  return z.union([number, numericString, z.literal("N/A")]);
}

const priceSchema = z.object({
  spend_date: z.string().date().describe("YYYY-MM-DD before today and on or after Click URL creation (validated by the API)"),
  net_cpi: priceValueSchema(true).describe('Finite net rate >= 0, numeric string, or "N/A" for a dynamic rate'),
  gross_cpi: priceValueSchema(true).describe('Finite gross rate >= 0, numeric string, or "N/A" for a dynamic rate'),
  margin: priceValueSchema(false).describe('Finite margin percentage, numeric string, or "N/A" for dynamic margin; arbitrage level 2 requires "N/A"'),
});

export function registerClickUrlPricesTool(server: McpServer): void {
  server.tool(
    "update_click_url_prices",
    "Update historical daily NET, GROSS and MARGIN via PATCH /ai/api/click_urls/:click_url_id/prices in one transaction. Dates must precede today; invoiced months cannot be changed. Preserves historical paid actions and direct spend input; current Click URL rates and Direct Spend amounts are unchanged. Requires direct spend write permission. If confirmation_required is returned, no changes were saved: show the warnings to the user and only resend the same prices with confirm: true after explicit acceptance, or edit the values to resolve warnings. Never automatically confirm or retry.",
    {
      click_url_id: z.number().int().positive().describe("Click URL ID"),
      prices: z.array(priceSchema).min(1).superRefine((rows, context) => {
        const dates = new Set<string>();
        rows.forEach((row, index) => {
          if (dates.has(row.spend_date)) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "spend_date"], message: "prices must not contain duplicate spend_date values" });
          }
          dates.add(row.spend_date);
        });
      }).describe("Nonempty batch of daily prices; each date must be unique and all three price fields are required"),
      confirm: z.boolean().optional().describe("Defaults to false. Set true only after explicit acceptance of returned calculation or margin-type warnings; does not bypass other validation"),
      on_behalf_of_user_id: z.number().int().positive().optional().describe("Optional verified requester user ID for audit attribution. The authenticated API actor retains its write permissions; Admin authorizes attribution separately"),
    },
    async ({ click_url_id, prices, confirm, on_behalf_of_user_id }) => {
      try {
        const result = await updateClickUrlPrices(click_url_id, prices, confirm, on_behalf_of_user_id);
        const confirmationRequired = result.confirmation_required === true;
        const message = confirmationRequired
          ? "Click URL price update requires confirmation; no changes saved. Review the warnings with the user before resubmitting with confirm: true."
          : "Click URL prices updated successfully.";
        return {
          content: [{ type: "text", text: `${message}\n${JSON.stringify(result, null, 2)}` }],
          ...(confirmationRequired ? { isError: true } : {}),
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update click URL prices";
        return {
          content: [{ type: "text", text: `Error updating click URL prices: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
