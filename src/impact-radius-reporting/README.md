# Impact Radius Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for [Impact Radius](https://impact.com/) affiliate marketing reporting with FeedMob campaign mapping integration.

## Features

- **Campaign Mapping Integration**: Automatically fetches campaign mappings from FeedMob API to enrich Impact Radius data
- **Action List Reporting**: Retrieves action lists from Impact Radius API for specified date ranges
- **Data Enrichment**: Combines Impact Radius action data with campaign context including client names and campaign information
- **Flexible Filtering**: Supports filtering by campaign, ad, and event type through mapping configurations

## Available Tools

### fetch_action_list_from_impact_radius

Fetches action list from Impact Radius API with campaign mapping integration for a date range.

**Parameters:**
- `start_date` (string, required): Start date in YYYY-MM-DD format
- `end_date` (string, required): End date in YYYY-MM-DD format

**Returns:**
- JSON object with `allrecords` array containing enriched action data
- Each record includes original Impact Radius data plus mapping fields:
  - `mapping_impact_brand`: Impact brand from mapping
  - `mapping_impact_ad`: Impact ad from mapping
  - `mapping_impact_event_type`: Impact event type from mapping
  - `campaign`: Campaign name from FeedMob
  - `client_name`: Client name from FeedMob
- `total_count`: Total number of records returned

## Usage with Claude Desktop

1. Make sure you have installed and updated to the latest version of Claude for Desktop.
2. Open the Claude for Desktop configuration file:
- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
- Windows: %APPDATA%\Claude\claude_desktop_config.json
3. Add the Impact Radius MCP server to the configuration:

### NPX

```json
{
  "mcpServers": {
    "impact-radius": {
      "command": "npx",
      "args": [ "-y", "@feedmob/impact-radius-reporting" ],
      "env": {
        "IMPACT_RADIUS_SID": "your_impact_radius_sid",
        "IMPACT_RADIUS_TOKEN": "your_impact_radius_token",
        "FEEDMOB_KEY": "your_feedmob_key",
        "FEEDMOB_SECRET": "your_feedmob_secret",
        "FEEDMOB_API_BASE": "your_api_base_url"
      }
    }
  }
}
```

## Authentication Requirements

This server requires authentication for both Impact Radius and FeedMob APIs:

- **Impact Radius**: Requires `IMPACT_RADIUS_SID` and `IMPACT_RADIUS_TOKEN` for HTTP Basic Authentication
- **FeedMob**: Requires `FEEDMOB_KEY` and `FEEDMOB_SECRET` for JWT authentication to access campaign mappings

## License

MIT
