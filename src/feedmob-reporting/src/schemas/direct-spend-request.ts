import { z } from "zod";

export const autoUploadGuidance = "Before creating with status auto_upload or changing an existing request to auto_upload, review direct_spend_job_stat_id (Direct spend job stat) and github_ticket (Github ticket). For updates, consider supplied values and known existing values; omitted fields are preserved, not necessarily blank. If either field is blank or cannot be verified, tell the user before submitting: Before setting status to 'auto_upload', please remember to update 'Direct spend job stat' and 'Github ticket' if needed. Never invent a job ID or ticket. These fields remain optional; this reminder does not require confirmation.";

const positiveId = z.number().int().positive();
const requiredString = z.string().min(1).regex(/\S/, "Must contain a non-whitespace character");
const arrayId = z.union([positiveId, z.string().regex(/^[1-9]\d*$/)]);
const paidActionCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 101, 102, 103, 104];
const paidAction = z.union([z.number().int(), z.string().regex(/^\d+$/)])
  .refine((value) => paidActionCodes.includes(Number(value)), "Unsupported paid action code");
const paidActionDescription = "Paid action codes: 0 multiple, 1 first_install, 2 retained, 3 tutorial, 4 first_registration, 5 first_purchase, 6 level, 7 open, 8 impression, 9 all_purchase, 10 click, 100 all_event_a, 101 first_event_a, 102 all_event_b, 103 first_event_b, 104 vendor_managed; numeric strings accepted";

export const directSpendRequestSchema = z.object({
  client_id: positiveId.describe("Client ID; the client must exist"),
  vendor_ids: z.array(arrayId).optional().describe("Vendor IDs; positive integers or integer strings"),
  click_url_ids: z.array(arrayId).optional().describe("Click URL IDs; positive integers or integer strings"),
  client_paid_actions: z.array(paidAction).optional().describe(paidActionDescription),
  vendor_paid_actions: z.array(paidAction).optional().describe(paidActionDescription),
  direct_spend_job_stat_id: positiveId.optional().describe("Optional job stat ID from /ai/api/direct_spend_job_stats. Before setting auto_upload, review with github_ticket; job text does not replace this ID"),
  gross_spend_formula: requiredString.describe("Nonblank. Use a short admin-style phrase or expression, e.g. Calculated from net and margin, =net spend / (1-margin), or =gross rate * 1st REG. Omit narrative, Click URL IDs and current rate values"),
  net_spend_formula: requiredString.describe("Nonblank. Use a short admin-style phrase or expression, e.g. Spend from vendor API, Spend from partner dashboard, or =net rate * 1st install. Omit narrative, Click URL IDs and current rate values"),
  margin_formula: requiredString.describe("Nonblank. Use a short admin-style phrase or expression, e.g. from click url or 1 - net / gross. Omit narrative and current margin values"),
  margin_type: z.enum(["dynamic", "fixed"]).describe("Margin type"),
  gross_spend_source: requiredString.describe("Nonblank. Use an existing option value or a short custom source name, e.g. Client Report, vendor report, or calculated based on margin and net spend"),
  net_spend_source: requiredString.describe("Nonblank. Use an existing option value or a short custom source name, e.g. Integrated Vendor API, Partner dashboard, or vendor report"),
  margin_source: z.enum(["click url", "formula", "other"]).describe("Margin source; add details to notes when using other"),
  github_ticket: z.string().optional().describe("Optional GitHub ticket reference. Before setting auto_upload, review with direct_spend_job_stat_id; inform the user before submitting if either is blank or cannot be verified"),
  hubspot_ticket: z.string().optional().describe("HubSpot ticket reference"),
  arbitrage_level_switch: z.boolean().optional().describe("Arbitrage level switch"),
  notes: z.string().optional().describe("Brief additional business context only; omit when unnecessary. Avoid repeating IDs, formulas, current rates, environment or creation narration"),
  schedule: z.string().optional().describe("Automation schedule, for example 0 1 * * *"),
  automation_start_date: z.string().date().optional().describe("Automation start date in YYYY-MM-DD format"),
  job: z.string().optional().describe("Automation job"),
  marketing_rep: z.string().optional().describe("Marketing representative email, as in the admin form"),
  pm: z.string().optional().describe("PM email, as in the admin form"),
  pa: z.string().optional().describe("PA email, as in the admin form"),
  dev: z.string().optional().describe("Developer email, as in the admin form"),
  status: z.enum(["initialized", "initialized(waiting approve)", "pm_manual", "pa_manual", "in_progress", "auto_upload", "pause", "void"])
    .optional().describe(`Defaults to initialized on the API; initialized(waiting approve) is normalized to initialized. ${autoUploadGuidance}`),
  having_client_report: z.boolean().optional().describe("Whether a client report is available"),
  on_behalf_of_user_id: positiveId.optional().describe("Optional verified requester's FeedMob user ID for business permissions and audit attribution; requires actor delegation permission. On creation, the requester is also the creator; omit to use the API key user"),
});

export type CreateDirectSpendRequestParams = z.infer<typeof directSpendRequestSchema>;

export const updateDirectSpendRequestSchema = directSpendRequestSchema.partial().extend({
  id: positiveId.describe("Existing Spend Automation Request ID"),
  status: directSpendRequestSchema.shape.status.describe(`Optional new status; omitted status is preserved. initialized(waiting approve) is normalized to initialized. ${autoUploadGuidance}`),
});

export type UpdateDirectSpendRequestParams = z.infer<typeof updateDirectSpendRequestSchema>;
