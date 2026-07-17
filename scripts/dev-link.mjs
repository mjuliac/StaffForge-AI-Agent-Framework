/**
 * Development-only workspace linker.
 * Creates symlinks in node_modules/ for workspace packages.
 * Only runs when .git exists (development mode, not npx installs).
 */
import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(root, '..');

// Skip if .git doesn't exist (npx / production install)
if (!existsSync(join(projectRoot, '.git'))) process.exit(0);

const workspaces = [
  { name: '@staffforge/core',   target: 'packages/core' },
  { name: '@staffforge/cli',     target: 'packages/cli' },
  { name: '@staffforge/sdk',    target: 'packages/sdk' },
  { name: '@staffforge/plugin-sdk', target: 'packages/plugin-sdk' },
  { name: '@staffforge/dashboard', target: 'packages/dashboard' },
  { name: '@staffforge/enterprise', target: 'packages/enterprise' },
];

let linked = 0;
for (const { name, target } of workspaces) {
  const parts = name.split('/');
  const parentDir = join(projectRoot, 'node_modules', ...parts.slice(0, -1));
  const linkPath = join(projectRoot, 'node_modules', ...parts);
  const targetPath = join(projectRoot, target);

  if (existsSync(linkPath)) continue;
  if (!existsSync(targetPath)) continue;

  mkdirSync(parentDir, { recursive: true });
  symlinkSync(targetPath, linkPath);
  linked++;
}

if (linked) console.log(`dev-link: linked ${linked} workspace package(s)`);
