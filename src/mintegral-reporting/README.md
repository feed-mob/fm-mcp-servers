# Mintegral Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for Mintegral Reporting API.

## Features

This server provides the following tool:

*   **`get_mintegral_performance_report`**: Retrieves performance data from Mintegral Reporting API.
    *   **Input Parameters**:
        *   `start_date` (string, required): Start date for the report in `YYYY-MM-DD` format.
        *   `end_date` (string, required): End date for the report in `YYYY-MM-DD` format.
        *   `utc` (string, optional): Timezone (default: '+8').
        *   `per_page` (number, optional): Number of results per page (max: 5000). Default is 50.
        *   `page` (number, optional): Page number. Default is 1.
        *   `dimension` (string, optional): Data dimension (e.g., 'location', 'sub_id', 'creative').
        *   `uuid` (string, optional): Filter by uuid.
        *   `campaign_id` (number, optional): Filter by campaign_id.
        *   `package_name` (string, optional): Filter by android bundle id or ios app store id.
        *   `not_empty_field` (string, optional): Fields that can't be empty (comma-separated: 'click', 'install', 'impression', 'spend').
    *   **Output**: Returns the report data in JSON format.

## API Limitations

* Date range cannot exceed 8 days for a single request
* The per_page parameter cannot exceed 5000

## Setup

1.  **Environment Variables**: Before running the server, you need to set the following environment variables:

    ```bash
    export MINTEGRAL_ACCESS_KEY='your_mintegral_access_key'
    export MINTEGRAL_API_KEY='your_mintegral_api_key'
    ```

## Usage with Claude Desktop

1.  Make sure you have installed and updated to the latest version of Claude for Desktop.
2.  Open the Claude for Desktop configuration file:
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3.  Add the Mintegral MCP server to the `mcpServers` configuration section:

    ```json
    {
      "mcpServers": {
        "mintegral": {
          "command": "npx",
          "args": [ "-y", "@feedmob/mintegral-reporting" ]
          "env": {
            "MINTEGRAL_ACCESS_KEY": "your_mintegral_access_key",
            "MINTEGRAL_API_KEY": "your_mintegral_api_key"
          }
        }
      }
    }
    ```

## Development

1.  Clone the repository.
2.  Navigate to the `src/mintegral-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variables (`MINTEGRAL_ACCESS_KEY` and `MINTEGRAL_API_KEY`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
