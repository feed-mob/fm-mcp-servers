#Requires -Version 5.1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ConfigFile = "$env:APPDATA\Claude\claude_desktop_config.json"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServersDir = Join-Path $ScriptDir "servers"
$ServerKey = $args[0]

$script:Metadata = $null
$script:NpxPath = $null

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

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Usage {
    Write-Host "FeedMob MCP Installer"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\install.ps1 <server-key>"
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\install.ps1 --list"
}

function Show-ServerList {
    Write-Section "Available MCP Servers"
    Get-ChildItem -Path $ServersDir -Filter *.json | Sort-Object Name | ForEach-Object {
        $metadata = Get-Content -Path $_.FullName -Raw | ConvertFrom-Json
        Write-Host "  - $($metadata.serverKey)"
        Write-Host "    $($metadata.displayName) ($($metadata.packageName))"
    }
}

function Initialize-Metadata {
    if (-not $ServerKey) {
        Show-Usage
        exit 1
    }

    if ($ServerKey -eq "--list") {
        Show-ServerList
        exit 0
    }

    $metadataFile = Join-Path $ServersDir "$ServerKey.json"
    if (-not (Test-Path $metadataFile)) {
        Write-Error-Custom "Unknown server: $ServerKey"
        Write-Host ""
        Show-Usage
        Write-Host ""
        Show-ServerList
        exit 1
    }

    $script:Metadata = Get-Content -Path $metadataFile -Raw | ConvertFrom-Json
}

