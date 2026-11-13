import { z } from "zod";

const positiveId = z.union([z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)]);
const idFilter = z.union([positiveId, z.array(positiveId).min(1)]);
const enumFilter = z.union([z.number().int().nonnegative(), z.string().trim().min(1)]);

export const clickUrlsQuerySchema = z.object({
  client_id: positiveId.optional().describe("Client ID"),
  campaign_id: idFilter.optional().describe("Campaign ID or a nonempty array of campaign IDs; integer strings accepted"),
  vendor_id: idFilter.optional().describe("Vendor ID or a nonempty array of vendor IDs; integer strings accepted"),
  parent_campaign_id: positiveId.optional().describe("Parent campaign ID"),
  click_url_id: idFilter.optional().describe("Click URL ID or a nonempty array of Click URL IDs; integer strings accepted"),
  direct_spend_input: z.boolean().optional().describe("Filter by direct spend input; false is an explicit filter"),
  stage_level: z.union([z.number().int().min(0).max(2), z.enum(["0", "1", "2"])])
    .optional().describe("Stage level: 0 regular fm_link without direct spend input, 1 direct spend without arbitrage, 2 arbitrage"),
  link_type: enumFilter.optional().describe("Link type name or code: fm_link (1), mmp_link (2), agency_link_tracking (3), agency_link_conversion (4)"),
  client_paid_action: enumFilter.optional().describe("Client paid action name or integer code, for example first_install or 1; multiple is 0"),
  vendor_paid_action: enumFilter.optional().describe("Vendor paid action name or integer code, for example first_purchase or 5; multiple is 0"),
  page: z.number().int().positive().optional().describe("Page number; defaults to 1 on the API"),
  per_page: z.number().int().positive().optional().describe("Page size; defaults to 100 and is capped at 100 by the API"),
});

export type ClickUrlsQuery = z.infer<typeof clickUrlsQuerySchema>;
