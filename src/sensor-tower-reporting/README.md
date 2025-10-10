# Sensor Tower Reporting MCP Server

This MCP server provides tools to interact with the [Sensor Tower API](https://sensortower.com/api) for mobile app intelligence and market data.

## Features

- **Tools**:
  - [`get_app_metadata`](src/index.ts:929): Fetch app metadata including name, publisher, categories, description, screenshots, and ratings
  - [`get_top_in_app_purchases`](src/index.ts:981): Fetch top in-app purchases for iOS apps
  - [`get_compact_sales_report_estimates`](src/index.ts:1030): Get download and revenue estimates in compact format (revenues in cents)
  - [`get_active_users`](src/index.ts:1119): Fetch active user estimates (DAU/WAU/MAU) by country and date
  - [`get_category_history`](src/index.ts:1194): Get detailed category ranking history for apps
  - [`get_category_ranking_summary`](src/index.ts:1274): Fetch today's category ranking summary
  - [`get_network_analysis`](src/index.ts:1329): Get impressions share of voice (SOV) time series
  - [`get_network_analysis_rank`](src/index.ts:1405): Fetch network analysis ranking data
  - [`get_retention`](src/index.ts:1481): Get app retention data (day 1 to day 90)
  - [`get_downloads_by_sources`](src/index.ts:1551): Fetch app downloads by sources (organic, paid, browser)

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

## Error Handling

The server includes comprehensive error handling with specific error types:
- [`ConfigurationError`](src/index.ts:36): Missing or invalid configuration
- [`SensorTowerApiError`](src/index.ts:29): API-related errors with detailed messages
- Input validation using [Zod schemas](src/index.ts:836) for all parameters

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `AUTH_TOKEN` | Yes | Sensor Tower API authentication token | - |
| `SENSOR_TOWER_BASE_URL` | No | Sensor Tower API base URL | `https://api.sensortower.com` |

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