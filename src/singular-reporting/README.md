# Singular Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for [Singular Reporting](https://support.singular.net/hc/en-us/articles/360045245692-Reporting-API-Reference).


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
      "args": [ "-y", "@feedmob/singular-reporting" ],
      "env": {
        "SINGULAR_API_KEY": "api_key",
        "SINGULAR_API_BASE_URL": "api_base_url"
      }
    }
  }
}
```

## License

MIT
