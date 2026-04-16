# Jampp Reporting MCP Server

## Install with Claude Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | bash -s -- jampp-reporting
```

Pin a specific release:

```bash
FM_MCP_INSTALL_REF=v1.0.0 \
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/v1.0.0/scripts/install.sh | bash -s -- jampp-reporting
```

Node.js server implementing Model Context Protocol (MCP) for [Jampp Reporting API](https://developers.jampp.com/docs/reporting-api).


## Usage with Claude Desktop

1. Make sure you have installed and updated to the latest version of Claude for Desktop.
2. Open the Claude for Desktop configuration file:
- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
- Windows: %APPDATA%\Claude\claude_desktop_config.json
3. Add the Jampp MCP server to the configuration:

### NPX

```json
{
  "mcpServers": {
    "jampp": {
      "command": "npx",
      "args": [ "-y", "@feedmob/jampp-reporting" ],
      "env": {
        "JAMPP_CLIENT_ID": "your_client_id",
        "JAMPP_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## License

MIT
