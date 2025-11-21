#!/usr/bin/env node

const { spawnSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const REPO_URL = 'https://github.com/feed-mob/claude-code-marketplace.git';
const VENDOR_DIR = join(__dirname, '..', 'vendor');
const TARGET_DIR = join(VENDOR_DIR, 'claude-code-marketplace');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command ${command} ${args.join(' ')} failed with code ${result.status ?? 'unknown'}`);
  }
}

function ensureRepo() {
  if (!existsSync(VENDOR_DIR)) {
    mkdirSync(VENDOR_DIR, { recursive: true });
  }
  if (!existsSync(TARGET_DIR)) {
    run('git', ['clone', '--depth', '1', REPO_URL, TARGET_DIR]);
    return;
  }
  run('git', ['-C', TARGET_DIR, 'fetch', '--all', '--prune']);
  run('git', ['-C', TARGET_DIR, 'reset', '--hard', 'origin/main']);
}

try {
  ensureRepo();
  console.log(`[setup-plugin] Ready: ${TARGET_DIR}`);
} catch (error) {
  console.error('[setup-plugin] Failed to prepare plugin repository:', error.message);
  process.exit(1);
}
