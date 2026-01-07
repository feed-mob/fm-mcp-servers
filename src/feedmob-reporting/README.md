# Feedmob Spend MCP Server


## Usage with Claude Desktop

1. Make sure you have installed and updated to the latest version of Claude for Desktop.
2. Open the Claude for Desktop configuration file:
- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
- Windows: %APPDATA%\Claude\claude_desktop_config.json
3. Add the Feedmob Spend MCP server to the configuration:

### NPX


```
cd src/feedmob-reporting && npm run build
```

```json
{
  "mcpServers": {
    "feedmob": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/fm-mcp-servers/src/feedmob-reporting/dist/index.js"
      ],
      "env": {
        "FEEDMOB_KEY": "FEEDMOB_KEY",
        "FEEDMOB_SECRET": "FEEDMOB_SECRET",
        "FEEDMOB_API_BASE": "FEEDMOB_API_BASE"
      }
    }
  }
}

{
  "mcpServers": {
    "feedmob": {
      "type": "stdio",
      "command": "npx",
      "args": [ "-y", "@feedmob/feedmob-reporting" ],
      "env": {
        "FEEDMOB_KEY": "FEEDMOB_KEY",
        "FEEDMOB_SECRET": "FEEDMOB_SECRET",
        "FEEDMOB_API_BASE": "FEEDMOB_API_BASE"
      }
    }
  }
}
```

## License

MIT
