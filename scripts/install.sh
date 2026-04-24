#!/bin/bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
SCRIPT_SOURCE="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"
SERVERS_DIR="$SCRIPT_DIR/servers"
MACOS_PATH_VALUE="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REMOTE_REPO="${FM_MCP_INSTALL_REPO:-feed-mob/fm-mcp-servers}"
REMOTE_REF="${FM_MCP_INSTALL_REF:-main}"
REMOTE_RAW_BASE_URL="https://raw.githubusercontent.com/$REMOTE_REPO/$REMOTE_REF/scripts/servers"
REMOTE_API_URL="https://api.github.com/repos/$REMOTE_REPO/contents/scripts/servers?ref=$REMOTE_REF"

SERVER_KEY="${1:-}"
METADATA_FILE=""
METADATA_TEMP_FILE=""
DISPLAY_NAME=""
PACKAGE_NAME=""
COMMAND_TYPE=""
DEPRECATED="false"
MIGRATION_URL=""
INJECT_PATH="true"
POST_INSTALL_MESSAGES=()
ENV_KEYS=()
ENV_DISPLAY_VALUES=()
NPX_PATH=""
BACKUP_FILE=""

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

usage() {
  cat <<EOF
FeedMob MCP Installer

Usage:
  bash scripts/install.sh <server-key>
  bash scripts/install.sh --list

Examples:
  bash scripts/install.sh sensor-tower-reporting
  bash scripts/install.sh applovin-reporting

Remote install examples:
  curl -fsSL https://raw.githubusercontent.com/$REMOTE_REPO/$REMOTE_REF/scripts/install.sh | bash -s -- --list
  curl -fsSL https://raw.githubusercontent.com/$REMOTE_REPO/$REMOTE_REF/scripts/install.sh | bash -s -- sensor-tower-reporting

Environment overrides:
  FM_MCP_INSTALL_REPO=feed-mob/fm-mcp-servers
  FM_MCP_INSTALL_REF=main
EOF
}

list_servers() {
  print_section "Available MCP Servers"
  if [[ -d "$SERVERS_DIR" ]] && find "$SERVERS_DIR" -maxdepth 1 -name '*.json' 2>/dev/null | grep -q .; then
    while IFS= read -r file; do
      local key name pkg
      key=$(jq -r '.serverKey' "$file")
      name=$(jq -r '.displayName' "$file")
      pkg=$(jq -r '.packageName' "$file")
      echo "  - $key"
      echo "    $name ($pkg)"
    done < <(find "$SERVERS_DIR" -maxdepth 1 -name '*.json' | sort)
    return
  fi

  if ! command -v curl >/dev/null 2>&1; then
    print_error "curl is required to list remote servers"
    exit 1
  fi

  if ! command -v jq >/dev/null 2>&1; then
    print_error "jq is required to list remote servers"
    exit 1
  fi

  print_warning "Local metadata not found. Listing server keys from $REMOTE_REPO@$REMOTE_REF"
  local response
  response=$(curl -fsSL "$REMOTE_API_URL") || {
    print_error "Failed to fetch remote server list"
    exit 1
  }

  if [[ "$(jq -r 'type' <<<"$response")" != "array" ]]; then
    print_error "Unexpected response while fetching remote server list"
    exit 1
  fi

  jq -r '.[] | select(.name | endswith(".json")) | "  - " + (.name | sub("\\.json$"; ""))' <<<"$response"
}

