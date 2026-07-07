import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (q) => new Promise(r => rl.question(q, r));

function showHelp() {
  console.log(`
StaffForge AI Agent Framework - Installer

Usage: node tools/install.mjs [options]

Options:
  --help, -h          Show this help message
  --agent <name>      Set default agent (orchestrator, build, or plan)
  --out <dir>         Output directory (default: project root)

Interactive mode:
  node tools/install.mjs

Non-interactive mode:
  node tools/install.mjs --agent orchestrator
  node tools/install.mjs --agent build
  node tools/install.mjs --agent plan
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      showHelp();
      process.exit(0);
    } else if (args[i] === '--agent') {
      opts.agent = args[++i];
    } else if (args[i] === '--out') {
      opts.out = args[++i];
    }
  }

  return opts;
}

async function promptDefaultAgent() {
  console.log('\nStaffForge AI Agent Framework - Installer\n');
  console.log('Select the default agent mode:\n');
  console.log('  orchestrator  - Default agent. Coordinates work, manages Git Flow, routes tasks (recommended)');
  console.log('  build         - Full tool access (edit, bash, write)');
  console.log('  plan          - Read-only mode (analysis and planning)\n');

  const answer = await question('? Default agent (orchestrator/build/plan) [orchestrator]: ');
  return (answer || 'orchestrator').trim().toLowerCase();
}

async function main() {
  const opts = parseArgs();
  let defaultAgent = opts.agent;

  if (!defaultAgent) {
    defaultAgent = await promptDefaultAgent();
  }

  if (!['orchestrator', 'build', 'plan'].includes(defaultAgent)) {
    console.error('Error: Invalid agent. Use "orchestrator", "build", or "plan".');
    process.exit(1);
  }

  console.log(`\nExporting agents for platform: opencode...`);

  try {
    execSync('node tools/export.mjs --platform opencode', {
      cwd: root,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('Error: Export failed.');
    process.exit(1);
  }

  const opencodeJsonPath = join(root, 'adapters', 'opencode', 'output', 'opencode.json');
  if (!existsSync(opencodeJsonPath)) {
    console.error('Error: opencode.json not found after export.');
    process.exit(1);
  }

  const content = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8'));
  content.default_agent = defaultAgent;
  writeFileSync(opencodeJsonPath, JSON.stringify(content, null, 2) + '\n');

  const outDir = opts.out || root;
  mkdirSync(outDir, { recursive: true });

  const targetPath = join(outDir, 'opencode.json');
  copyFileSync(opencodeJsonPath, targetPath);

  console.log(`\n✓ Exported to: ${targetPath}`);
  console.log(`✓ Default agent: ${defaultAgent}`);
  console.log('\nUse Tab to switch between orchestrator, build, and plan modes.\n');

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
