# AppSamurai Reporting MCP Server

This MCP server provides tools and prompts to interact with the [AppSamurai Campaign Spend API](https://help.appsamurai.com/en/articles/11105087-appsamurai-campaign-spend-api).

## Features

- **Tools**:
  - `get_appsamurai_campaign_spend`: Fetches campaign spending data for a specified date range with optional filtering.
- **Prompts**:
  - `check_appsamurai_campaign_spend`: Guides users on how to check campaign spend.

## Parameters

The following parameters are supported:

- **Required**:
  - `startDate`: Start date in YYYY-MM-DD format
  - `endDate`: End date in YYYY-MM-DD format
- **Optional Filters**:
  - `campaignId`: Filter by specific campaign ID
  - `bundleId`: Filter by specific application bundle ID
  - `platform`: Filter by platform (e.g., ios, play)
  - `campaignName`: Filter by campaign name
  - `country`: Filter by country in ISO 3166-1 alpha-2 format (e.g., US, GB)

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Configure environment variables**:
    - Copy `.env.example` to `.env`.
    - Fill in your `APPSAMURAI_API_KEY` in the `.env` file.
3.  **Build the server**:
    ```bash
    npm run build
    ```

## Running the Server

To run the server directly for testing:

```bash
npm start
```

## Connecting to a Client (e.g., Claude Desktop)

Add the following configuration to your client's MCP server settings (e.g., `claude_desktop_config.json`), replacing `/path/to/appsamurai-reporting` with the actual absolute path:

```json
{
  "mcpServers": {
    "appsamurai-reporting": {
      "command": "npx",
      "args": [ "-y", "@feedmob/appsamurai-reporting"],
      "env": {
        "APPSAMURAI_API_KEY": "api_key"
      }
    }
  }
}
```

Remember to set the `APPSAMURAI_API_KEY` in the environment where the client (like Claude Desktop) runs or add it to the `env` block in the client configuration if supported.
