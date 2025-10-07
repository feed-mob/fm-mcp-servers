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
- `crop_and_watermark_image` — calls the Comet Images API to crop an input image to a supported aspect ratio, optionally adds a watermark, and returns the final image URL (ImageKit URL when uploads are enabled, otherwise the generated link).
- `upload_file` — uploads an asset to ImageKit (default provider) using base64 content, a local filesystem path, or a remote URL and returns the resulting links. Files land in the `upload/` folder and include the `upload` tag unless you override those values.

### Environment Variables

#### ImageKit Configuration
- `IMAGEKIT_PRIVATE_KEY` — required for the `upload_file` tool and enables automatic ImageKit uploads from `crop_and_watermark_image`.
  - **Docs**: https://imagekit.io/docs/api-keys
  - Please copy the Private Key

#### Image Generation Provider (Comet API)
- `IMAGE_TOOL_API_KEY` — required for `crop_and_watermark_image`.
  - **Docs**: https://api.cometapi.com/doc
  - Create a new API key
- `IMAGE_TOOL_BASE_URL` — optional override for the image-generation provider base URL; defaults to `https://api.cometapi.com/v1`.
- `IMAGE_TOOL_MODEL_ID` — optional model identifier; defaults to `bytedance-seedream-4-0-250828`.
  - You can switch to another Doubao model listed at https://api.cometapi.com/pricing

#### Alternative Provider: Volcengine Ark (火山方舟)
- `IMAGE_TOOL_BASE_URL` — use `https://ark.cn-beijing.volces.com/api/v3` (change region if needed)
- `IMAGE_TOOL_API_KEY` — get your API key at https://console.volcengine.com/
- `IMAGE_TOOL_MODEL_ID` — recommended: `doubao-seedream-4-0-250828`
  - You can switch to another Doubao model if needed. Find more models at https://www.volcengine.com/docs/82379/1541523

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
? file ./assets/banner.png
? fileName banner.png
? folder /marketing/campaign-2025
```
The tool responds with a JSON summary plus resource links for the uploaded asset and its thumbnail (when provided by ImageKit).

Remote content upload remains supported by supplying the `file` parameter with a remote URL:
```
> upload_file
? provider imagekit
? file https://ik.imagekit.io/demo/sample.jpg
? fileName sample.jpg
```

Unless overridden via the `options` object, uploads default to `useUniqueFileName: true` (avoid filename collisions) and `isPrivateFile: false` (serve public URLs).

## Usage with Claude Desktop
Add the server to your Claude configuration to make the tools available to the assistant:
```json
{
  "mcpServers": {
    "feedmob-imagekit": {
      "command": "npx",
      "args": ["-y", "@feedmob/imagekit"],
      "transport": "stdio",
      "env": {
        "IMAGE_TOOL_API_KEY": "your-image-tool-api-key",
        "IMAGEKIT_PRIVATE_KEY": "your-imagekit-private-key"
      }
    }
  }
}
```
Adjust the `args` to match your installation method (local path, published package, or ts-node entry point).

The server defaults to the Comet Images API (`https://api.cometapi.com/v1`) and bundled model (`bytedance-seedream-4-0-250828`). Optional overrides: add `IMAGE_TOOL_BASE_URL` and `IMAGE_TOOL_MODEL_ID` to the `env` block only when you need to swap API endpoints or models.

Volcengine Ark / 火山方舟 example:
```json
{
  "mcpServers": {
    "feedmob-imagekit": {
      "command": "npx",
      "args": ["-y", "@feedmob/imagekit"],
      "transport": "stdio",
      "env": {
        "IMAGE_TOOL_API_KEY": "your-ark-api-key",
        "IMAGE_TOOL_BASE_URL": "https://ark.cn-beijing.volces.com/api/v3",
        "IMAGE_TOOL_MODEL_ID": "doubao-seedream-4-0-250828",
        "IMAGEKIT_PRIVATE_KEY": "your-imagekit-private-key"
      }
    }
  }
}
```

## Development Notes
- Implement new tooling in `src/tools/` and register it through `src/server.ts`; guard external inputs with `zod` schemas.
- Co-locate any tests alongside the code (for example, `src/__tests__/upload.test.ts`) and wire `npm test` when the suite exists.
- Keep environment-specific values outside the codebase; reach for `.env` files consumed via `dotenv` if future tools require credentials.
