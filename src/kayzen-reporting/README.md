# Kayzen Reporting MCP Server

## Install with Claude Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | bash -s -- kayzen-reporting
```

Pin a specific release:

```bash
FM_MCP_INSTALL_REF=v1.0.0 \
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/v1.0.0/scripts/install.sh | bash -s -- kayzen-reporting
```

Node.js server implementing Model Context Protocol (MCP) for [Kayzen Reporting API](https://developers.kayzen.io/reference/list-reports).


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
    "kayzen": {
      "command": "npx",
      "args": [ "-y", "@feedmob/kayzen-reporting" ],
      "env": {
        "KAYZEN_USERNAME": "user_email",
        "KAYZEN_PASSWORD": "user_password",
        "KAYZEN_BASIC_AUTH": "baisc_auth_token"
      }
    }
  }
}
```

## License

MIT
