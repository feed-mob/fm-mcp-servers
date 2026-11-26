import { z } from "zod";

const positiveId = z.number().int().positive();
const writeId = positiveId.max(2_147_483_647);
const nonblankString = z.string().min(1).regex(/\S/, "Must contain a non-whitespace character");
const pagination = {
  page: positiveId.optional().describe("Page number; API default is 1"),
  per_page: positiveId.optional().describe("Page size; API default is 25, capped at 100"),
};
const campaignFilters = {
  client_id: positiveId.optional().describe("Client ID"),
  campaign_id: positiveId.optional().describe("Campaign ID"),
  vendor_id: positiveId.optional().describe("Vendor ID; unsupported for partner channel liftoff"),
  click_url_id: positiveId.optional().describe("Click URL ID; MMP filtering supports only impact, kochava and appsflyer"),
};

export const partnerCampaignMappingsQuerySchema = z.object({
  channel: z.enum([
    "amazon", "appier", "applovin", "bidease", "bigo", "digital_turbine",
    "freewheel", "inmobi", "ironsource", "kayzen", "lg", "liftoff",
    "mintegral", "personaly", "pubmatic", "remerge", "rtb_house", "samsung",
    "smadex", "youappi",
  ]).describe("Partner mapping channel; excludes MMPs"),
  ...campaignFilters,
  ...pagination,
});

export const mmpCampaignMappingsQuerySchema = z.object({
  channel: z.enum(["adjust", "branch", "impact", "kochava", "appsflyer"]),
  ...campaignFilters,
  ...pagination,
});

export const mmpEventMappingsQuerySchema = z.object({
  channel: z.enum(["adjust", "impact", "kochava", "appsflyer"]),
  client_id: positiveId.optional().describe("Client ID"),
  app_id: z.string().optional().describe("External app ID: Adjust app_id, AppsFlyer af_app_id, or Kochava app_guid; unsupported for impact"),
  status: z.enum(["active", "paused"]).optional().describe("Supported only for adjust and appsflyer; omit to include paused mappings"),
  ...pagination,
});

const allocation = z.union([
  z.number().finite(),
  z.string().trim().regex(/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/),
]).refine((value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 100
    && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8;
}, "Allocation must be from 0 to 100 with at most two decimal places");

const bideaseMappingSchema = z.object({
  click_url_id: writeId,
  bidease_advertiser_id: writeId,
  bidease_campaign_id: nonblankString,
}).strict();
const freewheelMappingSchema = z.object({
  click_url_id: writeId,
  freewheel_campaign_id: nonblankString,
  freewheel_campaign_name: nonblankString,
  line_item_id: z.string().optional(),
  line_item_name: z.string().optional(),
  memo: z.object({
    allocation: allocation.optional(),
    note: z.string().max(255).optional(),
  }).strict().optional().describe("Replaces the whole memo object; {} clears it, omission preserves it"),
}).strict();
const remergeMappingSchema = z.object({
  click_url_id: writeId,
  remerge_campaign_name: nonblankString,
}).strict();

export const partnerMappingCreateSchemas = {
  bidease: bideaseMappingSchema,
  freewheel: freewheelMappingSchema,
  remerge: remergeMappingSchema,
};
const hasMappingField = (mapping: Record<string, unknown>) => Object.values(mapping).some((value) => value !== undefined);
export const partnerMappingUpdateSchemas = {
  bidease: bideaseMappingSchema.partial().refine(hasMappingField, "At least one mapping field is required"),
  freewheel: freewheelMappingSchema.partial().refine(hasMappingField, "At least one mapping field is required"),
  remerge: remergeMappingSchema.partial().refine(hasMappingField, "At least one mapping field is required"),
};
const writeFields = {
  channel: z.enum(["bidease", "freewheel", "remerge"]).describe("Partner write channel"),
  on_behalf_of_user_id: positiveId.optional().describe("Verified active, approved requester's FeedMob user ID. Resolve from trusted session identity and a verified user mapping. Requires actor delegation permission on this tool's AiToolPermission row. Omit to use the API actor; preserve on retries"),
};

export const createPartnerCampaignMappingSchema = z.object({
  ...writeFields,
  mapping: z.union([bideaseMappingSchema, freewheelMappingSchema, remergeMappingSchema])
    .describe("Fields for the selected channel; click_url_id is required on creation"),
});
export const updatePartnerCampaignMappingSchema = z.object({
  ...writeFields,
  id: writeId.describe("Existing mapping ID within the selected channel's table"),
  mapping: z.union([
    partnerMappingUpdateSchemas.bidease,
    partnerMappingUpdateSchemas.freewheel,
    partnerMappingUpdateSchemas.remerge,
  ]).describe("At least one field for the selected channel; omitted fields are preserved"),
});

export type PartnerCampaignMappingsQuery = z.infer<typeof partnerCampaignMappingsQuerySchema>;
export type MmpCampaignMappingsQuery = z.infer<typeof mmpCampaignMappingsQuerySchema>;
export type MmpEventMappingsQuery = z.infer<typeof mmpEventMappingsQuerySchema>;
export type CreatePartnerCampaignMappingParams = z.infer<typeof createPartnerCampaignMappingSchema>;
export type UpdatePartnerCampaignMappingParams = z.infer<typeof updatePartnerCampaignMappingSchema>;
