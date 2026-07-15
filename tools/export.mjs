import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { getAgentRegistry, getAdapterRegistry } from '@staffforge/core';
import { getSkillRegistry } from './skill-loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const adapterRegistry = getAdapterRegistry();
const VALID_PLATFORMS = adapterRegistry.listAdapters();

const USAGE = `Usage: node tools/export.mjs --platform <name> [--out <dir>]

Platforms: ${VALID_PLATFORMS.join(', ')}

--out      Output directory (default: ./adapters/<platform>/output/)
--all      Export to all platforms
`;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform') opts.platform = args[++i];
    else if (args[i] === '--out') opts.out = args[++i];
    else if (args[i] === '--all') opts.all = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
  }
  if (!opts.platform && !opts.all) {
    console.error('ERROR: --platform or --all is required');
    console.log(USAGE);
    process.exit(1);
  }
  return opts;
}

function writeFiles(files, outDir) {
  for (const { path, content } of files) {
    const fullPath = join(outDir, path);
    mkdirSync(join(outDir, dirname(path)), { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
  }
  return files.length;
}

async function exportForPlatform(agents, skills, platform, outDir) {
  const adapter = await adapterRegistry.getAdapter(platform);
  const files = adapter(agents, skills || []);
  mkdirSync(outDir, { recursive: true });
  return writeFiles(files, outDir);
}

async function main() {
  const opts = parseArgs();
  const agents = getAgentRegistry().all();
  const skills = getSkillRegistry().all();

  if (skills.length > 0) {
    console.log(`Loaded ${skills.length} skill(s) from skills/`);
  }

  if (opts.all) {
    for (const platform of VALID_PLATFORMS) {
      const outDir = opts.out || join(root, 'adapters', platform, 'output');
      const fileCount = await exportForPlatform(agents, skills, platform, outDir);
      console.log(`OK    ${platform}: ${fileCount} file(s) → ${outDir}`);
    }
  } else {
    const platform = opts.platform;
    const outDir = opts.out || join(root, 'adapters', platform, 'output');
    const fileCount = await exportForPlatform(agents, skills, platform, outDir);
    console.log(`\nExported ${fileCount} file(s) to ${outDir} (${skills.length} skill(s) included)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
