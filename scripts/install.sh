#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
NPM_PACKAGE="@feedmob/sensor-tower-reporting"
SERVER_KEY="sensor-tower-reporting"

# ============================================================================
# Helper Functions
# ============================================================================

print_banner() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║                                                            ║"
  echo "║     FeedMob MCP Server Installation Tool (Sensor Tower)    ║"
  echo "║                                                            ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

print_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ============================================================================
# Environment Checks
# ============================================================================

check_system() {
  print_section "Step 1: System Environment Check"

  # Check macOS
  if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script only supports macOS. Your system is: $OSTYPE"
    exit 1
  fi
  print_success "macOS system check passed"

  # Check Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js not detected. Please install it first."
    echo ""
    echo "Recommended installation via Homebrew:"
    echo -e "  ${YELLOW}brew install node${NC}"
    echo ""
    exit 1
  fi

  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ $NODE_VERSION -lt 18 ]]; then
    print_error "Node.js version too old ($NODE_VERSION). Required: >= 18"
    echo ""
    echo "Please upgrade Node.js:"
    echo -e "  ${YELLOW}brew upgrade node${NC}"
    echo ""
    exit 1
  fi
  print_success "Node.js version check passed (v$(node -v))"

  # Check jq (required for JSON manipulation)
  if ! command -v jq &> /dev/null; then
    print_error "jq not detected. Please install it first."
    echo ""
    echo "Recommended installation via Homebrew:"
    echo -e "  ${YELLOW}brew install jq${NC}"
    echo ""
    exit 1
  fi
  print_success "jq installation check passed"

  # Find npx path
  NPX_PATH=""
  for candidate in /opt/homebrew/bin/npx /usr/local/bin/npx $(which npx 2>/dev/null); do
    if [ -x "$candidate" ]; then
      NPX_PATH="$candidate"
      break
    fi
  done

  if [ -z "$NPX_PATH" ]; then
    print_error "npx not found. Please ensure Node.js is properly installed."
    exit 1
  fi
  print_success "npx path: $NPX_PATH"
}

check_claude_desktop() {
  print_section "Step 2: Claude Desktop Configuration Check"

  # Check if Claude Desktop config exists
  if [ ! -f "$CONFIG_FILE" ]; then
    print_warning "Claude Desktop config file not found. Creating new file."
    mkdir -p "$(dirname "$CONFIG_FILE")"
    echo '{"mcpServers": {}}' > "$CONFIG_FILE"
    print_success "Config file created: $CONFIG_FILE"
  else
    print_success "Config file found: $CONFIG_FILE"
  fi

  # Validate JSON format
  if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    print_error "Config file has invalid JSON format"
    echo ""
    echo "Diagnostic info:"
    jq empty "$CONFIG_FILE" 2>&1 | sed 's/^/  /'
    exit 1
  fi
  print_success "Config file JSON format is valid"
}

# ============================================================================
# Collect Environment Variables
# ============================================================================

