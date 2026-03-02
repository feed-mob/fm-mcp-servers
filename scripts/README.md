# Sensor Tower MCP Server Installation Script

> **Status**: MVP v1.0 - Sensor Tower Reporting only. Multi-server support and other enhancements coming in future versions.

This script automates the installation of the FeedMob Sensor Tower MCP Server into Claude Desktop. Both macOS and Windows are supported.

## Prerequisites

| Requirement | macOS | Windows |
|---|---|---|
| **OS Version** | 10.15 or later | Windows 10 or later |
| **Node.js** | >= 18 | >= 18 |
| **npm** | Included with Node.js | Included with Node.js |
| **jq (macOS) / PowerShell (Windows)** | Required | Built-in (5.1+) |
| **Claude Desktop** | Required | Required |

## Quick Start

### macOS

#### Option 1: Run Locally (Recommended)
```bash
bash scripts/install.sh
```

#### Option 2: Download and Run from GitHub
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

### Windows

#### Option 1: Run Locally (Recommended)

Open PowerShell and run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

> **What is `-ExecutionPolicy Bypass`?** By default, Windows prevents unsigned PowerShell scripts from running. The `-ExecutionPolicy Bypass` flag allows this script to run just once without changing your system settings. Your execution policy remains unchanged after the script completes.

#### Option 2: Download and Run from GitHub

```powershell
$scriptUrl = "https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.ps1"
$scriptPath = "$env:TEMP\install.ps1"
Invoke-WebRequest -Uri $scriptUrl -OutFile $scriptPath
powershell -ExecutionPolicy Bypass -File $scriptPath
```

> **Security Note**: Similar to the macOS version, you can:
>
> - **Verify with Git**: Clone the repo and run locally (Option 1)
> - **Pin a specific version**: Replace `main` with a release tag
> - **Review before running**:
>   ```powershell
>   $scriptUrl = "https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.ps1"
>   Invoke-WebRequest -Uri $scriptUrl | Select-Object -ExpandProperty Content | Less
>   # Then copy the URL and download after review
>   ```

#### Alternative: One-Liner with Review

If you want to review the script before running:

```powershell
# Step 1: Download and view
$scriptUrl = "https://raw.githubusercontent.com/feed-mob/fm-mcp-servers/main/scripts/install.ps1"
Invoke-WebRequest -Uri $scriptUrl | Select-Object -ExpandProperty Content

# Step 2: After reviewing, run it
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri $scriptUrl -OutFile $env:TEMP\install.ps1; & $env:TEMP\install.ps1"
```

## What the Script Does

Both the macOS (`install.sh`) and Windows (`install.ps1`) scripts follow the same 6-step process:

1. **Checks your system** for OS, Node.js (>= 18), and npx
2. **Verifies** Claude Desktop configuration file exists and is valid
3. **Prompts you to enter**:
   - `AUTH_TOKEN` (from Sensor Tower, hidden input for security)
4. **Uses default values**:
   - `SENSOR_TOWER_BASE_URL` = `https://api.sensortower.com`
5. **Previews** the changes before applying them and asks for confirmation
6. **Backs up** your existing configuration (with timestamp)
7. **Updates** the Claude Desktop config file with Sensor Tower settings
8. **Guides you** to restart Claude Desktop

## What Gets Configured

The script will add the following to your Claude Desktop configuration:

### macOS (`~/Library/Application Support/Claude/claude_desktop_config.json`)

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

### Windows (`%APPDATA%\Claude\claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "sensor-tower-reporting": {
      "command": "npx",
      "args": ["-y", "@feedmob/sensor-tower-reporting"],
      "env": {
        "AUTH_TOKEN": "your_token_here",
        "SENSOR_TOWER_BASE_URL": "https://api.sensortower.com"
      }
    }
  }
}
```

> **Note**: On Windows, the `PATH` environment variable is not injected by the script since Windows processes inherit the full system PATH automatically. On macOS, it must be explicitly set because Claude Desktop doesn't inherit the shell's PATH.

## Getting AUTH_TOKEN

1. Log in to [Sensor Tower](https://www.sensortower.com/)
2. Go to Settings → API Keys
3. Generate or copy your API authentication token
4. Paste it when the script prompts you

### 🔒 Security Notes

- **Input Handling**:
  - macOS: Your API token is entered interactively (not stored in shell history thanks to `read -s`)
  - Windows: Your API token is entered interactively with `Read-Host -AsSecureString` (not echoed to screen)
- The token is written to `claude_desktop_config.json` which is restricted to user-only permissions
- A backup of your config is created before any changes
- **Never** share your AUTH_TOKEN or commit it to version control
- To revoke your token, visit Sensor Tower's Settings → API Keys and delete it there

## Troubleshooting

### macOS

#### "Command not found: node"

Node.js is not installed. Install it via Homebrew:

```bash
brew install node
```

#### "Node.js version too old"

Upgrade to version 18 or later:

```bash
brew upgrade node
```

#### "npx not found"

Reinstall Node.js:

```bash
brew reinstall node
```

#### "Config file has invalid JSON format"

Your Claude Desktop config file is corrupted. Restore from backup:

```bash
# Find your most recent backup
ls ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup.*

# Restore (replace with actual backup filename)
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup.20240115_120530 \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Windows

#### "Node.js not detected"

Node.js is not installed. Download and install from [nodejs.org](https://nodejs.org/)

After installation, restart PowerShell or Command Prompt so it picks up the new PATH.

#### "Node.js version too old"

Update to version 18 or later from [nodejs.org](https://nodejs.org/)

#### "npx not found"

Reinstall Node.js from [nodejs.org](https://nodejs.org/)

#### "Cannot be loaded because running scripts is disabled"

Your PowerShell execution policy is too restrictive. The script uses `-ExecutionPolicy Bypass` to run just this once. If you're still getting this error:

```powershell
# Check your current policy
Get-ExecutionPolicy

# Temporarily set it to RemoteSigned for the session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Then run the script
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

#### "Config file has invalid JSON format"

Your Claude Desktop config file is corrupted. Restore from backup:

```powershell
# Find your most recent backup
Get-ChildItem -Path "$env:APPDATA\Claude\claude_desktop_config.json.backup.*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Restore (replace with actual backup filename)
Copy-Item -Path "$env:APPDATA\Claude\claude_desktop_config.json.backup.20240115_120530" `
          -Destination "$env:APPDATA\Claude\claude_desktop_config.json" -Force
```

## After Installation

1. **Fully quit Claude Desktop** (macOS: ⌘Q, Windows: Alt+F4 or close from taskbar)
2. **Reopen Claude Desktop**
3. You should see Sensor Tower tools available in Claude Desktop

## Manual Configuration

### macOS

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

### Windows

If you prefer to configure manually, edit:

```
%APPDATA%\Claude\claude_desktop_config.json
```

Which typically expands to:

```
C:\Users\YourUsername\AppData\Roaming\Claude\claude_desktop_config.json
```

And add this to the `mcpServers` section:

```json
"sensor-tower-reporting": {
  "command": "npx",
  "args": ["-y", "@feedmob/sensor-tower-reporting"],
  "env": {
    "AUTH_TOKEN": "your_token_here",
    "SENSOR_TOWER_BASE_URL": "https://api.sensortower.com"
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
- One-line installation from web (curl | bash on macOS, irm | iex on Windows)
