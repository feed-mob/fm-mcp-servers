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

## Optional MCP call usage capture

Capture is disabled by default. After the Time-Off `/usage_events` relay is deployed, add `"AI_USAGE_ENABLED": "true"` to the MCP launch configuration's `env` and restart the MCP process. Only the exact value `true` enables capture. Roll out to a small opt-in group first; remove the variable or set it to `false` and restart to disable it. `API_URL` and `API_TOKEN` remain required, with the same missing-configuration startup failure.

The process posts to `${API_URL with trailing slashes removed}/usage_events` using `Authorization: Bearer ${API_TOKEN}`. It ships no analytics origin or analytics credential. The Time-Off relay authenticates the existing token and derives the authoritative user, source, `work-journals` server, environment, and access mode for known tools. A `202 Accepted` acknowledges accepted best-effort forwarding; it does not establish that analytics persisted an event. Other statuses, redirects, and connection failures are dropped without retries.

Capture wraps the public SDK transport supplied to FastMCP's exported `FastMCPSession`, before request dispatch. It records recognizable JSON-RPC `tools/call` requests, including unknown tools, invalid tool parameters, and thrown errors. Initialization, tool discovery, and all resource activity produce no usage events. Invalid JSON or envelopes rejected by the SDK's stdio parser before dispatch are outside capture. The pinned SDK 1.17.0 accepts individual JSON-RPC messages, not batches, so each call has its own generated correlation ID. This package retains its existing handshake-based MCP protocol; upgrading to the current stateless protocol is outside this change.

Each POST is a flat JSON object containing only these fields:

| Field | Meaning |
| --- | --- |
| `event_id` | Fresh UUID for each captured call attempt. |
| `time` | UTC RFC3339 timestamp at dispatch start. |
| `operation` | Tool name, limited to 200 ASCII letters, digits, `_`, `.`, or `-`; missing or invalid names become `unknown_tool`. Valid unregistered tool names are retained. |
| `access_mode` | `read` for `query_journals`, `write` for `create_or_update_journal`, otherwise `unknown`, derived from the tools' `readOnlyHint` annotations. The relay enforces the authoritative policy. |
| `outcome` | `success` for a normal result; `failure` for JSON-RPC errors or `isError: true`; `unknown` for calls interrupted before completion. |
| `request_id` | Generated nonblank UUID correlation, independent of client-supplied IDs and metadata, at most 255 characters. |
| `http_status` | Synthesized stdio status: `200` for completed protocol responses, including validation errors, unknown tools, and `isError` business/thrown errors; `500` for SDK internal errors, response-delivery failures, or incomplete calls at disconnect. It is not the business API's HTTP status. |
| `duration_ms` | Nonnegative integer elapsed dispatch time from a monotonic clock, through response delivery or disconnect. |

No arguments, journal content, resources, results, error messages, or client metadata enter the usage payload. Capture retains at most 128 active call records. Delivery retains at most 64 events total, sends at most two requests concurrently, bounds each event to 2048 bytes, and uses a 1500 ms deadline including connection and response headers. Response bodies are destroyed at the headers and never buffered. Delivery runs asynchronously and does not delay business responses. Diagnostics use stderr with fixed messages and are emitted once per failure category. EOF, SIGINT, and SIGTERM drain queued events for at most 2000 ms before remaining deliveries are aborted; immediately queued events receive a delivery opportunity. Capacity overflow, shutdown deadlines, and abrupt termination can lose events.

The credential/configuration delivery page is currently unauthenticated. This opt-in flag cannot establish user identity or secure credential delivery. Deployment should address that delivery limitation separately; relay attribution relies on server-side authentication of `API_TOKEN`, never client-supplied identity fields.

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

### Stdio System Checks

```bash
npm run test:system
```

Builds the package and spawns actual stdio MCP processes against a local fake Time-Off collector. Covers enabled/disabled capture, discovery and resource exclusions, successful calls, unknown and invalid tool calls, validation and business failures, relay rejections/redirects/resets/timeouts, unbounded response bodies, shutdown drain, interrupted calls, capacity pressure, payload privacy, and required startup configuration. No production API or analytics service is contacted.

## License

MIT License

## Contributions

Welcome to submit Issues and and Pull Requests to improve this project.
