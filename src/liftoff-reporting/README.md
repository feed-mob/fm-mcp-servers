# Liftoff Reporting MCP Server

This MCP server provides tools to interact with the [Liftoff Reporting API](https://docs.liftoff.io/advertiser/reporting_api).

## Features

- **Tools**:
  - `create_liftoff_report`: Generates a new report based on specified parameters.
  - `check_liftoff_report_status`: Checks the status of a previously generated report.
  - `download_liftoff_report_data`: Downloads the data for a completed report (CSV or JSON).
  - `list_liftoff_apps`: Fetches details of available Liftoff applications.
  - `list_liftoff_campaigns`: Fetches details of available Liftoff campaigns.
  - `download_liftoff_report_with_names`: Downloads report data and enriches it with campaign names.
- **Prompts**: (Currently no specific prompts defined)

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Configure environment variables**:
    - Copy `.env.example` to `.env` (if it exists, otherwise create `.env`).
    - Fill in your `LIFTOFF_API_KEY` and `LIFTOFF_API_SECRET` in the `.env` file.
3.  **Build the server**:
    ```bash
    npm run build
    ```

## Running the Server

To run the server directly for testing:

```bash
npm start
```

## Connecting to a Client (e.g., Cursor)

Add the following configuration to your client's MCP server settings (e.g., in Cursor settings), replacing `/path/to/liftoff-reporting` with the actual absolute path if running locally, or using the package name if installed globally:

```json
{
  "mcpServers": {
    "liftoff-reporting": {
      "command": "npx",
      "args": ["-y", "@feedmob/liftoff-reporting"], // Replace with correct package name if needed
      "env": {
        "LIFTOFF_API_KEY": "your_liftoff_api_key",
        "LIFTOFF_API_SECRET": "your_liftoff_api_secret"
      }
    }
  }
}
```

Remember to set the `LIFTOFF_API_KEY` and `LIFTOFF_API_SECRET` in the environment where the client runs or add them to the `env` block in the client configuration.
