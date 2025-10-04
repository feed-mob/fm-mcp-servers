# FeedMob ImageKit MCP Server

Lightweight Model Context Protocol server that exposes ImageKit-related tooling via the FeedMob internal MCP stack. The starter implementation currently publishes a single arithmetic helper and is intended as a template for richer ImageKit automation.

## Prerequisites
- Node.js 18+
- npm 9+

## Installation
```bash
npm install
```
Run the command inside `src/imagekit/`. Dependencies are local to this package.

## Available Scripts
- `npm run dev` — start the server with `tsx` for hot reload during development.
- `npm run dev:cli` — enter the FastMCP interactive development CLI.
- `npm run inspect` — open the FastMCP inspector to exercise the server’s tools.
- `npm run build` — compile TypeScript to `dist/` using the shared root `tsconfig.json`.
- `npm run start` — execute the compiled server from `dist/server.js` for smoke testing.

## Usage with Claude Desktop
Add the server to your Claude configuration to make the tools available to the assistant:
```json
{
  "mcpServers": {
    "feedmob-imagekit": {
      "command": "npx",
      "args": ["-y", "./src/imagekit"],
      "transport": "stdio"
    }
  }
}
```
Adjust the `args` to match your installation method (local path, published package, or ts-node entry point).

## Development Notes
- Implement new tooling in `src/server.ts` and guard external inputs with `zod` schemas.
- Co-locate any tests alongside the code (for example, `src/__tests__/upload.test.ts`) and wire `npm test` when the suite exists.
- Keep environment-specific values outside the codebase; reach for `.env` files consumed via `dotenv` if future tools require credentials.
