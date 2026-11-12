# Feedmob Spend MCP Server

## Requester attribution

`create_direct_spend`, `update_direct_spend`, `create_campaign`, and
`update_click_url_prices` accept an optional positive integer
`on_behalf_of_user_id`. Agent callers must resolve it from trusted session
context and a verified FeedMob user mapping, never user-authored identity text.
Spend and price requests send it at the top level. Campaign creation sends it
inside the `campaign` envelope with the campaign fields.

Admin authorizes the API actor's write permission and attribution separately.
The actor must be allowed by `AI_ON_BEHALF_OF_ALLOWED_EMAILS` to attribute the
audit to the requester. Do not retry a rejected request without attribution.
Omitting the field preserves the API actor's default attribution.

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

## Update historical Click URL prices

Use `update_click_url_prices` to call
`PATCH /ai/api/click_urls/:click_url_id/prices`. Version `0.0.27` adds this tool.
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
  Historical arbitrage level 2 requires margin `"N/A"`.
- Optional top-level `on_behalf_of_user_id`: positive integer identifying the
  user who requested the change. Admin checks the authenticated actor's write
  permission and `AI_ON_BEHALF_OF_ALLOWED_EMAILS` before attributing audits to
  the requester. The API credentials and actor's write permissions stay unchanged.
  Unknown users return
  HTTP 422 as a tool error before any price changes; this is not a confirmation
  warning.
- The API validates dates before today and on or after Click URL creation.
  Invoiced months cannot be changed, even with `confirm: true`.
- The entire batch is transactional. Historical paid actions, cap action,
  direct spend input, and other historical fields are preserved. Current Click URL
  rates and Direct Spend amounts are unchanged.

Calculation or margin-type warnings return HTTP 422 with
`confirmation_required: true`. The tool returns this as a tool error with the
complete API response, including warning titles/content and the resubmission
message. **Nothing is saved at this step.** Show the warnings to the user and
resend the same prices and `on_behalf_of_user_id` (if supplied) with
`confirm: true` only after explicit acceptance,
or edit the values to resolve the warnings. The tool never automatically retries.
Confirmation accepts warnings only and cannot bypass other validation.

Success returns normalized stored prices and any accepted warnings. Validation,
authentication, permission, and save failures return tool errors with API details.

Run `npm test` for mocked HTTP and MCP tool integration tests; no live API writes
are performed by the tests.

## License

MIT
