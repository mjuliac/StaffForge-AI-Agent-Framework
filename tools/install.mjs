import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const VALID_PLATFORMS = ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'];

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (q) => new Promise((r) => rl.question(q, r));

function showHelp() {
  console.log(`
StaffForge AI Agent Framework - Installer

Usage: node tools/install.mjs [options]

Options:
  --help, -h             Show this help message
  --agent <name>         Set default agent (orchestrator only; build/plan are @subagents)
  --platform <name>      Target platform (opencode, claude-code, cursor, copilot, aider, gemini-cli)
  --out <dir>            Output directory (default: project root)

Interactive mode:
  node tools/install.mjs

Non-interactive mode:
  node tools/install.mjs --agent orchestrator
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
  console.log('  (build and plan are now @subagents — accessible via @build/@plan)\n');

  const answer = await question('? Default agent [orchestrator]: ');
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

  if (!VALID_PLATFORMS.includes(platform)) {
    console.error(`Error: Invalid platform "${platform}". Valid platforms: ${VALID_PLATFORMS.join(', ')}`);
    process.exit(1);
  }

  console.log(`\nExporting agents and skills for platform: ${platform}...`);

  try {
    execFileSync('node', ['tools/export.mjs', '--platform', platform], {
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

  // ── Project Rules setup ────────────────────────────────────────────────
  const projectRulesPath = join(root, 'PROJECT_RULES.md');
  if (!existsSync(projectRulesPath)) {
    console.log('\n── Project Rules ──');
    console.log('PROJECT_RULES.md not found. This file defines tech stack, conventions,');
    console.log('constraints and workflow for your project.');
    console.log('It is used by the orchestrator and all agents as an addendum to AGENTS.md.\n');

    const answer = await question('? Create PROJECT_RULES.md now via @project-rules wizard? (Y/n): ');
    if (answer.toLowerCase() !== 'n') {
      console.log('\n  Run the following command in your AI assistant:\n');
      console.log('    @project-rules setup\n');
      console.log('  The wizard will guide you through: tech stack, conventions, rules, workflow, documentation.\n');
    } else {
      console.log('  You can create it later by invoking @project-rules in your AI assistant.\n');
    }
  } else {
    console.log('✓ PROJECT_RULES.md found — project rules are configured.\n');
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
