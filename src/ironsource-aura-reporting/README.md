# IronSource Aura Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for IronSource Aura Reporting API for advertisers.

## Features

This server provides the following tool:

*   **`get_advertiser_report_from_aura`**: Retrieves campaign spending data from Aura(IronSource) Reporting API for advertisers.
    *   **Input Parameters**:
        *   `startDate` (string, required): The start date for the report in `YYYY-MM-DD` format.
        *   `endDate` (string, required): The end date for the report in `YYYY-MM-DD` format.
        *   `metrics` (string, optional): Comma-separated list of metrics to include (default: 'impressions,clicks,completions,installs,spend').
        *   `breakdowns` (string, optional): Comma-separated list of breakdowns (default: 'day,campaign_name').
        *   `format` (string, optional): Format of the report data ('json' or 'csv'). Default is 'json'.
        *   `count` (number, optional): Number of records to return (default: 10000, max: 250000).
        *   `campaignId` (string, optional): Filter by comma-separated list of campaign IDs.
        *   `bundleId` (string, optional): Filter by comma-separated list of bundle IDs.
        *   `creativeId` (string, optional): Filter by comma-separated list of creative IDs.
        *   `country` (string, optional): Filter by comma-separated list of countries (ISO 3166-2).
        *   `os` (string, optional): Filter by operating system (ios or android).
        *   `deviceType` (string, optional): Filter by device type (phone or tablet).
        *   `adUnit` (string, optional): Filter by ad unit type (e.g., 'rewardedVideo,interstitial').
        *   `order` (string, optional): Order results by breakdown/metric.
        *   `direction` (string, optional): Order direction ('asc' or 'desc'). Default is 'asc'.
    *   **Output**: Returns the report data in the specified format (JSON or CSV).

## Setup

1.  **Environment Variables**: Before running the server, you need to set the following environment variables:

    ```bash
    export IRONSOURCE_AURA_API_KEY='your_ironsource_aura_api_key'
    export IRONSOURCE_AURA_API_BASE_URL='https://api_base_url'
    ```

## Usage with Claude Desktop

1.  Make sure you have installed and updated to the latest version of Claude for Desktop.
2.  Open the Claude for Desktop configuration file:
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3.  Add the IronSource Aura MCP server to the `mcpServers` configuration section:

    ```json
    {
      "mcpServers": {
        "ironsource-aura": {
          "command": "npx",
          "args": [ "-y", "@feedmob/ironsource-aura-reporting" ],
          "env": {
            "IRONSOURCE_AURA_API_KEY": "your_ironsource_aura_api_key",
            "IRONSOURCE_AURA_API_BASE_URL": "your_api_base_url"
          }
        }
      }
    }
    ```

## Development

1.  Clone the repository.
2.  Navigate to the `src/ironsource-aura-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variables (`IRONSOURCE_AURA_API_KEY` and `IRONSOURCE_AURA_API_BASE_URL`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