fetch_remote_metadata() {
  if ! command -v curl >/dev/null 2>&1; then
    print_error "curl is required for direct remote installation"
    exit 1
  fi

  METADATA_TEMP_FILE=$(mktemp)
  if ! curl -fsSL "$REMOTE_RAW_BASE_URL/$SERVER_KEY.json" -o "$METADATA_TEMP_FILE"; then
    rm -f "$METADATA_TEMP_FILE"
    METADATA_TEMP_FILE=""
    print_error "Unknown server: $SERVER_KEY"
    echo ""
    usage
    echo ""
    list_servers
    exit 1
  fi

  if ! jq empty "$METADATA_TEMP_FILE" 2>/dev/null; then
    rm -f "$METADATA_TEMP_FILE"
    METADATA_TEMP_FILE=""
    print_error "Fetched metadata is not valid JSON: $SERVER_KEY"
    exit 1
  fi

  METADATA_FILE="$METADATA_TEMP_FILE"
}

validate_args() {
  if [[ -z "$SERVER_KEY" ]]; then
    usage
    exit 1
  fi

  if [[ "$SERVER_KEY" == "--list" ]]; then
    list_servers
    exit 0
  fi

  METADATA_FILE="$SERVERS_DIR/$SERVER_KEY.json"
  if [[ -f "$METADATA_FILE" ]]; then
    return
  fi

  fetch_remote_metadata
}

load_metadata() {
  DISPLAY_NAME=$(jq -r '.displayName' "$METADATA_FILE")
  PACKAGE_NAME=$(jq -r '.packageName' "$METADATA_FILE")
  COMMAND_TYPE=$(jq -r '.command.type' "$METADATA_FILE")
  DEPRECATED=$(jq -r '.deprecated // false' "$METADATA_FILE")
  MIGRATION_URL=$(jq -r '.migrationUrl // empty' "$METADATA_FILE")
  INJECT_PATH=$(jq -r '.macos.injectPath // true' "$METADATA_FILE")

  if [[ "$COMMAND_TYPE" != "npx" ]]; then
    print_error "Unsupported command.type in $METADATA_FILE: $COMMAND_TYPE"
    exit 1
  fi

  POST_INSTALL_MESSAGES=()
  while IFS= read -r message; do
    POST_INSTALL_MESSAGES+=("$message")
  done < <(jq -r '.postInstallMessage[]?' "$METADATA_FILE")
}

print_banner() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════╗"
  printf "║ %-58s ║\n" "FeedMob MCP Installer"
  printf "║ %-58s ║\n" "$DISPLAY_NAME"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_deprecation_notice() {
  if [[ "$DEPRECATED" != "true" ]]; then
    return
  fi

  print_warning "$DISPLAY_NAME is deprecated."
  if [[ -n "$MIGRATION_URL" ]]; then
    echo -e "${YELLOW}  Migrate to: $MIGRATION_URL${NC}"
  fi
  echo ""
}

check_system() {
  print_section "Step 1: System Environment Check"

  if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script only supports macOS. Your system is: $OSTYPE"
    exit 1
  fi
  print_success "macOS system check passed"

  if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js not detected. Please install it first."
    echo "  brew install node"
    exit 1
  fi

  local node_major
  node_major=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ "$node_major" -lt 18 ]]; then
    print_error "Node.js version too old ($(node -v)). Required: >= 18"
    exit 1
  fi
  print_success "Node.js version check passed ($(node -v))"

  if ! command -v jq >/dev/null 2>&1; then
    print_error "jq not detected. Please install it first."
    echo "  brew install jq"
    exit 1
  fi
  print_success "jq installation check passed"

  for candidate in /opt/homebrew/bin/npx /usr/local/bin/npx "$(which npx 2>/dev/null || true)"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      NPX_PATH="$candidate"
      break
    fi
  done

  if [[ -z "$NPX_PATH" ]]; then
    print_error "npx not found. Please ensure Node.js is properly installed."
    exit 1
  fi
  print_success "npx path: $NPX_PATH"
}

