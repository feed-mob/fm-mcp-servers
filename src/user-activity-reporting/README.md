# User Activity Reporting MCP

MCP server for querying user-client relationships and activity data across platforms.

## Features

- **get_client_team_members** - Query team members (AM, PM, etc.) responsible for a specific client
- **get_user_pod_clients** - Query all clients managed by a specific user

## Setup

```bash
cd src/user-activity-reporting
npm install
cp .env.example .env
# Edit .env with your credentials
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `FEEDMOB_API_BASE` | Feedmob Admin API base URL |
| `FEEDMOB_KEY` | Feedmob API key |
| `FEEDMOB_SECRET` | Feedmob API secret |

## Development

```bash
npm run dev      # Run with hot reload
npm run inspect  # Test tools interactively
npm run build    # Compile to dist/
npm run start    # Run compiled version
```

## Usage Examples

### Get team members for a client
```
Tool: get_client_team_members
Parameters: { "client_name": "Binance" }
```

### Get clients managed by a user
```
Tool: get_user_pod_clients
Parameters: { "user_name": "John", "role": "am" }
```