function Write-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host ("║ {0,-58} ║" -f "FeedMob MCP Installer") -ForegroundColor Cyan
    Write-Host ("║ {0,-58} ║" -f $Metadata.displayName) -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-DeprecationNotice {
    if (($Metadata.PSObject.Properties.Name -contains "deprecated") -and $Metadata.deprecated) {
        Write-Warning-Custom "$($Metadata.displayName) is deprecated."
        if (($Metadata.PSObject.Properties.Name -contains "migrationUrl") -and $Metadata.migrationUrl) {
            Write-Host "  Migrate to: $($Metadata.migrationUrl)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

function Test-System {
    Write-Section "Step 1: System Environment Check"

    try {
        $nodeVersion = & node -v
    } catch {
        Write-Error-Custom "Node.js not detected. Please install it first."
        exit 1
    }

    $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajorVersion -lt 18) {
        Write-Error-Custom "Node.js version too old ($nodeVersion). Required: >= 18"
        exit 1
    }
    Write-Success "Node.js version check passed ($nodeVersion)"

    $npxCandidates = @(
        "C:\Program Files\nodejs\npx.cmd",
        "C:\Program Files (x86)\nodejs\npx.cmd",
        "$env:APPDATA\nvm\npx.cmd",
        "$env:APPDATA\npm\npx.cmd"
    )

    foreach ($candidate in $npxCandidates) {
        if (Test-Path $candidate) {
            $script:NpxPath = $candidate
            break
        }
    }

    if (-not $script:NpxPath) {
        try {
            $script:NpxPath = (Get-Command npx -ErrorAction Stop).Source
        } catch {
            Write-Error-Custom "npx not found. Please ensure Node.js is properly installed."
            exit 1
        }
    }

    Write-Success "npx path: $script:NpxPath"
}

function Test-ClaudeDesktop {
    Write-Section "Step 2: Claude Desktop Configuration Check"

    if (-not (Test-Path $ConfigFile)) {
        Write-Warning-Custom "Claude Desktop config file not found. Creating new file."
        $configDir = Split-Path $ConfigFile
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }
        @{ mcpServers = @{} } | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigFile -Encoding UTF8
        Write-Success "Config file created: $ConfigFile"
    } else {
        Write-Success "Config file found: $ConfigFile"
    }

    try {
        $null = Get-Content -Path $ConfigFile -Raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Write-Error-Custom "Config file has invalid JSON format"
        Write-Host $_
        exit 1
    }

    Write-Success "Config file JSON format is valid"
}

function Mask-Value {
    param([string]$Value)

    if ([string]::IsNullOrEmpty($Value)) {
        return "(empty)"
    }

    if ($Value.Length -le 3) {
        return $Value
    }

    $maskCount = $Value.Length - 3
    return ('•' * $maskCount) + $Value.Substring($Value.Length - 3, 3)
}

function Read-EnvValue {
    param([object]$Item)

    Write-Section "Configure $($Item.name)"
    if ($Item.description) {
        Write-Host $Item.description
        Write-Host ""
    }

    if ($Item.multiline) {
        Write-Error-Custom "multiline env is not supported yet in Windows installer: $($Item.name)"
        exit 1
    }

    $required = if ($Item.required) { "required" } else { "optional" }
    if ($Item.PSObject.Properties.Name -contains "default" -and $Item.default) {
        $required = "$required, default: $($Item.default)"
    }

    while ($true) {
        if ($Item.secret) {
            $secureValue = Read-Host "Enter $($Item.name) ($required)" -AsSecureString
            $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secureValue)
            try {
                $value = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
            } finally {
                [System.Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($ptr)
            }
        } else {
            $value = Read-Host "Enter $($Item.name) ($required)"
        }

        if ([string]::IsNullOrEmpty($value) -and ($Item.PSObject.Properties.Name -contains "default") -and $Item.default) {
            $value = [string]$Item.default
        }

        if ([string]::IsNullOrEmpty($value) -and $Item.required) {
            Write-Error-Custom "$($Item.name) cannot be empty. Please try again."
            continue
        }

        $display = if ($Item.secret) { Mask-Value -Value $value } elseif ([string]::IsNullOrEmpty($value)) { "(not set)" } else { $value }
        return @{
            Name = [string]$Item.name
            Value = [string]$value
            Display = [string]$display
        }
    }
}

function Get-EnvValues {
    $values = @()

    if (-not $Metadata.env) {
        Write-Section "Step 3: Configure Environment"
        Write-Success "No environment variables required"
        return $values
    }

    foreach ($item in $Metadata.env) {
        $values += Read-EnvValue -Item $item
    }

    return $values
}

function Show-Preview {
    param([array]$EnvValues)

    Write-Section "Step 4: Installation Preview"

    $config = Get-Content -Path $ConfigFile -Raw | ConvertFrom-Json
    if ($config.mcpServers -and $config.mcpServers.PSObject.Properties.Name -contains $Metadata.serverKey) {
        Write-Warning-Custom "$($Metadata.displayName) is already configured. It will be overwritten."
        Write-Host ""
    }

    Write-Host "The following will be added/updated to Claude Desktop config:"
    Write-Host ""
    Write-Host "Server name: $($Metadata.serverKey)"
    Write-Host "Display name: $($Metadata.displayName)"
    Write-Host "npm package: $($Metadata.packageName)"
    Write-Host "Command: $script:NpxPath"
    Write-Host "Args: $($Metadata.command.args -join ' ')"
    Write-Host "Environment variables:"
    foreach ($entry in $EnvValues) {
        Write-Host "  - $($entry.Name): $($entry.Display)"
    }
    Write-Host ""

    $confirm = Read-Host "Confirm installation? (y/n)"
    if ($confirm -notmatch '^[Yy]$') {
        Write-Error-Custom "Installation cancelled by user"
        exit 0
    }
}

function Backup-Config {
    Write-Section "Step 5: Backing up existing configuration"
    $backupFile = "$ConfigFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path $ConfigFile -Destination $backupFile -Force
    Write-Success "Config file backed up to: $backupFile"
}

function Update-Config {
    param([array]$EnvValues)

    Write-Section "Step 6: Updating configuration file"
    $config = Get-Content -Path $ConfigFile -Raw | ConvertFrom-Json

    if (-not $config.mcpServers) {
        $config | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{})
    }

    $envMap = [ordered]@{}
    foreach ($entry in $EnvValues) {
        if (-not [string]::IsNullOrEmpty($entry.Value)) {
            $envMap[$entry.Name] = $entry.Value
        }
    }

    $serverConfig = [ordered]@{
        command = $script:NpxPath
        args = @($Metadata.command.args)
        env = $envMap
    }

    $config.mcpServers | Add-Member -NotePropertyName $Metadata.serverKey -NotePropertyValue ([pscustomobject]$serverConfig) -Force

    $tmpFile = "$ConfigFile.tmp.$([guid]::NewGuid().ToString())"
    try {
        $config | ConvertTo-Json -Depth 10 | Set-Content -Path $tmpFile -Encoding UTF8
        $null = Get-Content -Path $tmpFile -Raw | ConvertFrom-Json
        Move-Item -Path $tmpFile -Destination $ConfigFile -Force
        Write-Success "Config file updated successfully"
    } catch {
        if (Test-Path $tmpFile) {
            Remove-Item -Path $tmpFile -Force
        }
        Write-Error-Custom "Config update failed"
        Write-Host $_
        exit 1
    }
}

function Write-Completion {
    Write-Section "Installation Complete!"
    Write-Host "$($Metadata.displayName) has been successfully installed" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    if ($Metadata.postInstallMessage) {
        foreach ($message in $Metadata.postInstallMessage) {
            Write-Host "  - $message" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  - Fully quit Claude Desktop" -ForegroundColor Yellow
        Write-Host "  - Reopen Claude Desktop" -ForegroundColor Yellow
    }
}

function Main {
    Initialize-Metadata
    Write-Banner
    Write-DeprecationNotice
    Test-System
    Test-ClaudeDesktop
    $envValues = Get-EnvValues
    Show-Preview -EnvValues $envValues
    Backup-Config
    Update-Config -EnvValues $envValues
    Write-Completion
}

Main
