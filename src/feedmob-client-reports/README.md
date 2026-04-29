# FeedMob Client Reports MCP Server

MCP server for querying FeedMob client reports data, including report status, logs, and requests.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLIENT_REPORTS_API_URL` | Base URL for the client reports API (e.g., `https://reports.feedmob.com`) |
| `REPORT_REQUESTS_API_URL` | Base URL for the report requests API (e.g., `https://requests.feedmob.com`) |
| `API_TOKEN` | JWT Bearer token for authentication |

## Tools

### list_reports

Query all reports' automatic upload status (first/last upload time).

**Parameters:** None

**Returns:**
- Report name
- Auto-upload enabled status
- Upload type (S3, Email, etc.)
- Report type (daily/rolling/monday/weekly/monthly)
- First and last upload times

### report_logs

Query report execution logs with multi-dimensional filtering and pagination.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | number | No | Filter by client ID |
| `report_category` | number \| number[] | No | Filter by report category |
| `scope` | "internal" \| "external" | No | Filter by scope |
| `client` | string | No | Filter by client name (fuzzy search) |
| `report_config_id` | number | No | Filter by report config ID |
| `status` | "in_progress" \| "finished" \| "failed" | No | Filter by status |
| `allow_empty_upload_time` | string | No | Filter by upload time range (format: "YYYY-MM-DD - YYYY-MM-DD") |
| `allow_empty_report_time` | string | No | Filter by report time (format: "YYYY-MM-DD") |
| `pa_user` | string | No | Filter by PA user |
| `page` | number | No | Page number (default: 1) |

### report_requests

Query report requests list with filtering and pagination.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | "initialized" \| "in_progress" \| "auto_upload" \| "paused" \| "archived" | No | Filter by status |
| `report_type` | "client_report" \| "vendor_report" \| "internel_report" | No | Filter by report type |
| `scope` | "internal" \| "external" | No | Filter by scope |
| `client_id` | number | No | Filter by client ID |
| `vendor_id` | number | No | Filter by vendor ID |
| `report_categories` | string \| string[] | No | Filter by report categories |
| `report_name` | string | No | Filter by report name (fuzzy search) |
| `page` | number | No | Page number (default: 1) |

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "feedmob-client-reports": {
      "command": "node",
      "args": ["/path/to/fm-mcp-servers/src/feedmob-client-reports/dist/index.js"],
      "env": {
        "CLIENT_REPORTS_API_URL": "https://reports.feedmob.com",
        "REPORT_REQUESTS_API_URL": "https://requests.feedmob.com",
        "API_TOKEN": "your-jwt-token"
      }
    }
  }
}
```
