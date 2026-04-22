# Sensor Tower Reporting MCP Server

## Install with Claude Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | bash -s -- sensor-tower-reporting
```

Pin a specific release:

```bash
FM_MCP_INSTALL_REF=v1.0.0 \
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/v1.0.0/scripts/install.sh | bash -s -- sensor-tower-reporting
```

This MCP server provides tools to interact with the [Sensor Tower API](https://sensortower.com/api) for mobile app intelligence and market data.

## Features

- **Tools**:
  - [`get_app_metadata`](src/index.ts:1040): Fetch app metadata including name, publisher, categories, description, screenshots, and ratings
  - [`get_top_in_app_purchases`](src/index.ts:1092): Fetch top in-app purchases for iOS apps
  - [`get_compact_sales_report_estimates`](src/index.ts:1141): Get download and revenue estimates in compact format (revenues in cents)
  - [`get_active_users`](src/index.ts:1230): Fetch active user estimates (DAU/WAU/MAU) by country and date
  - [`get_category_history`](src/index.ts:1305): Get detailed category ranking history for apps
  - [`get_category_ranking_summary`](src/index.ts:1385): Fetch today's category ranking summary
  - [`get_network_analysis`](src/index.ts:1440): Get impressions share of voice (SOV) time series
  - [`get_network_analysis_rank`](src/index.ts:1516): Fetch network analysis ranking data
  - [`get_retention`](src/index.ts:1592): Get app retention data (day 1 to day 90)
  - [`get_downloads_by_sources`](src/index.ts:1662): Fetch app downloads by sources (organic, paid, browser)
  - [`find_apps_by_metric_threshold`](src/index.ts:1733): Discover apps exceeding a download/revenue threshold over a given time period and geography
- **Built-in API Safeguards**:
  - Shared request client for all Sensor Tower endpoints
  - Default request pacing of `5` requests per second to stay under the documented `6 req/s` cap
  - Monthly quota tracking via `x-api-usage-limit` and `x-api-usage-count`
  - Automatic retries for `429`, `502`, `503`, and `504`
  - Quota warnings and near-exhaustion blocking before the monthly limit is fully depleted

- **Data Files**:
  - [`data/category_ids.json`](src/data/category_ids.json): Category ID reference for iOS and Android
  - [`data/country_ids.json`](src/data/country_ids.json): Country code reference

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file with the following variables:
   ```env
   AUTH_TOKEN=your_sensor_tower_auth_token
   SENSOR_TOWER_BASE_URL=https://api.sensortower.com
   SENSOR_TOWER_REQUESTS_PER_SECOND=5
   SENSOR_TOWER_MONTHLY_LIMIT=100000
   SENSOR_TOWER_USAGE_WARN_THRESHOLD=0.2
   SENSOR_TOWER_USAGE_BLOCK_THRESHOLD=0.05
   SENSOR_TOWER_MAX_RETRIES=3
   ```

3. **Build the server**:
   ```bash
   npm run build
   ```

## Running the Server

To run the server directly for testing:

```bash
npm start
```

For development with hot reload:

```bash
npm run dev
```

## Usage with Claude Desktop

1. Make sure you have installed and updated to the latest version of Claude for Desktop.
2. Open the Claude for Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. Add the Sensor Tower Reporting MCP server to the configuration:

### NPX

```json
{
  "mcpServers": {
    "sensor-tower-reporting": {
      "command": "npx",
      "args": ["-y", "@feedmob/sensor-tower-reporting"],
      "env": {
        "AUTH_TOKEN": "your_sensor_tower_auth_token",
        "SENSOR_TOWER_BASE_URL": "https://api.sensortower.com"
      }
    }
  }
}
```

### Local Development

```json
{
  "mcpServers": {
    "sensor-tower-reporting": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/sensor-tower-reporting",
      "env": {
        "AUTH_TOKEN": "your_sensor_tower_auth_token",
        "SENSOR_TOWER_BASE_URL": "https://api.sensortower.com"
      }
    }
  }
}
```

## API Reference

### App Metadata
- **Platform Support**: iOS, Android
- **Limits**: Maximum 100 app IDs per request
- **Returns**: App name, publisher, categories, description, screenshots, ratings

### Sales & Revenue Data
- **Compact Sales Report**: Download and revenue estimates with flexible filtering
- **Revenue Format**: All revenues returned in cents
- **Filtering**: By app IDs, publisher IDs, unified IDs, or categories

### User Analytics
- **Active Users**: DAU/WAU/MAU estimates by country and time period
- **Retention**: Day 1 to day 90 retention rates with baseline comparison
- **Limits**: Maximum 500 app IDs for active users and retention

### Ranking & Category Data
- **Category History**: Detailed ranking history by category and chart type
- **Category Summary**: Current ranking summary for specific apps
- **Hourly Rankings**: Available for iOS apps

### Advertising Intelligence
- **Network Analysis**: Share of voice (SOV) for advertising networks
- **Network Rankings**: Ranking data across countries and networks
- **Downloads by Sources**: Organic vs paid download attribution

### Market Research
- **Find Apps by Metric Threshold**: Discover apps exceeding a download or revenue threshold in a given time range, category, and geography. OS defaults to iOS when not specified.

## Error Handling

The server includes comprehensive error handling with specific error types:
- `ConfigurationError`: Missing or invalid configuration
- `SensorTowerApiError`: API-related errors with detailed messages
- Input validation using [Zod schemas](src/index.ts:836) for all parameters
- Retries with backoff for `429`, `502`, `503`, and `504`
- Shared quota tracking so tool responses can include `api_usage` metadata

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `AUTH_TOKEN` | Yes | Sensor Tower API authentication token | - |
| `SENSOR_TOWER_BASE_URL` | No | Sensor Tower API base URL | `https://api.sensortower.com` |
| `SENSOR_TOWER_REQUESTS_PER_SECOND` | No | Shared in-process request pacing. Keep this at or below `6`; defaults to `5` for safety. | `5` |
| `SENSOR_TOWER_MONTHLY_LIMIT` | No | Fallback monthly quota used before API usage headers are observed. | `100000` |
| `SENSOR_TOWER_USAGE_WARN_THRESHOLD` | No | Warning threshold as a fraction of the monthly quota remaining. | `0.2` |
| `SENSOR_TOWER_USAGE_BLOCK_THRESHOLD` | No | Hard stop threshold as a fraction of the monthly quota remaining. Must be lower than the warn threshold. | `0.05` |
| `SENSOR_TOWER_MAX_RETRIES` | No | Max retries for retryable Sensor Tower responses (`429`, `502`, `503`, `504`). | `3` |

## Rate Limit Strategy

- All outgoing Sensor Tower requests now flow through a shared HTTP client, so the same limits apply across every MCP tool.
- The client paces requests at `5 req/s` by default to stay below Sensor Tower's documented `6 req/s` cap.
- Monthly usage is refreshed from Sensor Tower's response headers whenever available.
- When remaining monthly quota drops below the warning threshold, tool responses include an `api_usage.warning`.
- When remaining monthly quota drops below the block threshold, new requests are rejected instead of fully exhausting the account.

## Development

### Scripts
- `npm run build`: Compile TypeScript and make executables
- `npm run watch`: Watch mode for development
- `npm run prepare`: Prepare package for publishing

### Testing
Use the MCP inspector for manual testing:
```bash
npm run inspect
```

## License

MIT
