import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
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
  --help, -h             Show this help message
  --agent <name>         Set default agent (orchestrator, build, or plan)
  --platform <name>      Target platform (opencode, claude-code, cursor, copilot, aider, gemini-cli)
  --out <dir>            Output directory (default: project root)

Interactive mode:
  node tools/install.mjs

Non-interactive mode:
  node tools/install.mjs --agent orchestrator
  node tools/install.mjs --agent build
  node tools/install.mjs --platform claude-code
  node tools/install.mjs --agent orchestrator --platform cursor
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
    } else if (args[i] === '--platform') {
      opts.platform = args[++i];
    } else if (args[i] === '--out') {
      opts.out = args[++i];
    }
  }

  return opts;
}

function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const dstPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      copyFileSync(srcPath, dstPath);
    }
  }
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

  const platform = opts.platform || 'opencode';
  console.log(`\nExporting agents for platform: ${platform}...`);

  try {
    execSync(`node tools/export.mjs --platform ${platform}`, {
      cwd: root,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('Error: Export failed.');
    process.exit(1);
  }

  const outputDir = join(root, 'adapters', platform, 'output');
  if (!existsSync(outputDir)) {
    console.error(`Error: No output generated for platform "${platform}".`);
    console.error(`  Expected output directory: ${outputDir}`);
    process.exit(1);
  }

  if (platform === 'opencode') {
    const jsonPath = join(outputDir, 'opencode.json');
    if (!existsSync(jsonPath)) {
      console.error('Error: opencode.json not found after export.');
      process.exit(1);
    }
    const content = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    content.default_agent = defaultAgent;
    writeFileSync(jsonPath, JSON.stringify(content, null, 2) + '\n');
  }

  const outDir = opts.out || root;
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(outputDir);
  let copiedCount = 0;

  for (const file of files) {
    const srcPath = join(outputDir, file);
    const dstPath = join(outDir, file);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      copyFileSync(srcPath, dstPath);
    }
    copiedCount++;
  }

  console.log(`\n✓ ${copiedCount} file(s) exported to: ${outDir}`);
  if (platform === 'opencode') {
    console.log(`✓ Default agent: ${defaultAgent}`);
    console.log('\nUse Tab to switch between orchestrator, build, and plan modes.\n');
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
