import { z } from "zod";

const positiveId = z.number().int().positive();
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
  direct_spend_job_stat_id: positiveId.optional().describe("Associated direct spend job stat ID"),
  gross_spend_formula: z.string().optional().describe("Gross spend calculation formula"),
  net_spend_formula: z.string().optional().describe("Net spend calculation formula"),
  margin_formula: z.string().optional().describe("Margin calculation formula"),
  margin_type: z.enum(["dynamic", "fixed"]).optional().describe("Margin type"),
  gross_spend_source: z.string().optional().describe("Gross spend data source"),
  net_spend_source: z.string().optional().describe("Net spend data source"),
  margin_source: z.enum(["click url", "formula", "other"]).optional().describe("Margin source; add details to notes when using other"),
  github_ticket: z.string().optional().describe("GitHub ticket reference"),
  hubspot_ticket: z.string().optional().describe("HubSpot ticket reference"),
  arbitrage_level_switch: z.boolean().optional().describe("Arbitrage level switch"),
  notes: z.string().optional().describe("Additional request details"),
  schedule: z.string().optional().describe("Automation schedule, for example 0 1 * * *"),
  automation_start_date: z.string().date().optional().describe("Automation start date in YYYY-MM-DD format"),
  job: z.string().optional().describe("Automation job"),
  marketing_rep: z.string().optional().describe("Marketing representative email, as in the admin form"),
  pm: z.string().optional().describe("PM email, as in the admin form"),
  pa: z.string().optional().describe("PA email, as in the admin form"),
  dev: z.string().optional().describe("Developer email, as in the admin form"),
  status: z.enum(["initialized", "initialized(waiting approve)", "pm_manual", "pa_manual", "in_progress", "auto_upload", "pause", "void"])
    .optional().describe("Defaults to initialized on the API; initialized(waiting approve) is normalized to initialized"),
  having_client_report: z.boolean().optional().describe("Whether a client report is available"),
  on_behalf_of_user_id: positiveId.optional().describe("Optional requester's user ID for the audit comment; requires additional delegation permission. The API key owner remains the creator and audit actor"),
});

export type CreateDirectSpendRequestParams = z.infer<typeof directSpendRequestSchema>;