check_claude_desktop() {
  print_section "Step 2: Claude Desktop Configuration Check"

  if [[ ! -f "$CONFIG_FILE" ]]; then
    print_warning "Claude Desktop config file not found. Creating new file."
    mkdir -p "$(dirname "$CONFIG_FILE")"
    echo '{"mcpServers": {}}' > "$CONFIG_FILE"
    print_success "Config file created: $CONFIG_FILE"
  else
    print_success "Config file found: $CONFIG_FILE"
  fi

  if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    print_error "Config file has invalid JSON format"
    jq empty "$CONFIG_FILE" 2>&1 | sed 's/^/  /'
    exit 1
  fi
  print_success "Config file JSON format is valid"
}

mask_value() {
  local value="$1"
  if [[ -z "$value" ]]; then
    echo "(empty)"
    return
  fi

  local length=${#value}
  if [[ "$length" -le 3 ]]; then
    echo "$value"
    return
  fi

  local mask_count=$((length - 3))
  local masked_prefix
  masked_prefix=$(printf '•%.0s' $(seq 1 "$mask_count"))
  echo "${masked_prefix}${value: -3}"
}

prompt_env_value() {
  local index="$1"
  local name required secret multiline default_value description prompt_suffix value display_value

  name=$(jq -r ".env[$index].name" "$METADATA_FILE")
  required=$(jq -r ".env[$index].required // false" "$METADATA_FILE")
  secret=$(jq -r ".env[$index].secret // false" "$METADATA_FILE")
  multiline=$(jq -r ".env[$index].multiline // false" "$METADATA_FILE")
  default_value=$(jq -r ".env[$index].default // empty" "$METADATA_FILE")
  description=$(jq -r ".env[$index].description // empty" "$METADATA_FILE")

  print_section "Configure $name"
  if [[ -n "$description" ]]; then
    echo "$description"
    echo ""
  fi

  if [[ "$multiline" == "true" ]]; then
    print_error "multiline env is not supported yet in macOS installer: $name"
    exit 1
  fi

  prompt_suffix=""
  if [[ "$required" == "true" ]]; then
    prompt_suffix="required"
  else
    prompt_suffix="optional"
  fi
  if [[ -n "$default_value" ]]; then
    prompt_suffix="$prompt_suffix, default: $default_value"
  fi

  while true; do
    if [[ "$secret" == "true" ]]; then
      echo -n -e "${YELLOW}Enter $name ($prompt_suffix):${NC} "
      read -r -s value < /dev/tty
      echo ""
    else
      echo -n -e "${YELLOW}Enter $name ($prompt_suffix):${NC} "
      read -r value < /dev/tty
    fi

    if [[ -z "$value" && -n "$default_value" ]]; then
      value="$default_value"
    fi

    if [[ -z "$value" && "$required" == "true" ]]; then
      print_error "$name cannot be empty. Please try again."
      echo ""
      continue
    fi

    display_value="$value"
    if [[ "$secret" == "true" ]]; then
      display_value=$(mask_value "$value")
    elif [[ -z "$display_value" ]]; then
      display_value="(not set)"
    fi

    export "ENV_VALUE_$name=$value"
    ENV_KEYS+=("$name")
    ENV_DISPLAY_VALUES+=("$display_value")
    print_success "$name: $display_value"
    break
  done
}

collect_env_vars() {
  local count index
  count=$(jq '.env | length' "$METADATA_FILE")
  if [[ "$count" -eq 0 ]]; then
    print_section "Step 3: Configure Environment"
    print_success "No environment variables required"
    return
  fi

  for ((index=0; index<count; index++)); do
    prompt_env_value "$index"
  done
}

show_preview() {
  print_section "Step 4: Installation Preview"

  if jq -e ".mcpServers[\"$SERVER_KEY\"]" "$CONFIG_FILE" >/dev/null 2>&1; then
    print_warning "$DISPLAY_NAME is already configured. It will be overwritten."
    echo ""
  fi

  echo "The following will be added/updated to Claude Desktop config:"
  echo ""
  echo -e "${BLUE}Server name:${NC} $SERVER_KEY"
  echo -e "${BLUE}Display name:${NC} $DISPLAY_NAME"
  echo -e "${BLUE}npm package:${NC} $PACKAGE_NAME"
  echo -e "${BLUE}Command:${NC} $NPX_PATH"
  echo -e "${BLUE}Args:${NC} ['-y', '$PACKAGE_NAME']"
  echo -e "${BLUE}Environment variables:${NC}"

  local idx
  for idx in "${!ENV_KEYS[@]}"; do
    echo "  - ${ENV_KEYS[$idx]}: ${ENV_DISPLAY_VALUES[$idx]}"
  done
  if [[ "$INJECT_PATH" == "true" ]]; then
    echo "  - PATH: $MACOS_PATH_VALUE"
  fi
  echo ""

  echo -n "Confirm installation? (y/n): "
  local confirm
  read -r confirm < /dev/tty
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_error "Installation cancelled by user"
    exit 0
  fi
}

backup_config() {
  print_section "Step 5: Backing up existing configuration"
  BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$CONFIG_FILE" "$BACKUP_FILE"
  print_success "Config file backed up to: $BACKUP_FILE"
}

build_env_json() {
  local env_json idx key value value_var
  env_json='{}'

  for idx in "${!ENV_KEYS[@]}"; do
    key="${ENV_KEYS[$idx]}"
    value_var="ENV_VALUE_$key"
    value="${!value_var-}"
    if [[ -z "$value" ]]; then
      continue
    fi
    env_json=$(jq -c --arg key "$key" --arg value "$value" '. + {($key): $value}' <<<"$env_json")
  done

  if [[ "$INJECT_PATH" == "true" ]]; then
    env_json=$(jq -c --arg value "$MACOS_PATH_VALUE" '. + {"PATH": $value}' <<<"$env_json")
  fi

  echo "$env_json"
}

update_config() {
  print_section "Step 6: Updating configuration file"

  local tmp_file new_file env_json args_json jq_output
  tmp_file=$(mktemp)
  new_file="${tmp_file}.new"
  trap "rm -f '$tmp_file' '$new_file'" EXIT
  cp "$CONFIG_FILE" "$tmp_file"

  env_json=$(build_env_json)
  args_json=$(jq -c '.command.args' "$METADATA_FILE")

  jq_output=$(jq \
    --arg key "$SERVER_KEY" \
    --arg cmd "$NPX_PATH" \
    --argjson args "$args_json" \
    --argjson env "$env_json" \
    '.mcpServers[$key] = {
      "command": $cmd,
      "args": $args,
      "env": $env
    }' "$tmp_file" 2>&1) || {
      print_error "Config generation failed"
      echo "$jq_output" | sed 's/^/  /'
      exit 1
    }

  echo "$jq_output" > "$new_file"
  if ! jq empty "$new_file" 2>/dev/null; then
    print_error "Generated config file has invalid JSON format"
    jq empty "$new_file" 2>&1 | sed 's/^/  /'
    exit 1
  fi

  mv "$new_file" "$CONFIG_FILE"
  print_success "Config file updated successfully"
}

print_completion() {
  print_section "Installation Complete!"
  echo -e "${GREEN}$DISPLAY_NAME has been successfully installed${NC}"
  echo ""
  echo "Next steps:"
  local message
  if [[ "${#POST_INSTALL_MESSAGES[@]}" -gt 0 ]]; then
    for message in "${POST_INSTALL_MESSAGES[@]}"; do
      echo -e "  ${YELLOW}- $message${NC}"
    done
  else
    echo -e "  ${YELLOW}- Fully quit Claude Desktop${NC}"
    echo -e "  ${YELLOW}- Reopen Claude Desktop${NC}"
  fi
}

main() {
  trap 'rm -f "$METADATA_TEMP_FILE"' EXIT
  validate_args
  load_metadata
  print_banner
  print_deprecation_notice
  check_system
  check_claude_desktop
  collect_env_vars
  show_preview
  backup_config
  update_config
  print_completion
}

main
