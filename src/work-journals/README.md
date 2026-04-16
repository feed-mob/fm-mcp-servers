# Feedmob Work Journals MCP Server

## Install with Claude Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | bash -s -- work-journals
```

Pin a specific release:

```bash
FM_MCP_INSTALL_REF=v1.0.0 \
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/v1.0.0/scripts/install.sh | bash -s -- work-journals
```

## Features

*   📝 **Work Journal Management**: Supports querying, creating, and updating work journals.
*   🔍 **Flexible Querying**: Supports filtering logs by date range, user ID, and team ID.
*   🔗 **API Integration**: Interacts with backend APIs by configuring `API_URL` and `API_TOKEN`.
*   📚 **Built-in Resources**: Provides Schema information for the Time Off API.

## Installation and Setup

Visit feedmob time off dash specified page to get mcp server json configuration

## Tools

### 1. `query_journals`

Queries work journals, supporting filtering by date range, user ID, and team ID.

**Parameters:**

*   `scheam`: Required, get from system resources `time-off-api-scheam://usage`.
*   `start_date`: Start date (YYYY-MM-DD format), defaults to 7 days before today.
*   `end_date`: End date (YYYY-MM-DD format), defaults to today.
*   `current_user_only`: Optional, whether to query only the current user's work journals (true/false).
*   `user_ids`: Optional, list of user IDs (array).
*   `team_ids`: Optional, list of team IDs (array).

### 2. `create_or_update_journal`

Creates or updates a work journal.

**Parameters:**

*   `date`: Required, journal date (YYYY-MM-DD format).
*   `content`: Required, journal content.

## Resources

### 1. Time Off API Schema, including Teams, Users Information

URI: `time-off-api-scheam://usage`

Provides Schema information for the Time Off API, including team and user information.

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

Welcome to submit Issues and and Pull Requests to improve this project.
