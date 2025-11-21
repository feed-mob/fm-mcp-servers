#!/usr/bin/env node

const { cpSync, existsSync, mkdirSync } = require('fs');
const { dirname, join } = require('path');

const ROOT_DIR = join(__dirname, '..');
const DIST_DIR = join(ROOT_DIR, 'dist');
const LOGO_SRC = join(ROOT_DIR, 'nodes', 'FeedmobDirectSpendVisualizer', 'logo.svg');
const LOGO_DEST = join(DIST_DIR, 'nodes', 'FeedmobDirectSpendVisualizer', 'logo.svg');
const VENDOR_SRC = join(ROOT_DIR, 'vendor', 'claude-code-marketplace');
const VENDOR_PLUGIN_SRC = join(VENDOR_SRC, 'plugins', 'direct-spend-visualizer');
const VENDOR_PLUGIN_DEST = join(DIST_DIR, 'vendor', 'claude-code-marketplace', 'plugins', 'direct-spend-visualizer');

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function copyLogo() {
  ensureDir(dirname(LOGO_DEST));
  cpSync(LOGO_SRC, LOGO_DEST);
}

function copyPlugin() {
  if (!existsSync(VENDOR_PLUGIN_SRC)) {
    throw new Error(`Plugin source directory not found at ${VENDOR_PLUGIN_SRC}. Run npm install to clone the marketplace repo.`);
  }
  ensureDir(dirname(VENDOR_PLUGIN_DEST));
  cpSync(VENDOR_PLUGIN_SRC, VENDOR_PLUGIN_DEST, { recursive: true });
}

function main() {
  copyLogo();
  copyPlugin();
  console.log('[build-assets] Copied assets to dist');
}

main();
