# TapJoy Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for [TapJoy Reporting API](https://api.tapjoy.com/graphql/docs/guide-getting_started).

## Features

This server provides the following tool:

*   **`get_advertiser_adset_spend`**: Retrieves spend data for active advertiser ad sets within a specified date range.
    *   **Input Parameters**:
        *   `start_date` (string): The start date for the report in `YYYY-MM-DD` format.
        *   `end_date` (string): The end date for the report in `YYYY-MM-DD` format.
    *   **Output**: Returns a JSON array of objects, each containing the campaign name (`campaign.name`) and the spend in USD (`insights.reports[0].spendUSD`).

## Setup

1.  **Environment Variables**: Before running the server, you need to set the `TAPJOY_API_KEY` environment variable. This key is used for authenticating with the Tapjoy API. You can obtain this key from your Tapjoy account.

    ```bash
    export TAPJOY_API_KEY='your_tapjoy_api_key'
    ```

## Usage with Claude Desktop

1.  Make sure you have installed and updated to the latest version of Claude for Desktop.
2.  Open the Claude for Desktop configuration file:
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3.  Add the Tapjoy MCP server to the `mcpServers` configuration section:

    ```json
    {
      "mcpServers": {
        "tapjoy": {
          "command": "node",
          "args": [ "/path/to/fm-mcp-servers/src/tapjoy-reporting/dist/index.js" ], // Adjust path as needed
          "env": {
            "TAPJOY_API_KEY": "your_tapjoy_api_key_base64_encoded"
          }
        }
        // ... other servers
      }
    }
    ```
    *Replace `/path/to/fm-mcp-servers/src/tapjoy-reporting/dist/index.js` with the actual path to the compiled JavaScript file after building the project.*
    *Alternatively, if published to npm, you could use `npx` similar to the previous Jampp example.*

## Development

1.  Clone the repository.
2.  Navigate to the `src/tapjoy-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variable (`TAPJOY_API_KEY`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
