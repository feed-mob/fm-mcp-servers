# FeedMob Direct Spend Visualizer – n8n Nodes

These community nodes wrap the FeedMob Claude Agent plugin (“direct spend visualizer”) so that n8n workflows can trigger Anthropic’s Agent SDK, run the plugin’s agent skills, and emit chart-ready insights about direct spends.

## Requirements

1. `npm install` automatically clones [`feed-mob/claude-code-marketplace`](https://github.com/feed-mob/claude-code-marketplace) into `vendor/claude-code-marketplace`. Ensure `git` is available on the host.
2. Provide the FeedMob MCP environment variables listed in the plugin README (`FEEDMOB_KEY`, `FEEDMOB_SECRET`, `FEEDMOB_API_BASE`).
3. Supply an Anthropic API key with access to Claude 3.5 models and ensure n8n allows community nodes.

## Local development

```bash
cd src/n8n-nodes-feedmob-direct-spend-visualizer
npm install
npm run build
```

Load the folder as a community node inside your local n8n instance, or publish the package to npm (`@feedmob/n8n-nodes-feedmob-direct-spend-visualizer`) and install it from the UI.

## Installing inside n8n

* **n8n Cloud / UI** – Settings → Community Nodes → Install → enter `@feedmob/n8n-nodes-feedmob-direct-spend-visualizer`.
* **Self-hosted** – include `N8N_COMMUNITY_PACKAGES="@feedmob/n8n-nodes-feedmob-direct-spend-visualizer"` in your process / container env variables.

Make sure community nodes are allowed for your workspace before installing.

## Credentials

Create credentials of type **FeedMob Direct Spend Visualizer** and fill the following fields:

| Field | Description |
| --- | --- |
| Anthropic API Key | Required. Used by the Claude Agent SDK. |
| FeedMob Key | Required. Exported to `FEEDMOB_KEY` for the plugin’s MCP server. |
| FeedMob Secret | Required. Exported to `FEEDMOB_SECRET`. |
| FeedMob API Base | Required. Exported to `FEEDMOB_API_BASE`. |
| Default Claude Model | Optional. Fallback model used when a node does not override the model. |

## Supported operations

| Operation | Description |
| --- | --- |
| **Visualize Spend** | Provide `start_date`, `end_date`, and `click_url_id`. The node loads `vendor/claude-code-marketplace/plugins/direct-spend-visualizer`, calls `query()` with the plugin, and returns the skill output (ASCII chart and JSON). |

## Troubleshooting tips

* The plugin directory is cloned into `vendor/claude-code-marketplace/plugins/direct-spend-visualizer` during installation. Re-run `npm install` (or run `node scripts/setup-plugin.js`) to pull the latest changes.
* Claude Agent skills need the `Skill` tool enabled; the bundled plugin registers it, so the node only needs your credentials and dates.

## Scripts

* `npm run build` – compile TypeScript and copy the SVG icon into `dist/`.
* `npm run dev` – run TypeScript in watch mode during development.

## License

MIT
