# Feedmob Spend MCP Server

## Install with Claude Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | bash -s -- feedmob-reporting
```

Pin a specific release:

```bash
FM_MCP_INSTALL_REF=v1.0.0 \
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/v1.0.0/scripts/install.sh | bash -s -- feedmob-reporting
```


## Usage with Claude Desktop

1. Make sure you have installed and updated to the latest version of Claude for Desktop.
2. Open the Claude for Desktop configuration file:
- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
- Windows: %APPDATA%\Claude\claude_desktop_config.json
3. Add the Feedmob Spend MCP server to the configuration:

### NPX


```
cd src/feedmob-reporting && npm run build
```

```json
{
  "mcpServers": {
    "feedmob": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/fm-mcp-servers/src/feedmob-reporting/dist/index.js"
      ],
      "env": {
        "FEEDMOB_KEY": "FEEDMOB_KEY",
        "FEEDMOB_SECRET": "FEEDMOB_SECRET",
        "FEEDMOB_API_BASE": "FEEDMOB_API_BASE"
      }
    }
  }
}

{
  "mcpServers": {
    "feedmob": {
      "type": "stdio",
      "command": "npx",
      "args": [ "-y", "@feedmob/feedmob-reporting" ],
      "env": {
        "FEEDMOB_KEY": "FEEDMOB_KEY",
        "FEEDMOB_SECRET": "FEEDMOB_SECRET",
        "FEEDMOB_API_BASE": "FEEDMOB_API_BASE"
      }
    }
  }
}
```

## Bidease reports

Version `0.0.28` adds `get_bidease_reports`, calling `GET /ai/api/bidease_reports`.
Both dates are required, must be valid `YYYY-MM-DD` dates, and `start_date` must
not be after `end_date`. The date range is inclusive; no client ID is required.

```json
{
  "start_date": "2026-11-01",
  "end_date": "2026-11-10"
}
```

Returns daily rows grouped by Bidease advertiser and campaign, with `impressions`,
`clicks`, `conversions`, and `partner_net_spend`. Rows include
`bidease_advertiser_id`, `bidease_campaign_id`, `bidease_campaign_name`, and mapped
FeedMob `click_url_id`, `campaign_id`, `campaign_name`, `vendor_id`, `vendor_name`.
Unmatched rows are retained with `matched: false` and null FeedMob metadata.
Nonempty results are also saved as CSV under `./tmp`, with `csv_file_path` returned.
Empty results return an empty data array without creating a CSV.
API errors, including validation (400) and Bidease upstream failures (502),
are returned as tool errors with the API error message.
Uses the existing `FEEDMOB_KEY`, `FEEDMOB_SECRET`, and `FEEDMOB_API_BASE` configuration.

## List Click URLs

Use `get_click_urls` to call `GET /ai/api/click_urls`. All filters are optional;
pass `{}` to fetch the first page. Filters are intersected.

```json
{
  "client_id": 123,
  "vendor_id": [456, 457],
  "direct_spend_input": true,
  "page": 1,
  "per_page": 100
}
```

Supported filters: `client_id`, `campaign_id`, `vendor_id`, `parent_campaign_id`,
`click_url_id`, `direct_spend_input`, `stage_level`, `link_type`,
`client_paid_action`, and `vendor_paid_action`.
`campaign_id`, `vendor_id`, and `click_url_id` each accept a positive ID or a
nonempty array of positive IDs; numeric ID strings are also accepted. Arrays use
the API's singular query keys (`vendor_id[]`, `campaign_id[]`, `click_url_id[]`).
`direct_spend_input` accepts a boolean, including `false` as an explicit filter.
`stage_level` accepts 0 (regular FM link without direct spend), 1 (direct spend
without arbitrage), or 2 (arbitrage), including their string equivalents.
Link types and paid actions accept enum names or integer codes, including numeric
strings (for example `fm_link` or 1, `first_install` or 1, `multiple` or 0).

The tool returns the full `data` and `meta`, including `current_page`, `per_page`,
`total_count`, and `total_pages`. Results are ordered by descending ID; deleted
records follow the model default scope and are excluded. Rows include associated
client, campaign, vendor and tracker names, pricing, paid actions, tracking
settings, status and display status.

Pagination defaults to `page=1`, `per_page=100`; the API caps page size at 100.
Each call fetches one page. Read `meta.total_pages` and request subsequent pages
before treating the result as complete. Empty results retain pagination metadata.
Uses the existing `FEEDMOB_KEY`, `FEEDMOB_SECRET`, and `FEEDMOB_API_BASE` credentials;
API validation, authentication and other failures return tool errors.

Use this tool to select `click_url_ids` for `create_direct_spend_request`, after
checking `get_direct_spend_request_options` for parameter guidance.

## Create a direct spend request

First call `get_direct_spend_request_options` with `{}`. It calls
`GET /ai/api/direct_spend_requests/options` and returns the API's current field
types, required fields, defaults, choice labels and submitted values, custom
source instructions, and lookup APIs. It uses the existing API credentials and
does not require write or delegation permission. The full `create` and `fields`
metadata is returned without filtering or caching.

Submit option **values**, not labels (for example, the status label
`initialized(waiting approve)` has value `initialized`). Use the lookup metadata
to find client/vendor/Click URL IDs, job IDs, assignee email strings and the
requester's `feedmob_user_id`. For custom spend sources, submit the actual source
string rather than `custom option`. The API does not run admin-page JavaScript
autofill; explicitly supply suggested values such as `Integrated Vendor API`
when appropriate.

Use `create_direct_spend_request` to call `POST /ai/api/direct_spend_requests`
with top-level admin-form fields. `client_id` is required; other fields are optional.
The API defaults `status` to `initialized` and normalizes
`initialized(waiting approve)` to `initialized`.

```json
{
  "client_id": 123,
  "vendor_ids": [456],
  "click_url_ids": [789],
  "client_paid_actions": [0, 1],
  "vendor_paid_actions": [8],
  "margin_type": "fixed",
  "margin_source": "formula",
  "notes": "Create spend automation for this Click URL",
  "schedule": "0 1 * * *",
  "automation_start_date": "2026-11-12"
}
```

Supported optional fields:

- Associations: `vendor_ids`, `click_url_ids`, `direct_spend_job_stat_id`.
- Paid actions: `client_paid_actions`, `vendor_paid_actions`. Both accept arrays of
  codes: 0 multiple, 1 first_install, 2 retained, 3 tutorial, 4 first_registration,
  5 first_purchase, 6 level, 7 open, 8 impression, 9 all_purchase, 10 click,
  100 all_event_a, 101 first_event_a, 102 all_event_b, 103 first_event_b,
  104 vendor_managed. ID arrays and paid action arrays accept numeric strings;
  scalar values and blank array entries are rejected by the tool.
- Calculations: `gross_spend_formula`, `net_spend_formula`, `margin_formula`,
  `margin_type` (`dynamic` or `fixed`), `gross_spend_source`, `net_spend_source`,
  `margin_source` (`click url`, `formula`, or `other`), `arbitrage_level_switch`.
- Workflow: `github_ticket`, `hubspot_ticket`, `notes`, `schedule`,
  `automation_start_date` (`YYYY-MM-DD`), `job`, `having_client_report`.
- Assignees: `marketing_rep`, `pm`, `pa`, `dev` (email strings, as in the admin form).
- Status: `initialized`, `initialized(waiting approve)`, `pm_manual`, `pa_manual`,
  `in_progress`, `auto_upload`, `pause`, `void`.
- Attribution: `on_behalf_of_user_id`, recorded in the audit comment. The API key
  owner remains the creator and audit actor.

Uses the existing `FEEDMOB_KEY`, `FEEDMOB_SECRET`, and `FEEDMOB_API_BASE` environment
variables. The API key owner must be allowlisted in
`AI_DIRECT_SPEND_CREATE_ALLOWED_EMAILS` on the API server. Supplying
`on_behalf_of_user_id` also requires that owner to be allowlisted in
`AI_ON_BEHALF_OF_ALLOWED_EMAILS`; these are server settings, not new MCP env vars.

HTTP 201 returns the created request, client/vendor names, `created_by_user_id`,
and notification `warnings`. Creation sends the same email and Slack notifications
as the admin form (skipped for a test client or vendor). Notification warnings
mean the request was saved successfully: inspect them without retrying creation.
Invalid or duplicate requests (400), authentication failures (401), permission
failures (403), and unknown requesting users (422) return tool errors with API
details. No automatic creation retry is performed.

## Create a direct spend

Use `create_direct_spend` to call `POST /ai/api/direct_spends` with top-level fields.
Required fields:

- `click_url_id`: Click URL ID.
- `spend_date`: valid `YYYY-MM-DD`, on or after the Click URL creation date (checked by the API).
- `net_spend`, `gross_spend`: both required, finite amounts >= 0; numeric strings accepted.
  Zero is valid; blank values are rejected.

Optional fields:

- `impression`, `clicks_count`, `installs_count`, `client_paid_action_count`,
  `partner_paid_action_count`: integers >= 0; integer strings accepted; supplied
  blanks, decimals, and negatives are rejected.
- `creative`: string; blank values are ignored by the API.
- `audit_comment`: string appended to the creation audit source description.

```json
{
  "click_url_id": 12345,
  "spend_date": "2026-11-05",
  "net_spend": "125.50",
  "gross_spend": "150.00",
  "impression": "10000",
  "clicks_count": 0,
  "installs_count": 10,
  "client_paid_action_count": "2",
  "partner_paid_action_count": 2,
  "creative": "Banner A",
  "audit_comment": "Initial spend import"
}
```

Campaign, vendor, and paid_action are derived from the Click URL.
This tool creates new records only; use `update_direct_spend` for existing records.
The API returns HTTP 200 on success and HTTP 400 for validation or duplicate failures;
error details are returned as tool errors. Use the existing `FEEDMOB_KEY`,
`FEEDMOB_SECRET`, and `FEEDMOB_API_BASE` environment variables.

## Update a direct spend

Use `update_direct_spend` with either **NetSpend ID** or **`click_url_id` + `spend_date`**.
With `id`, the tool calls `PATCH /ai/api/direct_spends/:id`.
With `click_url_id` + `spend_date`, it directly calls
`PATCH /ai/api/direct_spends/by_click_url` with both selectors in the request body;
`id` is not sent to this endpoint. A failed lookup returns an error and creates no record.
Spend date and associations cannot be modified. `create_direct_spend` creates new records only.
The API user associated with `FEEDMOB_KEY` must have direct spend write permission.
Use the existing `FEEDMOB_KEY`, `FEEDMOB_SECRET`, and `FEEDMOB_API_BASE` configuration.

```json
{
  "click_url_id": 12345,
  "spend_date": "2026-11-05",
  "net_spend": "125.50",
  "clicks_count": 0,
  "audit_comment": "Correct spend after reconciliation"
}
```

Provide either `id` or both `click_url_id` and `spend_date`, not both selectors.
`spend_date` is only used for lookup with `click_url_id`; do not supply it with `id`.
Omitted fields are preserved. Optional update fields:

- `net_spend`, `gross_spend`: finite amounts >= 0; numeric strings accepted; blank values rejected.
- `impression`, `clicks_count`, `installs_count`, `client_paid_action_count`,
  `partner_paid_action_count`: integers >= 0; integer strings accepted; blanks,
  decimals, and negatives rejected. Zero is sent as an explicit update.
- `creative`: string; blank values are ignored by the API.
- `audit_comment`: string appended to the update audit source description when fields change.

Gross spend cannot change in an invoiced month. API validation, duplicate,
not-found, and permission errors are returned as tool errors with the API details.

## Update past or today's Click URL prices

Use `update_click_url_prices` to call
`PATCH /ai/api/click_urls/:click_url_id/prices`. Version `0.0.27` adds this tool.
Version `0.0.29` supports today's prices and displays the notice about future rates.
The API key owner's email must be in `AI_DIRECT_SPEND_CREATE_ALLOWED_EMAILS`
on the API server, the same write permission as direct spend creation/updates.
Use the existing `FEEDMOB_KEY`, `FEEDMOB_SECRET`, and `FEEDMOB_API_BASE` configuration;
no new MCP environment variables are required.

```json
{
  "click_url_id": 12345,
  "prices": [
    { "spend_date": "2026-11-05", "net_cpi": "15", "gross_cpi": "25", "margin": "40" },
    { "spend_date": "2026-11-06", "net_cpi": "N/A", "gross_cpi": "N/A", "margin": "N/A" }
  ],
  "confirm": false
}
```

- `prices` must be nonempty, with unique valid `YYYY-MM-DD` dates and all three
  fields `net_cpi`, `gross_cpi`, and `margin` in each row.
- Rates accept finite nonnegative numbers or numeric strings. Margin accepts
  finite numbers or numeric strings, including negatives. `"N/A"` represents
  dynamic rates/margin (stored as `-1` for rates and `null` for margin).
  Historical arbitrage level 2 and today's arbitrage prices require margin `"N/A"`.
- Optional top-level `on_behalf_of_user_id`: positive integer identifying the
  user who requested the change. Records the requester's name/email in the audit
  comment alongside the API key user's name/email. It does not change the
  authenticated user, audit actor, or write permissions. Unknown users return
  HTTP 422 as a tool error before any price changes; this is not a confirmation
  warning.
- The API validates dates on or before today and on or after Click URL creation.
  Invoiced months cannot be changed, even with `confirm: true`.
- Before submitting today's prices, inform the user that the supplied NET rate,
  GROSS rate, and MARGIN apply to today and all future dates until the next rate
  change. Today's prices update the live Click URL rates while preserving its
  current paid actions, cap action, and direct spend input. This notice does not
  add a separate confirmation requirement.
- The entire batch is transactional. Past dates preserve historical paid actions,
  cap action, direct spend input, and other historical fields without updating
  live Click URL rates. Direct Spend amounts are unchanged.

Calculation or margin-type warnings return HTTP 422 with
`confirmation_required: true`. The tool returns this as a tool error with the
complete API response, including warning titles/content and the resubmission
message. **Nothing is saved at this step.** Show the warnings to the user and
resend the same prices and `on_behalf_of_user_id` (if supplied) with
`confirm: true` only after explicit acceptance,
or edit the values to resolve the warnings. The tool never automatically retries.
Confirmation accepts warnings only and cannot bypass other validation.

Success returns normalized stored prices and any accepted warnings. Batches
including today also return the API's `TODAY_RATE_NOTICE` in `message`, which the
tool displays in its success text and preserves in the full response. Past-only
batches omit this notice. Validation, authentication, permission, and save failures
return tool errors with API details.

Run `npm test` for mocked HTTP and MCP tool integration tests; no live API writes
are performed by the tests.

## License

MIT