collect_env_vars() {
  print_section "Step 3: Configure Sensor Tower"

  # AUTH_TOKEN (required, hidden)
  while true; do
    echo -n -e "${YELLOW}Enter AUTH_TOKEN (required, input will be hidden):${NC} "
    read -s AUTH_TOKEN < /dev/tty
    echo ""

    if [ -z "$AUTH_TOKEN" ]; then
      print_error "AUTH_TOKEN cannot be empty. Please try again."
      echo ""
      continue
    fi

    # Display masked token for confirmation (show last 3 characters)
    TOKEN_LENGTH=${#AUTH_TOKEN}
    if [ $TOKEN_LENGTH -le 3 ]; then
      MASKED_TOKEN="$AUTH_TOKEN"
    else
      MASK_COUNT=$((TOKEN_LENGTH - 3))
      MASKED_PREFIX=$(printf '•%.0s' $(seq 1 $MASK_COUNT))
      LAST_3="${AUTH_TOKEN: -3}"
      MASKED_TOKEN="$MASKED_PREFIX$LAST_3"
    fi

    echo -e "${GREEN}✓ AUTH_TOKEN entered: $MASKED_TOKEN${NC}"
    break
  done

  # SENSOR_TOWER_BASE_URL (use default, no prompt)
  SENSOR_TOWER_BASE_URL="https://api.sensortower.com"
  print_success "SENSOR_TOWER_BASE_URL: $SENSOR_TOWER_BASE_URL (default)"
}

# ============================================================================
# Preview & Confirmation
# ============================================================================

show_preview() {
  print_section "Step 4: Installation Preview"

  # Check if server already exists
  if jq -e ".mcpServers[\"$SERVER_KEY\"]" "$CONFIG_FILE" >/dev/null 2>&1; then
    print_warning "Sensor Tower is already configured. It will be overwritten."
    echo ""
  fi

  echo "The following will be added/updated to Claude Desktop config:"
  echo ""
  echo -e "${BLUE}Server name:${NC} $SERVER_KEY"
  echo -e "${BLUE}npm package:${NC} $NPM_PACKAGE"
  echo -e "${BLUE}Command:${NC} npx"
  echo -e "${BLUE}Args:${NC} ['-y', '$NPM_PACKAGE']"
  echo -e "${BLUE}Environment variables:${NC}"
  echo "  - AUTH_TOKEN: $MASKED_TOKEN"
  echo "  - SENSOR_TOWER_BASE_URL: $SENSOR_TOWER_BASE_URL"
  echo "  - PATH: /opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
  echo ""

  echo -n "Confirm installation? (y/n): "
  read -r CONFIRM < /dev/tty
  if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    print_error "Installation cancelled by user"
    exit 0
  fi
}

# ============================================================================
# Backup & Install
# ============================================================================

backup_config() {
  print_section "Step 5: Backing up existing configuration"

  BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$CONFIG_FILE" "$BACKUP_FILE"
  print_success "Config file backed up to: $BACKUP_FILE"
  echo "To restore: cp $BACKUP_FILE $CONFIG_FILE"
}

update_config() {
  print_section "Step 6: Updating configuration file"

  TMP_FILE=$(mktemp)
  trap "rm -f '$TMP_FILE' '${TMP_FILE}.new'" EXIT

  cp "$CONFIG_FILE" "$TMP_FILE"

  # Use jq to safely merge JSON configs
  # jq --arg automatically escapes all special characters
  local jq_output
  jq_output=$(jq \
    --arg key "$SERVER_KEY" \
    --arg cmd "$NPX_PATH" \
    --arg pkg "$NPM_PACKAGE" \
    --arg token "$AUTH_TOKEN" \
    --arg url "$SENSOR_TOWER_BASE_URL" \
    '.mcpServers[$key] = {
      "command": $cmd,
      "args": ["-y", $pkg],
      "env": {
        "AUTH_TOKEN": $token,
        "SENSOR_TOWER_BASE_URL": $url,
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }' "$TMP_FILE" 2>&1) || {
    print_error "Config generation failed"
    echo ""
    echo "Diagnostic info:"
    echo "$jq_output" | sed 's/^/  /'
    exit 1
  }

  echo "$jq_output" > "${TMP_FILE}.new"

  # Validate generated JSON format
  if ! jq empty "${TMP_FILE}.new" 2>/dev/null; then
    print_error "Generated config file has invalid JSON format"
    echo ""
    echo "Diagnostic info:"
    jq empty "${TMP_FILE}.new" 2>&1 | sed 's/^/  /'
    exit 1
  fi

  # Replace original config with validated new config
  mv "${TMP_FILE}.new" "$CONFIG_FILE"
  print_success "Config file updated successfully"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  print_banner

  check_system
  check_claude_desktop
  collect_env_vars
  show_preview
  backup_config
  update_config

  print_section "Installation Complete!"
  echo -e "${GREEN}Sensor Tower MCP Server has been successfully installed${NC}"
  echo ""
  echo "Next steps:"
  echo -e "  ${YELLOW}1. Fully quit Claude Desktop (make sure it's completely closed)${NC}"
  echo -e "  ${YELLOW}2. Reopen Claude Desktop${NC}"
  echo ""
  echo "To verify the installation:"
  echo "  Check the tools list in Claude Desktop - you should see Sensor Tower tools"
  echo ""
  print_success "Enjoy using Sensor Tower with Claude!"
}

main
