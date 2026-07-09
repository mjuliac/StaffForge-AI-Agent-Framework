#!/usr/bin/env node

// StaffForge universal installer — delegates to packages/cli/install.mjs
// Dependencies (ajv, glob, js-yaml) are declared at root package.json so
// `npm install` (run by npx) installs everything needed without workspace setup.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = __dirname;

// When installed via `npx github:...`, npm may not set up workspace symlinks
// (@staffforge/core won't resolve). Run workspace install if missing.
if (!existsSync(join(pkgDir, 'node_modules', '@staffforge', 'core'))) {
  execSync('npm install --workspaces --silent --install-strategy=hoisted', { cwd: pkgDir, stdio: 'inherit' });
}

await import('./packages/cli/install.mjs');
