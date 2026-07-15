#!/usr/bin/env node

/**
 * StaffForge AI Agent Framework — entry point
 *
 * Delegates to the self-contained CLI installer at packages/cli/install.mjs.
 * No workspace resolution needed — works directly via npx github:...
 *
 * Usage:
 *   node install.mjs [options]
 *   npm run setup [options]
 *   npx github:StaffForge/StaffForge-AI-Agent-Framework [options]
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const cliInstaller = join(__dirname, 'packages', 'cli', 'install.mjs');
if (!existsSync(cliInstaller)) {
  console.error('✖ CLI installer not found at', cliInstaller);
  process.exit(1);
}

try {
  await import(cliInstaller);
} catch (err) {
  console.error('\n✖ Installation failed:', err.message);
  process.exit(1);
}
