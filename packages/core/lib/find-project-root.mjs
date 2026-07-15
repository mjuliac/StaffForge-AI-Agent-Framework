import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

/**
 * Pre-computed project root.
 * This file is at packages/core/lib/find-project-root.mjs,
 * so the root is 3 levels up (lib/ -> core/ -> packages/ -> root).
 *
 * The computed path uses import.meta.url which dereferences symlinks,
 * so it works correctly whether the package is installed as a
 * workspace symlink or copied into node_modules/.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

function findRoot(dir, levels) {
  let d = dir;
  for (let i = 0; i < levels; i++) d = dirname(d);
  return d;
}

/**
 * Project root directory. Use this from files in packages/core/lib/.
 * Files in subdirectories (e.g., registries/) need to add extra levels.
 */
export const root = findRoot(__dirname, 3); // lib/ -> core/ -> packages/ -> root

/**
 * Check if a directory is the StaffForge project root by verifying
 * the agents/ directory exists AND it's NOT under packages/ or node_modules/.
 */
function isProjectRoot(dir) {
  // Must have agents/
  if (!existsSync(join(dir, 'agents'))) return false;
  // Must NOT be inside packages/ (false positive from packages/core/agents/)
  if (dirname(dir).endsWith('/packages') || dirname(dir).endsWith('\\packages')) return false;
  // Must NOT be inside node_modules/
  if (dir.includes('node_modules')) return false;
  return true;
}

/**
 * Resolve project root from a module's import.meta.url.
 * Walks up from the module location until the project root is found.
 * Falls back to process.cwd().
 */
export function resolveRoot(fromUrl) {
  let d = dirname(fileURLToPath(fromUrl));
  let guard = 0;
  while (d !== '/' && guard < 64) {
    guard++;
    if (isProjectRoot(d)) return d;
    d = dirname(d);
  }
  return process.cwd();
}
