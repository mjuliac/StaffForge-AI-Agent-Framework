import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAgentRegistry, getAdapterRegistry } from '@staffforge/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const USAGE = `Usage: node tools/export.mjs --platform <name> [--out <dir>]

Platforms: ${getAdapterRegistry().listAdapters().join(', ')}

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

async function main() {
  const opts = parseArgs();
  const agents = getAgentRegistry().all();
  const adapterRegistry = getAdapterRegistry();

  if (opts.all) {
    const results = await adapterRegistry.exportToAll(agents);
    for (const r of results) {
      console.log(`OK    ${r.platform}: ${r.fileCount} file(s) → ${r.outDir}`);
    }
  } else {
    const outDir = opts.out || join(root, 'adapters', opts.platform, 'output');
    const result = await adapterRegistry.export(agents, opts.platform, outDir);
    console.log(`\nExported ${result.fileCount} file(s) to ${result.outDir}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
