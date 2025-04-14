# Jampp Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for filesystem operations.


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
      "args": [ "-y", "@feedmob/jayzen-reporting" ],
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
