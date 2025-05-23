# Samsung Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for Samsung API.

## Features

This server provides the following tools:

*   **`get_samsung_content_metrics`**: Fetch content metrics from Samsung API for a specific date range.
    *   **Input Parameters**:
        *   `startDate` (string, required): Start date for the report in `YYYY-MM-DD` format.
        *   `endDate` (string, required): End date for the report in `YYYY-MM-DD` format.
        *   `metricIds` (array of strings, optional): Optional array of metric IDs to fetch. Defaults to standard metrics if not provided:
            *   `total_unique_installs_filter`
            *   `revenue_total`
            *   `revenue_iap_order_count`
            *   `daily_rat_score`
            *   `daily_rat_volumne`
    *   **Output**: Returns the content metrics data as JSON.

## Setup

1.  **Environment Variables**: Before running the server, you need to set the following environment variables:

    ```bash
    export SAMSUNG_ISS='your_samsung_issuer'
    export SAMSUNG_PRIVATE_KEY='your_samsung_private_key'
    export SAMSUNG_CONTENT_ID='your_samsung_content_id'
    ```

    **Required Environment Variables:**
    *   `SAMSUNG_ISS`: Samsung issuer identifier for JWT authentication
    *   `SAMSUNG_PRIVATE_KEY`: Private key for JWT signing (RS256 algorithm)
    *   `SAMSUNG_CONTENT_ID`: Content ID for which to fetch metrics

## Usage with Claude Desktop

1.  Make sure you have installed and updated to the latest version of Claude for Desktop.
2.  Open the Claude for Desktop configuration file:
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3.  Add the Samsung MCP server to the `mcpServers` configuration section:

    ```json
    {
      "mcpServers": {
        "samsung": {
          "command": "npx",
          "args": [ "-y", "@feedmob/samsung-reporting" ],
          "env": {
            "SAMSUNG_ISS": "your_samsung_issuer",
            "SAMSUNG_PRIVATE_KEY": "your_samsung_private_key",
            "SAMSUNG_CONTENT_ID": "your_samsung_content_id"
          }
        }
      }
    }
    ```

## Authentication

The server uses JWT (JSON Web Token) authentication with RS256 algorithm to authenticate with Samsung API:

1.  Generates a JWT token using the provided private key and issuer
2.  Uses the JWT to obtain an access token from Samsung's auth endpoint
3.  Uses the access token for subsequent API calls to fetch content metrics

The JWT token includes:
*   `iss`: Samsung issuer identifier
*   `scopes`: `['publishing', 'gss']`
*   `exp`: Token expiration (20 minutes from issue time)
*   `iat`: Token issue time

## Development

1.  Clone the repository.
2.  Navigate to the `src/samsung-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variables (`SAMSUNG_ISS`, `SAMSUNG_PRIVATE_KEY`, and `SAMSUNG_CONTENT_ID`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
