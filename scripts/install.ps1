#Requires -Version 5.1
<#
.SYNOPSIS
    FeedMob MCP Server Installation Tool (Windows)

.DESCRIPTION
    Automates the installation of the FeedMob Sensor Tower MCP Server into Claude Desktop on Windows.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\install.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Configuration
$ConfigFile = "$env:APPDATA\Claude\claude_desktop_config.json"
$NPMPackage = "@feedmob/sensor-tower-reporting"
$ServerKey = "sensor-tower-reporting"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "║     FeedMob MCP Server Installation Tool (Sensor Tower)    ║" -ForegroundColor Cyan
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================================
# Environment Checks
# ============================================================================

function Test-System {
    Write-Section "Step 1: System Environment Check"

    # Check Windows
    if ($PSVersionTable.Platform -ne "Win32NT" -and $PSVersionTable.OS -notmatch "Windows") {
        if ($PSVersionTable.PSVersion.Major -lt 5) {
            Write-Error-Custom "PowerShell 5.1 or later required on non-Windows systems"
            exit 1
        }
    }
    Write-Success "Windows system check passed"

    # Check Node.js
    try {
        $nodeCmd = Get-Command node -ErrorAction Stop
        $nodeVersion = & node -v
    } catch {
        Write-Error-Custom "Node.js not detected. Please install it first."
        Write-Host ""
        Write-Host "Download from: https://nodejs.org/"
        Write-Host ""
        exit 1
    }

    $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajorVersion -lt 18) {
        Write-Error-Custom "Node.js version too old ($nodeVersion). Required: >= 18"
        Write-Host ""
        Write-Host "Please upgrade from: https://nodejs.org/"
        Write-Host ""
        exit 1
    }
    Write-Success "Node.js version check passed ($nodeVersion)"

    # Find npx path
    $npxPath = $null
    $npxCandidates = @(
        "C:\Program Files\nodejs\npx.cmd",
        "C:\Program Files (x86)\nodejs\npx.cmd",
        "$env:APPDATA\nvm\npx.cmd",
        "$env:APPDATA\npm\npx.cmd"
    )

    foreach ($candidate in $npxCandidates) {
        if (Test-Path $candidate) {
            $npxPath = $candidate
            break
        }
    }

    if (-not $npxPath) {
        try {
            $npxCmd = Get-Command npx -ErrorAction Stop
            $npxPath = $npxCmd.Source
        } catch {
            Write-Error-Custom "npx not found. Please ensure Node.js is properly installed."
            exit 1
        }
    }

    Write-Success "npx path: $npxPath"
}

function Test-ClaudeDesktop {
    Write-Section "Step 2: Claude Desktop Configuration Check"

    # Check if Claude Desktop config exists
    if (-not (Test-Path $ConfigFile)) {
        Write-Warning-Custom "Claude Desktop config file not found. Creating new file."

        $configDir = Split-Path $ConfigFile
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }

        $defaultConfig = @{
            mcpServers = @{}
        }
        $defaultConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigFile -Encoding UTF8
        Write-Success "Config file created: $ConfigFile"
    } else {
        Write-Success "Config file found: $ConfigFile"
    }

    # Validate JSON format
    try {
        $configContent = Get-Content -Path $ConfigFile -Raw
        $null = $configContent | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Write-Error-Custom "Config file has invalid JSON format"
        Write-Host ""
        Write-Host "Error: $_"
        exit 1
    }

    Write-Success "Config file JSON format is valid"
}

# ============================================================================
# Collect Environment Variables
# ============================================================================

function Get-EnvVars {
    Write-Section "Step 3: Configure Sensor Tower"

    # AUTH_TOKEN (required, hidden)
    while ($true) {
        $secureToken = Read-Host "Enter AUTH_TOKEN (required, input will be hidden)" -AsSecureString

        if ($secureToken.Length -eq 0) {
            Write-Error-Custom "AUTH_TOKEN cannot be empty. Please try again."
            Write-Host ""
            continue
        }

        # Convert SecureString to plaintext
        $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secureToken)
        $script:AuthToken = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

        # Display masked token for confirmation (show last 3 characters)
        $tokenLength = $AuthToken.Length
        if ($tokenLength -le 3) {
            $maskedToken = $AuthToken
        } else {
            $maskCount = $tokenLength - 3
            $maskedPrefix = '•' * $maskCount
            $last3 = $AuthToken.Substring($tokenLength - 3, 3)
            $maskedToken = "$maskedPrefix$last3"
        }

        Write-Host "✓ AUTH_TOKEN entered: $maskedToken" -ForegroundColor Green
        $script:MaskedToken = $maskedToken
        break
    }

    # SENSOR_TOWER_BASE_URL (use default)
    $script:SensorTowerBaseUrl = "https://api.sensortower.com"
    Write-Success "SENSOR_TOWER_BASE_URL: $SensorTowerBaseUrl (default)"
}

