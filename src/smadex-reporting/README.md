# Smadex Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for Smadex Reporting API.

## Features

This server provides the following tools:

*   **`get_smadex_report_id`**: Creates a Smadex report request and returns the report ID.
    *   **Input Parameters**:
        *   `startDate` (string, required): Start date for the report in `YYYY-MM-DD` format.
        *   `endDate` (string, required): End date for the report in `YYYY-MM-DD` format.
    *   **Output**: Returns the report ID as text.

*   **`get_smadex_report_download_url`**: Gets the download URL for a Smadex report by its ID.
    *   **Input Parameters**:
        *   `reportId` (string, required): The report ID returned from get_smadex_report_id.
    *   **Output**: Returns the download URL as text.

*   **`get_smadex_report`**: Downloads and returns report data from a Smadex report download URL.
    *   **Input Parameters**:
        *   `downloadUrl` (string, required): The download URL for the report.
    *   **Output**: Returns the report data as text.

## Setup

1.  **Environment Variables**: Before running the server, you need to set the following environment variables:

    ```bash
    export SMADEX_API_BASE_URL='your_smadex_api_base_url'
    export SMADEX_EMAIL='your_smadex_email'
    export SMADEX_PASSWORD='your_smadex_password'
    ```

## Usage with Claude Desktop

1.  Make sure you have installed and updated to the latest version of Claude for Desktop.
2.  Open the Claude for Desktop configuration file:
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3.  Add the Smadex MCP server to the `mcpServers` configuration section:

    ```json
    {
      "mcpServers": {
        "smadex": {
          "command": "npx",
          "args": [ "-y", "@feedmob/smadex-reporting" ]
          "env": {
            "SMADEX_API_BASE_URL": "your_smadex_api_base_url",
            "SMADEX_EMAIL": "your_smadex_email",
            "SMADEX_PASSWORD": "your_smadex_password"
          }
        }
      }
    }
    ```

## Development

1.  Clone the repository.
2.  Navigate to the `src/smadex-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variables (`SMADEX_API_BASE_URL`, `SMADEX_EMAIL`, and `SMADEX_PASSWORD`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
