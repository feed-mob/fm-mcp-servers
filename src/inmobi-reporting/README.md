# Inmobi Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for Inmobi Reporting API.

## Features

This server provides the following tools:

*   **`generate_inmobi_report_ids`**: Generates Inmobi report IDs for SKAN (iOS) and non-SKAN (Android) reports.
    *   **Input Parameters**:
        *   `startDate` (string, required): Start date for the report in `YYYY-MM-DD` format.
        *   `endDate` (string, required): End date for the report in `YYYY-MM-DD` format.
    *   **Output**: Returns JSON with `skanReportId` and `nonSkanReportId`.

*   **`fetch_inmobi_report_data`**: Fetches data from Inmobi reports using report IDs.
    *   **Input Parameters**:
        *   `skanReportId` (string, required): SKAN report ID obtained from generate_inmobi_report_ids.
        *   `nonSkanReportId` (string, required): Non-SKAN report ID obtained from generate_inmobi_report_ids.
    *   **Output**: Returns the combined data from both reports.

## Setup

1.  **Environment Variables**: Before running the server, you need to set the following environment variables:

    ```bash
    export INMOBI_AUTH_URL='your_inmobi_auth_url'
    export INMOBI_SKAN_REPORT_URL='your_inmobi_skan_report_url'
    export INMOBI_NON_SKAN_REPORT_URL='your_inmobi_non_skan_report_url'
    export INMOBI_REPORT_BASE_URL='your_inmobi_report_base_url'
    export INMOBI_CLIENT_ID='your_inmobi_client_id'
    export INMOBI_CLIENT_SECRET='your_inmobi_client_secret'
    ```

## Usage with Claude Desktop

1.  Make sure you have installed and updated to the latest version of Claude for Desktop.
2.  Open the Claude for Desktop configuration file:
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3.  Add the Inmobi MCP server to the `mcpServers` configuration section:

    ```json
    {
      "mcpServers": {
        "inmobi": {
          "command": "npx",
          "args": [ "-y", "@feedmob/inmobi-reporting" ],
          "env": {
            "INMOBI_AUTH_URL": "your_inmobi_auth_url",
            "INMOBI_SKAN_REPORT_URL": "your_inmobi_skan_report_url",
            "INMOBI_NON_SKAN_REPORT_URL": "your_inmobi_non_skan_report_url",
            "INMOBI_REPORT_BASE_URL": "your_inmobi_report_base_url",
            "INMOBI_CLIENT_ID": "your_inmobi_client_id",
            "INMOBI_CLIENT_SECRET": "your_inmobi_client_secret"
          }
        }
      }
    }
    ```

## Development

1.  Clone the repository.
2.  Navigate to the `src/inmobi-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variables.
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
