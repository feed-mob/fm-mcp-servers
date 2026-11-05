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

## License

MIT
