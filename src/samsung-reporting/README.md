# Samsung Reporting MCP Server

## Install with Claude Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | bash -s -- samsung-reporting
```

Pin a specific release:

```bash
FM_MCP_INSTALL_REF=v1.0.0 \
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/v1.0.0/scripts/install.sh | bash -s -- samsung-reporting
```

Node.js server implementing Model Context Protocol (MCP) for Samsung API.

## Features

This server provides the following tools:

*   **`get_samsung_content_metrics`**: Fetch content metrics from Samsung API for a specific date range.
    *   **Input Parameters**:
        *   `startDate` (string, required): Start date for the report in `YYYY-MM-DD` format.
        *   `endDate` (string, required): End date for the report in `YYYY-MM-DD` format.
        *   `appName` (string, optional): Limit results to a single configured client. Available clients: `Lyft`, `Self Financial`, `Chime`, `ZipRecruiter`, `Upside`, `Albert`.
        *   `metricIds` (array of strings, optional): Optional array of metric IDs to fetch. Defaults to standard metrics if not provided:
            *   `total_unique_installs_filter`
            *   `dn_by_total_dvce`
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
    export SAMSUNG_BASE_URL='your_samsung_api_base_url'
    ```

    **Required Environment Variables:**
    *   `SAMSUNG_ISS`: Samsung issuer identifier for JWT authentication
    *   `SAMSUNG_PRIVATE_KEY`: Private key for JWT signing (RS256 algorithm)
    
    **Optional Environment Variables:**
    *   `SAMSUNG_BASE_URL`: Samsung API base URL. If omitted, the server uses its built-in default

## Configured Clients

The package currently ships with a built-in list of supported clients, including:

*   `Lyft`
*   `Self Financial`
*   `Chime`
*   `ZipRecruiter`
*   `Upside`
*   `Albert`

To add a new client, update the `SAMSUNG_CONTENT_IDS` constant in `src/index.ts` with the client name and the corresponding Samsung content ID mappings.

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
            "SAMSUNG_PRIVATE_KEY": "your_samsung_private_key"
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
4.  Set the required environment variables (`SAMSUNG_ISS` and `SAMSUNG_PRIVATE_KEY`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
