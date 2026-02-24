# FeedMob GitHub Issues MCP Server

A GitHub Issues MCP server customized for the FeedMob team.

## Prerequisites
- Node.js 18+
- npm 9+

## Installation
Run inside `src/github-issues/`:

```bash
npm install
npm run build
```

## MCP Server Configuration Guide

### Environment Variables

- `GITHUB_PERSONAL_ACCESS_TOKEN`:
  - Recommended for all GitHub operations.
  - Required for private repositories and write actions (`create_issue`, `update_issue`, `add_issue_comment`).
- `GITHUB_DEFAULT_OWNER`:
  - Optional default owner for issue create/update flows.
  - Can be omitted if you always pass `owner` explicitly in tool input.
- `AI_API_URL`:
  - Required by FeedMob API-backed features:
    - `search_issues`
    - `get_issues`
    - `sync_latest_issues`
    - resource `issues/search_schema`
- `AI_API_TOKEN`:
  - Bearer token for the FeedMob API above.

### Example MCP Client Config (stdio)

**Recommended (avoids completions capability issue):** run from the built artifact when you have the repo. After `npm run build` in `src/github-issues/`:

```json
{
  "mcpServers": {
    "feedmob-github-issues": {
      "command": "node",
      "args": ["/absolute/path/to/fm-mcp-servers/src/github-issues/dist/index.js"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxx",
        "GITHUB_DEFAULT_OWNER": "feedmob",
        "AI_API_URL": "https://your-feedmob-api.example.com",
        "AI_API_TOKEN": "your-feedmob-api-token"
      }
    }
  }
}
```

Alternatively, use `npx` (do **not** use `npm install -g @feedmob/github-issues`; global install ignores the package’s SDK override and can cause the “Server does not support completions” error):

```json
{
  "mcpServers": {
    "feedmob-github-issues": {
      "command": "npx",
      "args": ["-y", "@feedmob/github-issues"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxx",
        "GITHUB_DEFAULT_OWNER": "feedmob",
        "AI_API_URL": "https://your-feedmob-api.example.com",
        "AI_API_TOKEN": "your-feedmob-api-token"
      }
    }
  }
}
```

### Local Development Run (without build)

From repo root:

```bash
npx tsx src/github-issues/index.ts
```

Or from `src/github-issues`:

```bash
npx tsx index.ts
```

## Tools

### `search_issues`
- Search GitHub issues through FeedMob API.
- Input parameters:
  - `scheam` (string, required): Get from resource `issues/search_schema`.
  - `start_date` (string): Issue creation start date.
  - `end_date` (string): Issue creation end date.
  - `status` (optional string): For example `open`, `closed`.
  - `repo` (optional string)
  - `users` (optional string[]): User list.
  - `team` (optional string): For example `Star`, `Mighty`.
  - `title` (optional string): Fuzzy title match.
  - `labels` (optional string[]): Labels filter.
  - `score_status` (optional string)
  - `fields` (string[], required): Response fields to return.

### `create_issue`
- Create a new issue in a GitHub repository.
- Input parameters:
  - `owner` (optional string): Repository owner. Falls back to `GITHUB_DEFAULT_OWNER`.
  - `repo` (string, required): Repository name.
  - `title` (string, required): Issue title.
  - `body` (optional string): Issue description.
  - `assignees` (optional string[]): Usernames to assign.
  - `labels` (optional string[]): Labels to add.
  - `milestone` (optional number): Milestone number.

### `update_issue`
- Update an existing issue in a GitHub repository.
- Input parameters:
  - `owner` (string, required): Repository owner.
  - `repo` (string, required): Repository name.
  - `issue_number` (number, required): Issue number to update.
  - `title` (optional string): New title.
  - `body` (optional string): New description.
  - `state` (optional string): `open` or `closed`.
  - `labels` (optional string[]): New labels.
  - `assignees` (optional string[]): New assignees.
  - `milestone` (optional number): New milestone number.

### `get_issues`
- Fetch comments for multiple issues in bulk through FeedMob API.
- Input parameters:
  - `repo_issues` (array, required): Each item includes `repo` and `issue_number`.
  - `comment_count` (string, optional): `all` or a specific count.

### `add_issue_comment`
- Add a comment to an existing issue.
- Input parameters:
  - `owner` (string, required): Repository owner.
  - `repo` (string, required): Repository name.
  - `issue_number` (number, required): Issue number.
  - `body` (string, required): Comment content.

### `sync_latest_issues`
- Sync latest issues data from FeedMob API.

## Resources

### `issues/search_schema`
- Provides the schema definition for `search_issues`.

## Troubleshooting

### `Server does not support completions (required for completion/complete)`

Cursor (and other MCP clients using protocol 2025-11-25) may request the `completion/complete` capability. FastMCP 2.1 uses `@modelcontextprotocol/sdk`; SDK **1.22.0+** requires the server to advertise the completions capability when registering a completion handler, but FastMCP does not set it, so the server crashes on start.

**Fix:**

1. **Preferred:** Run from the repo so the package’s SDK pin is used. In Cursor MCP config, use the built server instead of `npx` or a global install:
   ```json
   "command": "node",
   "args": ["/absolute/path/to/fm-mcp-servers/src/github-issues/dist/index.js"]
   ```
   Run `npm install` and `npm run build` in `src/github-issues/` first.

2. **If you use npx:** Avoid `npm install -g @feedmob/github-issues`. npm applies `overrides` only from the root project; a global install has no root `package.json`, so the pin is ignored and the crash can occur. Use `npx -y @feedmob/github-issues` (npx uses the package as root so the override applies), or switch to the local path above.

3. **Local dev:** This package pins the SDK to **1.21.2** via `overrides` and a direct dependency. After pulling, run `npm install` in `src/github-issues/` so the pin is applied.

### `SyntaxError: Unexpected token ':'` with JSON on stdin

If you see Node parsing the MCP `initialize` JSON as JavaScript (e.g. `Expected ';', '}' or <eof>`), the process is likely being run with **stdin as script** (e.g. `node -`). The server must be started with **stdio** so that stdin is the MCP channel, not script input. In Cursor MCP config, use a plain command such as `node /absolute/path/to/dist/index.js` or `npx -y @feedmob/github-issues` with no `-` or stdin-eval.
