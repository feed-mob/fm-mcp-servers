# FeedMob Civitai Records MCP Server

Bootstrap skeleton for a Model Context Protocol server that will expose Civitai record workflows via the FeedMob MCP stack. The current implementation ships with a single demo tool so you can verify wiring before adding real integrations.

## Prerequisites
- Node.js 18+
- npm 9+

## Installation
```bash
npm install
```
Run the command inside `src/civitai-records/`. Dependencies are local to this package.

## Available Scripts
- `npm run dev` — start the server with `tsx` for hot reload during development.
- `npm run dev:cli` — enter the FastMCP interactive development CLI.
- `npm run inspect` — open the FastMCP inspector to exercise the server’s tools.
- `npm run build` — compile TypeScript to `dist/` using the shared compiler defaults.
- `npm run start` — execute the compiled server from `dist/server.js` for smoke testing.

## Tools
- `list_demo_records` — returns a small set of placeholder dataset entries so you can validate the transport and output format. Replace this with real tooling once the Civitai integration is ready.

### Environment Variables
Copy `env.sample` to `.env` if you need local configuration:
```bash
cp env.sample .env
```

Add any required secrets as you build out the integration. For example:
- `DATABASE_URL` — connection string for the backing datastore that will hold Civitai records.

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
