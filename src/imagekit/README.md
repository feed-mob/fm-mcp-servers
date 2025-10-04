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

## Tools
- `add` — simple demo helper that sums two numbers and returns the result as a string.
- `crop_and_watermark_image` — calls the Comet Images API to crop an input image to a supported aspect ratio, optionally adds a watermark, and returns the final image URL (ImageKit URL when uploads are enabled, otherwise the generated link).
- `upload_file` — uploads an asset to ImageKit (default provider) using base64 content or a remote URL and returns the resulting links. Files land in the `upload/` folder and include the `upload` tag unless you override those values.

### Environment Variables
- `IMAGE_TOOL_API_KEY` — required for `crop_and_watermark_image`. Provision an API key scoped to image generation.
- `IMAGE_TOOL_BASE_URL` — optional override for the image-generation provider base URL; defaults to `https://api.cometapi.com/v1`.
- `IMAGE_TOOL_MODEL_ID` — optional model identifier; defaults to `bytedance-seedream-4-0-250828`.
- `IMAGEKIT_PRIVATE_KEY` — required for the `upload_file` tool and enables automatic ImageKit uploads from `crop_and_watermark_image`.

Copy `env.sample` to `.env` when developing locally:
```bash
cp env.sample .env
# then edit with your API key
```

The server automatically loads `.env` via `dotenv` when you run any npm script.

#### Provider Example (Volcengine Ark / 火山方舟)
Override the defaults if you want to target Volcengine Ark:
```
IMAGE_TOOL_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
IMAGE_TOOL_API_KEY=your-ark-api-key
IMAGE_TOOL_MODEL_ID=doubao-seedream-4-0-250828
```

### Example Invocation
From the FastMCP inspector:
```
> crop_and_watermark_image
? imageUrl https://example.com/image.png
? aspectRatio 16:9
? watermarkText FeedMob Confidential
```
The tool returns a single URL string pointing to the resulting asset. When ImageKit credentials are configured, the URL references the uploaded asset in ImageKit; otherwise it references the link returned by the generation API.

Upload example:
```
> upload_file
? provider imagekit
? file https://ik.imagekit.io/demo/sample.jpg
? fileName sample.jpg
? folder /marketing/campaign-2025
```
The tool responds with a JSON summary plus resource links for the uploaded asset and its thumbnail (when provided by ImageKit).

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
- Implement new tooling in `src/tools/` and register it through `src/server.ts`; guard external inputs with `zod` schemas.
- Co-locate any tests alongside the code (for example, `src/__tests__/upload.test.ts`) and wire `npm test` when the suite exists.
- Keep environment-specific values outside the codebase; reach for `.env` files consumed via `dotenv` if future tools require credentials.
