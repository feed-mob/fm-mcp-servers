# RTB House Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for RTB House API.

## Features

This server provides the following tools:

*   **`get_rtb_house_data`**: Fetch reporting data from RTB House API for a specific date range.
    *   **Input Parameters**:
        *   `dateFrom` (string, required): Start date for the report in `YYYY-MM-DD` format.
        *   `dateTo` (string, required): End date for the report in `YYYY-MM-DD` format.
        *   `app` (string, optional): Optional app/advertiser name to filter results. If not provided, returns data for all advertisers.
        *   `maxRetries` (integer, optional): Maximum number of retry attempts (default: 3).
    *   **Output**: Returns a mapping of app/advertiser name to data array as JSON. Each data item includes fields such as `day`, `subcampaign`, `impsCount`, `clicksCount`, `campaignCost`, etc.

## Setup

1.  **Environment Variables**: Before running the server, you need to set the following environment variables:

    ```bash
    export RTB_HOUSE_USER='your_rtbhouse_username'
    export RTB_HOUSE_PASSWORD='your_rtbhouse_password'
    ```

    **Required Environment Variables:**
    *   `RTB_HOUSE_USER`: RTB House API username
    *   `RTB_HOUSE_PASSWORD`: RTB House API password

## Usage

1.  Start the server after setting the required environment variables:

    ```bash
    node dist/index.js
    ```

2.  The server exposes the following tool:

    *   **get_rtb_house_data**
        *   `dateFrom` (string, required): Start date in `YYYY-MM-DD` format
        *   `dateTo` (string, required): End date in `YYYY-MM-DD` format
        *   `app` (string, optional): App/advertiser name (case-insensitive)
        *   `maxRetries` (integer, optional): Maximum retry attempts (default: 3)
        *   **Returns**: `{ [appName]: [ { day, subcampaign, impsCount, clicksCount, campaignCost, ... } ] }`

    Example request:
    ```json
    {
      "dateFrom": "2025-06-10",
      "dateTo": "2025-06-15"
    }
    ```

    Example response:
    ```json
    {
      "US_ZipRecruiter_App": [
        {
          "subcampaign": "campaign_name",
          "day": "2025-06-14",
          "impsCount": 138733,
          "clicksCount": 4946,
          "campaignCost": 378.49
        },
        ...
      ]
    }
    ```

## Development

1.  Clone the repository.
2.  Navigate to the `src/rtb-house-reporting` directory.
3.  Install dependencies: `npm install`
4.  Set the required environment variables (`RTB_HOUSE_USER`, `RTB_HOUSE_PASSWORD`).
5.  Build the project: `npm run build`
6.  Run the server directly: `node dist/index.js`

## License

MIT
