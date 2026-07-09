#!/usr/bin/env node

// StaffForge universal installer
// When invoked via `npx github:mjuliac/StaffForge-AI-Agent-Framework`, npm may not
// automatically install workspace dependencies. We ensure they exist before proceeding.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = __dirname;

if (!existsSync(join(pkgDir, 'node_modules', '@staffforge', 'core'))) {
  execSync('npm install --workspaces --silent', { cwd: pkgDir, stdio: 'inherit' });
}

await import('./packages/cli/install.mjs');
