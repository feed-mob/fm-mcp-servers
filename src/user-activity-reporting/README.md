# User Activity Reporting MCP

MCP server for querying client contacts, Slack messages, and HubSpot tickets.

## Features

| Tool | Description |
|------|-------------|
| `get_all_client_contacts` | List all clients with team members |
| `get_client_team_members` | Get team (AA, AM, AE, PM, PA, AO) for a client |
| `get_clients_by_pod` | List clients in a POD team |
| `get_clients_by_name` | Find clients by person name |
| `get_user_slack_history` | Search Slack messages from a user |
| `get_hubspot_tickets` | Query HubSpot tickets |
| `get_hubspot_ticket_detail` | Get ticket details |
| `get_hubspot_tickets_by_user` | Find tickets by owner |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FEEDMOB_API_BASE` | Yes | Feedmob Admin API URL (e.g., `https://admin.feedmob.com`) |
| `FEEDMOB_KEY` | Yes | Feedmob API key |
| `FEEDMOB_SECRET` | Yes | Feedmob API secret |
| `SLACK_BOT_TOKEN` | No | Slack Bot token for message search |
| `HUBSPOT_ACCESS_TOKEN` | No | HubSpot private app token |

## Setup

```bash
cd src/user-activity-reporting
npm install
npm run build
```

## Development

```bash
npm run dev      # Run with hot reload
npm run inspect  # Test tools interactively
npm run build    # Compile to dist/
```

## MCP Configuration

```json
{
  "mcpServers": {
    "user-activity-reporting": {
      "command": "npx",
      "args": ["-y", "@feedmob/user-activity-reporting"],
      "env": {
        "FEEDMOB_API_BASE": "https://admin.feedmob.com",
        "FEEDMOB_KEY": "your_key",
        "FEEDMOB_SECRET": "your_secret",
        "SLACK_BOT_TOKEN": "xoxb-xxx",
        "HUBSPOT_ACCESS_TOKEN": "pat-xxx"
      }
    }
  }
}
```

## Usage Examples

```
# Get team for a client
Tool: get_client_team_members
Args: { "client_name": "Uber" }

# Find clients by person
Tool: get_clients_by_name
Args: { "name": "John", "role": "am" }

# Search Slack messages
Tool: get_user_slack_history
Args: { "user_name": "John", "query": "budget" }
```
