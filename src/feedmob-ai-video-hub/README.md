# FeedMob AI Video Hub MCP Server

stdio MCP server for managing AI video entries via FeedMob Rails API.

## Setup

```bash
npm install
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FEEDMOB_ACCESS_TOKEN` | Yes | OAuth access token for Rails API |
| `RAILS_BASE_URL` | No | Rails API base URL (default: `https://insights-mcp.feedmob.com`) |

## MCP Client Configuration

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "feedmob-ai-video-hub": {
      "command": "npx",
      "args": ["-y", "@feedmob/ai-video-hub"],
      "env": {
        "FEEDMOB_ACCESS_TOKEN": "your_token_here",
        "RAILS_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Tools

### list_ai_videos

List AI video entries with optional filters.

**Parameters:**
- `client_name` (string, optional): Filter by exact client name
- `creator_id` (number, optional): Filter by creator user id
- `status` (string, optional): `draft`, `reviewing`, `ready`, `archived`
- `title_query` (string, optional): Case-insensitive title search
- `limit` (number, optional): Max results (1-100, default: 25)

### get_ai_video

Fetch a single AI video entry.

**Parameters:**
- `id` (number, required): AI video id

### create_ai_video

Create a new AI video entry. Optionally upload a video file from local filesystem.

**Parameters:**
- `title` (string, required): Video title
- `client_name` (string, required): Client name
- `status` (string, required): `draft`, `reviewing`, `ready`, `archived`
- `duration_seconds` (number, optional): Duration in seconds
- `published_on` (string, optional): ISO date
- `source_research_markdown` (string, optional): Markdown source notes
- `design_rationale_markdown` (string, optional): Markdown design rationale
- `production_notes_markdown` (string, optional): Markdown production notes
- `references` (array, optional): Structured references
- `video_path` (string, optional): Local path to video file to upload

### update_ai_videos

Update one or more AI video entries in bulk. Optionally upload a new video file.

**Parameters:**
- `ids` (number[], required): AI video ids to update
- `status` (string, optional): New workflow status
- `client_name` (string, optional): New client name
- `published_on` (string, optional): ISO date
- `source_research_markdown` (string, optional): Markdown source notes
- `design_rationale_markdown` (string, optional): Markdown design rationale
- `production_notes_markdown` (string, optional): Markdown production notes
- `video_path` (string, optional): Local path to video file to upload

### delete_ai_videos

Delete one or more AI video entries.

**Parameters:**
- `ids` (number[], required): AI video ids to delete

## File Upload Flow

When creating or updating videos with a local file:

1. MCP server reads the local file from `video_path`
2. Uploads file to Rails API (`POST /ai-video-hub/api/videos/upload`)
3. Rails stores file in S3 and returns blob key
4. MCP server calls create/update API with the blob key
5. Rails attaches the uploaded file to the video record
