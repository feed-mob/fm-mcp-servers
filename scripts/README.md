# Sensor Tower MCP Server Installation Script

> **Status**: MVP v1.0 - Sensor Tower Reporting only. Multi-server support and other enhancements coming in future versions.

This script automates the installation of the FeedMob Sensor Tower MCP Server into Claude Desktop.

## Prerequisites

- **macOS** (10.15 or later)
- **Node.js** (>= 18)
- **npm** (comes with Node.js)
- **Claude Desktop** (installed)

## Quick Start

### Option 1: Run Locally (Recommended)
```bash
bash scripts/install.sh
```

### Option 2: Download and Run from GitHub
```bash
curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | bash
```

> **Security Note**: The curl method downloads the script from the GitHub repository. For enhanced security, you can:
>
> - **Verify with Git**: Clone the repo and run locally (Option 1)
> - **Pin a specific version**: Replace `main` with a release tag
>   ```bash
>   curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/v1.0.0/scripts/install.sh | bash
>   ```
> - **Review before running**:
>   ```bash
>   curl -fsSL https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.sh | less
>   # Then copy and paste into terminal after review
>   ```

## What the Script Does

1. **Checks your system** for macOS, Node.js (>= 18), and npx
2. **Verifies** Claude Desktop configuration file exists
3. **Prompts you to enter**:
   - `AUTH_TOKEN` (from Sensor Tower, hidden input)
4. **Uses default values**:
   - `SENSOR_TOWER_BASE_URL` = `https://api.sensortower.com`
5. **Previews** the changes before applying them
6. **Backs up** your existing configuration (with timestamp)
7. **Updates** the Claude Desktop config file with Sensor Tower settings
8. **Guides you** to restart Claude Desktop

## What Gets Configured

The script will add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "sensor-tower-reporting": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["-y", "@feedmob/sensor-tower-reporting"],
      "env": {
        "AUTH_TOKEN": "your_token_here",
        "SENSOR_TOWER_BASE_URL": "https://api.sensortower.com",
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

## Getting AUTH_TOKEN

1. Log in to [Sensor Tower](https://www.sensortower.com/)
2. Go to Settings → API Keys
3. Generate or copy your API authentication token
4. Paste it when the script prompts you

### 🔒 Security Notes
- Your API token is entered interactively (not stored in shell history thanks to `read -s`)
- The token is written to `claude_desktop_config.json` which is restricted to user-only permissions
- A backup of your config is created before any changes
- **Never** share your AUTH_TOKEN or commit it to version control
- To revoke your token, visit Sensor Tower's Settings → API Keys and delete it there

## Troubleshooting

### "Command not found: node"

Node.js is not installed. Install it via Homebrew:

```bash
brew install node
```

### "Node.js version too old"

Upgrade to version 18 or later:

```bash
brew upgrade node
```

### "npx not found"

Reinstall Node.js:

```bash
brew reinstall node
```

### "Config file has invalid JSON format"

Your Claude Desktop config file is corrupted. Restore from backup:

```bash
# Find your most recent backup
ls ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup.*

# Restore (replace with actual backup filename)
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup.20240115_120530 \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## After Installation

1. **Fully quit Claude Desktop** (⌘Q or CMD+Q)
2. **Reopen Claude Desktop**
3. You should see Sensor Tower tools available in Claude Desktop

## Manual Configuration

If you prefer to configure manually, edit:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

And add this to the `mcpServers` section:

```json
"sensor-tower-reporting": {
  "command": "/opt/homebrew/bin/npx",
  "args": ["-y", "@feedmob/sensor-tower-reporting"],
  "env": {
    "AUTH_TOKEN": "your_token_here",
    "SENSOR_TOWER_BASE_URL": "https://api.sensortower.com",
    "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
  }
}
```

## Support

For issues or questions:
- Check the [Sensor Tower README](../src/sensor-tower-reporting/README.md)
- Open an issue on GitHub
- Contact the FeedMob team

## Planned Enhancements (v2.0+)

- Support for additional MCP Servers (feedmob-reporting, github-issues, work-journals, etc.)
- Interactive server selection menu for multiple simultaneous installations
- Recommended bundles (e.g., "Reporting Bundle", "Internal Tools Bundle")
- Windows PowerShell support
- One-line installation from web (curl | bash)
