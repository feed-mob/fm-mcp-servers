# Feedmob Google Drive Files MCP Server

## Features

*   📁 **Google Drive File Management**: Supports creating, updating, and querying Google Drive files in the Femini system.
*   🔍 **Intelligent Querying**: Query relevant information from Google Drive files based on natural language questions, with AI-powered analysis and filtering.
*   📊 **Data Analysis**: Automatically analyzes file content summaries to extract relevant data and provide comprehensive answers.
*   🔗 **API Integration**: Interacts with Femini backend APIs by configuring `FEMINI_API_URL` and `FEMINI_API_TOKEN`.
*   📅 **Date Range Filtering**: Supports filtering files by date range for time-based queries.

## Installation and Setup

Visit Femini dashboard specified page to get MCP server JSON configuration.

### Environment Variables

*   `FEMINI_API_URL`: Femini API base URL
*   `FEMINI_API_TOKEN`: Femini API authentication token

## Tools

### 1. `create_or_update_google_drive_files`

Create or update Google Drive files in the Femini system. By providing a list of Google Drive file IDs, the system will fetch their metadata and store them in the database.

**Parameters:**

*   `google_file_ids`: Required, array of Google Drive file IDs (e.g., `['1abc123', '2def456']`).

**Example:**

```json
{
  "google_file_ids": ["1abc123def456", "2xyz789ghi012"]
}
```

### 2. `query_google_drive_files`

Query relevant information from Google Drive files in the Femini system based on user questions, analyze and filter the queried data, and provide answers.

**Parameters:**

*   `query`: Required, the complete user question.
*   `start_date`: Optional, start date (YYYY-MM-DD format), defaults to 30 days ago.
*   `end_date`: Optional, end date (YYYY-MM-DD format), defaults to yesterday.

**Example:**

```json
{
  "query": "What were the sales figures for Q4 2025?",
  "start_date": "2025-10-01",
  "end_date": "2025-12-31"
}
```

## How It Works
### Query Workflow

1. **Understand User Query**: Analyze the question to identify key information needs
2. **Data Search and Matching**: Search for relevant files based on file name, AI summary, and file type
3. **Data Analysis and Extraction**: Extract relevant data points and perform necessary calculations
4. **Construct Answer**: Provide clear findings with specific data, file URLs, and explanations

## Development and Debugging

### Local Development

```bash
# Start development server
npm run dev

# Test with MCP CLI
npx fastmcp dev src/index.ts

# Debug with MCP Inspector
npx fastmcp inspect src/index.ts
```

### Type Checking

```bash
npx tsc --noEmit
```

## License

MIT License

## Contributions

Welcome to submit Issues and Pull Requests to improve this project.
