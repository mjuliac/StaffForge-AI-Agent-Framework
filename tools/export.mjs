import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const USAGE = `Usage: node tools/export.mjs --platform <name> [--out <dir>]

Platforms: opencode, claude-code, cursor, copilot, aider, gemini-cli
--out      Output directory (default: ./adapters/<platform>/output/)
`;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform') opts.platform = args[++i];
    else if (args[i] === '--out') opts.out = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
  }
  if (!opts.platform) {
    console.error('ERROR: --platform is required');
    console.log(USAGE);
    process.exit(1);
  }
  return opts;
}

function loadAgents() {
  const agentDir = join(root, 'agents');
  const files = readdirSync(agentDir).filter(f => f.endsWith('.md'));
  const agents = [];
  for (const file of files) {
    const content = readFileSync(join(agentDir, file), 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      console.warn(`WARN  ${file}: skipping, no frontmatter`);
      continue;
    }
    const frontmatter = yaml.load(match[1]);
    const body = match[2].trim();
    agents.push({ name: file.replace(/\.md$/, ''), file, frontmatter, body });
  }
  return agents;
}

async function main() {
  const opts = parseArgs();
  const agents = loadAgents();
  const adapterDir = join(root, 'adapters', opts.platform);

  let adapter;
  try {
    adapter = await import(join(adapterDir, 'index.mjs'));
  } catch {
    console.error(`ERROR: adapter not found at ${adapterDir}`);
    console.error('Create adapters/<platform>/index.mjs that exports a function: (agents) => files[]');
    process.exit(1);
  }

  if (typeof adapter.default !== 'function') {
    console.error(`ERROR: adapter must export a default function`);
    process.exit(1);
  }

  const outDir = opts.out || join(adapterDir, 'output');
  mkdirSync(outDir, { recursive: true });

  const files = adapter.default(agents);
  for (const { path, content } of files) {
    const fullPath = join(outDir, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
    console.log(`WROTE  ${path}`);
  }

  console.log(`\nExported to ${outDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
