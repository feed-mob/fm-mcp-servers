# FeedMob Civitai Records MCP Server

MCP server for managing Civitai content workflows including prompts, assets (images/videos), and publication records. Tracks the full lifecycle from content generation to Civitai publication with support for many-to-many associations between posts, assets, and prompts.

## Prerequisites
- Node.js 18+
- npm 9+

## Installation
```bash
npm install
```
Run the command inside `src/civitai-records/`. Dependencies are local to this package.

## Local Database
Launch the Postgres container defined in `docker-compose.yml` to apply the init scripts under `infra/db-init`:
```bash
docker compose up -d db
```
Once the container finishes seeding, connect with the seeded sample login (`richard`) to verify access:
```bash
PGPASSWORD=richard_password psql -h localhost -U richard -d civitai
```
Inside the session set the schema search path so you only query the `civitai` schema:
```sql
SET search_path TO civitai;
```

## Available Scripts
- `npm run dev` — start the server with `tsx` for hot reload during development.
- `npm run dev:cli` — enter the FastMCP interactive development CLI.
- `npm run inspect` — open the FastMCP inspector to exercise the server’s tools.
- `npm run build` — compile TypeScript to `dist/` using the shared compiler defaults.
- `npm run start` — execute the compiled server from `dist/server.js` for smoke testing.

## Tools

### Prompt Management
- `create_prompt` — Create a new prompt record with content, model info, purpose, and metadata.

### Asset Management
- `create_asset` — Create a new asset (image/video) record with URI, source, optional input/output prompt associations, and metadata.
- `update_asset_prompt` — Update the input or output prompt association for an existing asset.

### Civitai Post Management
- `create_civitai_post` — Record a new Civitai publication with status, asset reference, title, description, and metadata.
- `update_civitai_post_asset` — Update the primary asset association for an existing Civitai post.
- `create_post_association` — Create many-to-many associations between Civitai posts and assets or prompts.
- `list_civitai_posts` — Query Civitai posts with filtering by civitai_id, asset_id, asset_type, status, created_by, or time range. Supports pagination and optional detailed asset/prompt inclusion.

### Environment Variables
Copy `env.sample` to `.env` if you need local configuration:
```bash
cp env.sample .env
```

Add any required secrets as you build out the integration. Currently required:
- `DATABASE_URL` — PostgreSQL connection string for the Civitai records database (format: `postgres://user:password@host:5432/database`).

The server automatically loads `.env` via `dotenv` for all npm scripts.

## Usage with Claude Desktop
Add the server to your Claude configuration to expose the tools to Claude:
```json
{
  "mcpServers": {
    "feedmob-civitai-records": {
      "command": "npx",
      "args": ["-y", "@feedmob/civitai-records"],
      "transport": "stdio",
      "env": {
        "DATABASE_URL": "postgres://user:password@host:5432/database"
      }
    }
  }
}
```
Adjust the `args` if you run from a local path or different entry point.

## Development Notes
- Implement new tooling in `src/tools/` and register each tool via `src/server.ts`.
- Protect external inputs with `zod` schemas and emit helpful error messages.
- Co-locate tests beside the code (for example, `src/tools/__tests__/records.test.ts`) and wire `npm test` once coverage exists.
- Load secrets from environment variables instead of hardcoding them.