# ============================================================================
# Preview & Confirmation
# ============================================================================

function Show-Preview {
    Write-Section "Step 4: Installation Preview"

    # Check if server already exists
    $configContent = Get-Content -Path $ConfigFile -Raw | ConvertFrom-Json
    if ($configContent.mcpServers.PSObject.Properties.Name -contains $ServerKey) {
        Write-Warning-Custom "Sensor Tower is already configured. It will be overwritten."
        Write-Host ""
    }

    Write-Host "The following will be added/updated to Claude Desktop config:"
    Write-Host ""
    Write-Host "Server name:" -ForegroundColor Cyan -NoNewline
    Write-Host " $ServerKey"
    Write-Host "npm package:" -ForegroundColor Cyan -NoNewline
    Write-Host " $NPMPackage"
    Write-Host "Command:" -ForegroundColor Cyan -NoNewline
    Write-Host " npx"
    Write-Host "Args:" -ForegroundColor Cyan -NoNewline
    Write-Host " ['-y', '$NPMPackage']"
    Write-Host "Environment variables:" -ForegroundColor Cyan
    Write-Host "  - AUTH_TOKEN: $MaskedToken"
    Write-Host "  - SENSOR_TOWER_BASE_URL: $SensorTowerBaseUrl"
    Write-Host ""

    $confirm = Read-Host "Confirm installation? (y/n)"
    if ($confirm -notmatch '^[Yy]$') {
        Write-Error-Custom "Installation cancelled by user"
        exit 0
    }
}

# ============================================================================
# Backup & Install
# ============================================================================

function Backup-Config {
    Write-Section "Step 5: Backing up existing configuration"

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$ConfigFile.backup.$timestamp"
    Copy-Item -Path $ConfigFile -Destination $backupFile -Force
    Write-Success "Config file backed up to: $backupFile"
    Write-Host "To restore: copy `"$backupFile`" `"$ConfigFile`""
}

function Update-Config {
    Write-Section "Step 6: Updating configuration file"

    # Read current config
    $configContent = Get-Content -Path $ConfigFile -Raw | ConvertFrom-Json

    # Create server configuration
    $serverConfig = @{
        command = "npx"
        args = @("-y", $NPMPackage)
        env = @{
            AUTH_TOKEN = $AuthToken
            SENSOR_TOWER_BASE_URL = $SensorTowerBaseUrl
        }
    }

    # Add or update server in config
    if ($null -eq $configContent.mcpServers) {
        $configContent | Add-Member -NotePropertyName mcpServers -NotePropertyValue @{}
    }

    $configContent.mcpServers | Add-Member -NotePropertyName $ServerKey -NotePropertyValue $serverConfig -Force

    # Write to temporary file first
    $tmpFile = "$ConfigFile.tmp.$([System.Guid]::NewGuid().ToString())"

    try {
        $configJson = $configContent | ConvertTo-Json -Depth 10
        $configJson | Set-Content -Path $tmpFile -Encoding UTF8

        # Validate generated JSON
        $null = Get-Content -Path $tmpFile -Raw | ConvertFrom-Json

        # Replace original with new config (atomic)
        Move-Item -Path $tmpFile -Destination $ConfigFile -Force

        Write-Success "Config file updated successfully"
    } catch {
        Write-Error-Custom "Config update failed"
        Write-Host ""
        Write-Host "Error: $_"
        if (Test-Path $tmpFile) {
            Remove-Item -Path $tmpFile -Force
        }
        exit 1
    }
}

# ============================================================================
# Main Execution
# ============================================================================

function Main {
    Write-Banner

    Test-System
    Test-ClaudeDesktop
    Get-EnvVars
    Show-Preview
    Backup-Config
    Update-Config

    Write-Section "Installation Complete!"
    Write-Host "Sensor Tower MCP Server has been successfully installed" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  " -NoNewline
    Write-Host "1. Fully quit Claude Desktop (make sure it's completely closed)" -ForegroundColor Yellow
    Write-Host "  " -NoNewline
    Write-Host "2. Reopen Claude Desktop" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To verify the installation:"
    Write-Host "  Check the tools list in Claude Desktop - you should see Sensor Tower tools"
    Write-Host ""
    Write-Success "Enjoy using Sensor Tower with Claude!"
}

Main
