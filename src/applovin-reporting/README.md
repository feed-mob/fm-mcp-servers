# AppLovin Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for [AppLovin Reporting API](https://dash.applovin.com/documentation/mediation/reporting-api).

## Features

This server provides the following tool:

*   **`get_advertiser_report`**: Retrieves campaign spending data from AppLovin Reporting API for advertisers.
    *   **Input Parameters**:
        *   `start_date` (string, required): The start date for the report in `YYYY-MM-DD` format.
        *   `end_date` (string, required): The end date for the report in `YYYY-MM-DD` format.
        *   `columns` (string, optional): Comma-separated list of columns to include (e.g., 'day,campaign,impressions,clicks,conversions,cost').
        *   `format` (string, optional): Format of the report data ('json' or 'csv'). Default is 'json'.
        *   `filter_campaign` (string, optional): Filter results by campaign name.
        *   `filter_country` (string, optional): Filter results by country (e.g., 'US,JP').
        *   `filter_platform` (string, optional): Filter results by platform (e.g., 'android,ios').
        *   `sort_column` (string, optional): Column to sort by (e.g., 'cost').
        *   `sort_order` (string, optional): Sort order ('ASC' or 'DESC').
    *   **Output**: Returns the report data in the specified format (JSON or CSV).

## Setup

1.  **Environment Variables**: Before running the server, you need to set the `APPLOVIN_API_KEY` environment variable. This key is used for authenticating with the AppLovin API. You can obtain this key from your AppLovin account.

    ```bash
    export APPLOVIN_API_KEY='your_applovin_api_key'
    ```

## Usage with Claude Desktop

1.  Make sure you have installed and updated to the latest version of Claude for Desktop.
2.  Open the Claude for Desktop configuration file:
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3.  Add the AppLovin MCP server to the `mcpServers` configuration section:

    ```json
    {
      "mcpServers": {
        "applovin": {
          "command": "npx",
          "args": [ "-y", "@feedmob/applovin-reporting" ]
          "env": {
            "APPLOVIN_API_KEY": "your_applovin_api_key"
          }
        }
      }
    }
    ```

## Development

1.  Clone the repository.
2.  Navigate to the `src/applovin-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variable (`APPLOVIN_API_KEY`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
