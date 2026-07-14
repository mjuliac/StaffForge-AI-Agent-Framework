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
// (@staffforge/core won't resolve). Run a full npm install.
// Note: --workspaces alone skips root deps (ajv, js-yaml) needed by tools/*.
if (!existsSync(join(pkgDir, 'node_modules', '@staffforge', 'core'))) {
  console.log('⚙️  Setting up StaffForge dependencies...');
  try {
    execSync('npm install --loglevel=warn --install-strategy=hoisted', {
      cwd: pkgDir,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('\n✖ Failed to install dependencies.');
    console.error('  Try running manually: cd "' + pkgDir + '" && npm install');
    process.exit(1);
  }
}

try {
  await import('./packages/cli/install.mjs');
} catch (err) {
  console.error('\n✖ Failed to start installer:', err.message);
  process.exit(1);
}
