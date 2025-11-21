# FeedMob Direct Spend Visualizer – n8n Nodes

These community nodes wrap the FeedMob Claude Agent plugin (“direct spend visualizer”) so that n8n workflows can trigger Claude via AWS Bedrock, run FeedMob’s MCP-aware skill, and emit chart-ready direct spend insights without writing custom code.

## Requirements

1. `npm install` automatically clones [`feed-mob/claude-code-marketplace`](https://github.com/feed-mob/claude-code-marketplace) into `vendor/claude-code-marketplace`. Ensure `git` is on the host; rerun `npm install` (or `node scripts/setup-plugin.js`) anytime you need the latest plugin changes.
2. FeedMob MCP credentials (`FEEDMOB_KEY`, `FEEDMOB_SECRET`, `FEEDMOB_API_BASE`) are required. Generate keys at [FeedMob Admin → API Keys](https://admin.feedmob.com/api_keys).
3. Supply AWS Bedrock credentials with access to Anthropic Claude models (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). The node sets `CLAUDE_CODE_USE_BEDROCK=1` and uses your configured model IDs.

## Local development

```bash
cd src/n8n-nodes-feedmob-direct-spend-visualizer
npm install
npm run build
npm link --global  # optional, makes this package available to n8n for local testing
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
| AWS Region | Defaults to `us-east-1`. Region used for Bedrock Claude. |
| AWS Access Key ID | Required. Must have permissions to invoke Anthropic models via Bedrock. |
| AWS Secret Access Key | Required. Secret for the above key. |
| FeedMob Key | Required. Exported to `FEEDMOB_KEY` for the plugin’s MCP server (create via https://admin.feedmob.com/api_keys). |
| FeedMob Secret | Required. Exported to `FEEDMOB_SECRET` (create via https://admin.feedmob.com/api_keys). |
| FeedMob API Base | Required. Exported to `FEEDMOB_API_BASE`. |
| Anthropic Model (primary) | Defaults to `us.anthropic.claude-sonnet-4-20250514-v1:0`. |
| Anthropic Model (fast) | Defaults to `us.anthropic.claude-3-5-haiku-20241022-v1:0`. |

## Supported operations

| Operation | Description |
| --- | --- |
| **Visualize Spend** | Provide `start_date`, `end_date`, and `click_url_id`. The node loads `vendor/claude-code-marketplace/plugins/direct-spend-visualizer`, starts the Claude Agent SDK (with `allowedTools: ["Skill","mcp__plugin_direct-spend-visualizer_feedmob__get_direct_spends"]`), and returns the skill’s ASCII chart plus JSON (status, summary, data). |

## Troubleshooting tips

* The plugin is bundled under `vendor/claude-code-marketplace/plugins/direct-spend-visualizer`. If it’s missing or out of date, rerun `npm install` or execute `node scripts/setup-plugin.js`.
* The Agent SDK call whitelists the FeedMob MCP tool (`mcp__plugin_direct-spend-visualizer_feedmob__get_direct_spends`) so it can access the API without prompting. Ensure your FeedMob credentials are valid or the tool will fail with a permission error.
* Max turns default to 50 to give Claude enough room to fetch data, render ASCII charts, and format the JSON output. Lower this in the node settings if you need faster runs.

## Scripts

* `npm run build` – compile TypeScript and copy the SVG icon into `dist/`.
* `npm run dev` – run TypeScript in watch mode during development.
* `node scripts/setup-plugin.js` – reclone or refresh the FeedMob plugin marketplace (normally run for you during `npm install`).

## Testing the node locally

Follow the official n8n guidance for [running custom nodes locally](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/):

1. **Install n8n globally**
   ```bash
   npm install -g n8n
   ```

2. **Build and publish the node locally**
   ```bash
   # inside this package
   npm install
   npm run build
   npm link
   ```

3. **Link the node into your local n8n installation**
   ```bash
   # Cd into your n8n custom nodes directory
   # e.g. ~/.n8n/custom or ~/.n8n/<CUSTOM_NAME> if N8N_CUSTOM_EXTENSIONS was set
   npm link @feedmob/n8n-nodes-feedmob-direct-spend-visualizer
   ```

   > If `~/.n8n/custom` doesn’t exist, create it manually and run `npm init` before linking.

4. **Start n8n**
   ```bash
   n8n start
   ```

5. **Open the UI** (usually http://localhost:5678) and search for “Direct Spend Visualizer” in the node panel. Remember to search by *node name*, not package name.

Ensure the required environment variables (AWS credentials, FeedMob API credentials) are available to the n8n process while testing so the Claude Agent SDK can authenticate with Bedrock and FeedMob.

## License

MIT
