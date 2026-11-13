import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateClickUrlPrices } from "../api.js";

const TODAY_RATE_NOTICE = "Updating today's NET rate, GROSS rate, and MARGIN changes the Click URL's rates for today and all future dates until the next rate change.";

function priceValueSchema(nonnegative: boolean) {
  const number = nonnegative ? z.number().finite().nonnegative() : z.number().finite();
  const numericString = z.string().trim()
    .regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/)
    .refine((value) => Number.isFinite(Number(value)), "Value must be finite")
    .refine((value) => !nonnegative || Number(value) >= 0, "Rate must be nonnegative");
  return z.union([number, numericString, z.literal("N/A")]);
}

const priceSchema = z.object({
  spend_date: z.string().date().describe(`YYYY-MM-DD on or before today and on or after Click URL creation (validated by the API). ${TODAY_RATE_NOTICE}`),
  net_cpi: priceValueSchema(true).describe('Finite net rate >= 0, numeric string, or "N/A" for a dynamic rate'),
  gross_cpi: priceValueSchema(true).describe('Finite gross rate >= 0, numeric string, or "N/A" for a dynamic rate'),
  margin: priceValueSchema(false).describe('Finite margin percentage, numeric string, or "N/A" for dynamic margin; historical arbitrage level 2 and today\'s arbitrage prices require "N/A"'),
});

export function registerClickUrlPricesTool(server: McpServer): void {
  server.tool(
    "update_click_url_prices",
    `Update past or today's daily NET, GROSS and MARGIN via PATCH /ai/api/click_urls/:click_url_id/prices in one transaction. Dates must be on or before today; invoiced months cannot be changed. Before submitting today's prices, inform the user: ${TODAY_RATE_NOTICE} Today's prices update the live Click URL rates, preserving its current paid actions, cap action and direct spend input. Past dates preserve historical context and do not update live Click URL rates. Direct Spend amounts are unchanged. The notice alone does not require confirm: true. Requires direct spend write permission. If confirmation_required is returned, no changes were saved: show the warnings to the user and only resend the same prices with confirm: true after explicit acceptance, or edit the values to resolve warnings. Never automatically confirm or retry.`,
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
      on_behalf_of_user_id: z.number().int().positive().optional().describe("Optional requesting user's ID, recorded in the audit comment. Does not change the authenticated user, audit actor, or write permissions; unknown users return HTTP 422"),
    },
    async ({ click_url_id, prices, confirm, on_behalf_of_user_id }) => {
      try {
        const result = await updateClickUrlPrices(click_url_id, prices, confirm, on_behalf_of_user_id);
        const confirmationRequired = result.confirmation_required === true;
        const message = confirmationRequired
          ? "Click URL price update requires confirmation; no changes saved. Review the warnings with the user before resubmitting with confirm: true."
          : `Click URL prices updated successfully.${result.message ? ` ${result.message}` : ""}`;
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
