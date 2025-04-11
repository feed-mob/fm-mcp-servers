# Jampp Reporting MCP Server

Node.js server implementing Model Context Protocol (MCP) for filesystem operations.


## Usage with Claude Desktop

1. Make sure you have installed and updated to the latest version of Claude for Desktop.
2. Open the Claude for Desktop configuration file:
- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
- Windows: %APPDATA%\Claude\claude_desktop_config.json
3. Add the Jampp MCP server to the configuration:

### NPX

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


## License

MIT
