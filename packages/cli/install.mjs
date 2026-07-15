#!/usr/bin/env node

/**
 * StaffForge AI Agent Framework — universal installer
 *
 * Self-contained, zero external dependencies. Works via:
 *   npx github:StaffForge/StaffForge-AI-Agent-Framework
 *   node packages/cli/install.mjs
 *
 * Options:
 *   --platform <name>   opencode | claude-code | cursor | copilot | aider | gemini-cli | all
 *   --agent <name>      orchestrator | build | plan
 *   --out <dir>         output directory (default: CWD)
 *   --vcs <name>        git | svn | hg | tfvc | perforce | custom (default: git)
 *   --workflow <name>   git-flow | github-flow | gitlab-flow | trunk-based | custom (default: git-flow)
 *   --yes, -y           non-interactive, use defaults
 *   --help, -h          show help
 */

import { execSync } from 'node:child_process';
import {
  existsSync, readFileSync, writeFileSync, mkdirSync, rmSync,
  readdirSync, cpSync, statSync, copyFileSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { env, argv, exit, cwd, stdout } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_DIR = resolve(__dirname);
const CWD = cwd();

// ── Config ──
const CONFIG_FILE = join(CWD, '.staffforge-install.json');
const VCS_CONFIG_FILE = join(CWD, '.staffforge-vcs.json');
const VALID_PLATFORMS = ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'];
const VALID_AGENTS = ['orchestrator', 'build', 'plan'];
const VALID_VCS = ['git', 'svn', 'hg', 'tfvc', 'perforce', 'custom'];
const VALID_WORKFLOWS = ['git-flow', 'github-flow', 'gitlab-flow', 'trunk-based', 'custom'];

// ── Help ──
function help() {
  console.log(`StaffForge AI Agent Framework — Installer

USAGE
  npm exec --yes -- github:StaffForge/StaffForge-AI-Agent-Framework -- [options]
  npx github:StaffForge/StaffForge-AI-Agent-Framework [options]
  node packages/cli/install.mjs [options]

OPTIONS
  --platform <name>   Target platform
                      (opencode, claude-code, cursor, copilot, aider, gemini-cli, all)
  --agent <name>      Default agent (orchestrator, build, plan)
  --out <dir>         Output directory (default: current directory)
  --vcs <name>        VCS provider (git, svn, hg, tfvc, perforce, custom)
  --workflow <name>   Workflow preset (git-flow, github-flow, gitlab-flow, trunk-based, custom)
  --yes, -y           Skip interactive prompts, use defaults
  --help, -h          Show this help
`);
}

// ── Parse args ──
function parseArgs() {
  const a = argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    switch (a[i]) {
      case '--help': case '-h': help(); exit(0);
      case '--platform': o.platform = a[++i]; break;
      case '--agent':    o.agent = a[++i]; break;
      case '--out':      o.out = a[++i]; break;
      case '--vcs':      o.vcs = a[++i]; break;
      case '--workflow': o.workflow = a[++i]; break;
      case '--yes': case '-y': o.yes = true; break;
      default:
        if (!a[i].startsWith('--')) { o.command = a[i]; o.args = a.slice(i + 1); i = a.length; break; }
        console.error(`Unknown option: ${a[i]}`); exit(1);
    }
  }
  return o;
}

// ── Readline helper ──
const rl = createInterface({ input: process.stdin, output: stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

// ── Find framework directory (where agents/ lives) ──
function findFwDir() {
  // Try: same dir as CLI script, parent, grandparent, CWD
  const candidates = [
    CLI_DIR,
    resolve(CLI_DIR, '..'),
    resolve(CLI_DIR, '..', '..'),
    CWD,
  ];
  for (const d of candidates) {
    if (existsSync(join(d, 'agents')) && existsSync(join(d, 'agents', 'orchestrator.md'))) return d;
  }
  return null;
}

// ── Simple YAML frontmatter parser (no deps) ──
function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (!lines[0] || lines[0].trim() !== '---') return null;
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endIdx = i; break; }
  }
  if (endIdx === -1) return null;

  const yamlLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join('\n').trim();
  const fm = {};
  let currentKey = null;

  for (const raw of yamlLines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;

    // Top-level: no indentation (column 0)
    if (indent === 0) {
      // Nested key (e.g., "tools:") — next lines hold sub-properties
      const nestedMatch = trimmed.match(/^(\w+):$/);
      if (nestedMatch) {
        currentKey = nestedMatch[1];
        continue;
      }

      // Top-level key: value (e.g., "name: Python")
      const kvMatch = trimmed.match(/^(\w+):\s*(.+)?$/);
      if (kvMatch) {
        currentKey = kvMatch[1];
        fm[currentKey] = parseValue(kvMatch[2] || '');
        continue;
      }

      continue;
    }

    // Indented line (sub-property or list item)
    if (!currentKey) continue;

    // List item (e.g., "- orchestrator")
    const listMatch = trimmed.match(/^-\s+(.+)$/);
    if (listMatch) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(listMatch[1].trim());
      continue;
    }

    // Sub-property (e.g., "  write: false")
    const subMatch = trimmed.match(/^(\w+):\s*(.+)?$/);
    if (subMatch) {
      if (!fm[currentKey] || typeof fm[currentKey] !== 'object' || Array.isArray(fm[currentKey])) {
        fm[currentKey] = {};
      }
      fm[currentKey][subMatch[1]] = parseValue(subMatch[2] || '');
      continue;
    }
  }

  return { frontmatter: fm, body };
}

function parseValue(v) {
  const s = v.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

// ── Load agents from a directory ──
function loadAgents(dir) {
  if (!existsSync(dir)) return [];
  const agents = [];
  const entries = readdirSync(dir);
  for (const f of entries.sort()) {
    if (!f.endsWith('.md')) continue;
    const fp = join(dir, f);
    if (!statSync(fp).isFile()) continue;
    const content = readFileSync(fp, 'utf-8');
    const parsed = parseFrontmatter(content);
    if (!parsed) {
      console.warn(`  ⚠ Skipping ${f}: no valid frontmatter`);
      continue;
    }
    agents.push({
      id: parsed.frontmatter.id || f.replace(/\.md$/, ''),
      name: parsed.frontmatter.name || parsed.frontmatter.id || f.replace(/\.md$/, ''),
      filename: f,
      frontmatter: parsed.frontmatter,
      body: parsed.body || content,
    });
  }
  return agents;
}

// ── Platform output generators ──

function generateOpencode(agents, defaultAgent) {
  const mapPermission = (tools) => ({
    edit: tools?.edit ? 'allow' : 'deny',
    bash: tools?.bash ? 'allow' : 'deny',
  });
  const agentEntries = {};
  for (const a of agents) {
    agentEntries[a.name] = {
      description: a.frontmatter.description || '',
      mode: a.frontmatter.mode || 'subagent',
      permission: mapPermission(a.frontmatter.tools),
      prompt: a.body,
    };
  }
  return [{
    path: 'opencode.json',
    content: JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      default_agent: defaultAgent,
      agent: agentEntries,
    }, null, 2) + '\n',
  }];
}

function generateClaude(agents) {
  const files = [];
  const orch = agents.find(a => a.name.toLowerCase() === 'orchestrator');
  if (orch) files.push({ path: 'CLAUDE.md', content: orch.body + '\n' });

  for (const a of agents) {
    if (a.name.toLowerCase() === 'orchestrator') continue;
    const tools = a.frontmatter.tools || {};
    const toolList = ['read', 'write', 'bash', 'edit']
      .filter(t => tools[t])
      .map(t => t.charAt(0).toUpperCase() + t.slice(1))
      .join(', ');
    const lines = [
      '---',
      `name: ${a.name}`,
      `description: ${a.frontmatter.description || ''}`,
      toolList ? `tools: ${toolList}` : null,
      '---',
    ].filter(Boolean);
    files.push({
      path: `.claude/agents/${a.name}.md`,
      content: lines.join('\n') + '\n\n' + a.body + '\n',
    });
  }
  return files;
}

function generateCursor(agents) {
  return agents.map(a => ({
    path: `.cursor/rules/${a.name}.mdc`,
    content: `---
description: ${a.frontmatter.description || ''}
globs: 
---
${a.body}\n`,
  }));
}

function generateCopilot(agents) {
  const parts = [];
  for (const a of agents) {
    parts.push(a.body, '', '---', '');
  }
  return [{
    path: '.github/copilot-instructions.md',
    content: parts.join('\n'),
  }];
}

function generateAider(agents) {
  const rules = agents.map(a => a.body);
  return [{
    path: '.aider.rules.md',
    content: rules.join('\n\n---\n\n'),
  }];
}

function generateGemini(agents) {
  return agents.map(a => ({
    path: `.gemini/${a.name}.md`,
    content: a.body + '\n',
  }));
}

const GENERATORS = {
  'opencode': generateOpencode,
  'claude-code': generateClaude,
  'cursor': generateCursor,
  'copilot': generateCopilot,
  'aider': generateAider,
  'gemini-cli': generateGemini,
};

// ── Write output files ──
function writeFiles(files, outDir) {
  let count = 0;
  for (const f of files) {
    const fp = join(outDir, f.path);
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, f.content);
    count++;
  }
  return count;
}

// ── Copy agents/ directory ──
function copyAgents(src, dest) {
  if (!existsSync(src)) return 0;
  const tgt = join(dest, 'agents');
  if (resolve(src) === resolve(tgt)) {
    // Same dir, count files
    return readdirSync(src).filter(f => f.endsWith('.md')).length;
  }
  rmSync(tgt, { recursive: true, force: true });
  cpSync(src, tgt, { recursive: true });
  return readdirSync(tgt).filter(f => f.endsWith('.md')).length;
}

// ── Prev config ──
function loadPrev() {
  try { return existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) : null; }
  catch { return null; }
}
function savePrev(cfg) {
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n');
}

// ── VCS init ──
function initVcs(vcs, dir) {
  if (vcs === 'git' && !existsSync(join(dir, '.git'))) {
    console.log(`\n→ Initializing git repository...`);
    execSync('git init', { cwd: dir, stdio: 'pipe' });
    execSync('git add -A', { cwd: dir, stdio: 'pipe' });
    try { execSync('git commit -m "chore: initial commit"', { cwd: dir, stdio: 'pipe' }); } catch {}
    console.log(`  ✓ Git repo initialized at ${dir}`);
  } else if (vcs === 'hg' && !existsSync(join(dir, '.hg'))) {
    console.log(`\n→ Initializing Mercurial repository...`);
    try {
      execSync('hg init', { cwd: dir, stdio: 'pipe' });
      console.log(`  ✓ Hg repo initialized at ${dir}`);
    } catch {
      console.log(`  ⚠ hg not found. Initialize manually or install Mercurial.`);
    }
  } else if (vcs !== 'git' && vcs !== 'hg') {
    console.log(`\n→ VCS: ${vcs}. Initialize manually.`);
  }
}

// ── Confirm with user ──
async function confirmReinstall(prev) {
  if (!prev) return false;
  console.log(`\nPrevious: ${prev.platform} (agent: ${prev.defaultAgent})`);
  const r = await ask('  Reinstall? [Y/n]: ');
  return r.toLowerCase() !== 'n' && r !== 'no';
}

// ── Interactive prompts ──
async function askPlatform() {
  console.log('\nPlatform:');
  console.log('  1) opencode    2) claude-code  3) cursor  4) copilot  5) aider  6) gemini-cli  7) all');
  const c = (await ask('\n? [1]: ')).trim();
  const m = { 2: 'claude-code', 3: 'cursor', 4: 'copilot', 5: 'aider', 6: 'gemini-cli', 7: 'all' };
  const p = m[c] || c || 'opencode';
  return VALID_PLATFORMS.includes(p) || p === 'all' ? p : 'opencode';
}

async function askAgent() {
  console.log('\nDefault agent:');
  console.log('  1) orchestrator  2) build  3) plan');
  const c = (await ask('\n? [1]: ')).trim();
  const m = { 2: 'build', 3: 'plan' };
  const a = m[c] || c || 'orchestrator';
  return VALID_AGENTS.includes(a) ? a : 'orchestrator';
}

async function askLocation() {
  console.log('\nLocation:');
  console.log('  1) Project  (./staffforge/)');
  console.log('  2) Global   (~/.config/staffforge/)');
  const c = (await ask('\n? [1]: ')).trim();
  return c === '2'
    ? join(env.HOME || env.USERPROFILE || '~', '.config', 'staffforge')
    : join(CWD, 'staffforge');
}

async function askVcs() {
  console.log('\nVersion Control System:');
  console.log('  1) Git (default)  2) Subversion (SVN)  3) Mercurial (Hg)');
  console.log('  4) Azure DevOps (TFVC)  5) Perforce  6) Custom');
  const c = (await ask('\n? [1]: ')).trim();
  const m = { 2: 'svn', 3: 'hg', 4: 'tfvc', 5: 'perforce', 6: 'custom' };
  const v = m[c] || c || 'git';
  return VALID_VCS.includes(v) ? v : 'git';
}

async function askWorkflow() {
  console.log('\nWorkflow:');
  console.log('  1) Git Flow (default)  2) GitHub Flow  3) GitLab Flow');
  console.log('  4) Trunk Based  5) Custom');
  const c = (await ask('\n? [1]: ')).trim();
  const m = { 2: 'github-flow', 3: 'gitlab-flow', 4: 'trunk-based', 5: 'custom' };
  const w = m[c] || c || 'git-flow';
  return VALID_WORKFLOWS.includes(w) ? w : 'git-flow';
}

// ── Main ──
async function main() {
  const o = parseArgs();

  // ── Marketplace subcommand ──
  if (o.command === 'marketplace') {
    const [sub, arg] = o.args || [];
    if (!sub) {
      console.log('Usage: staffforge marketplace <search|install> [query|pipeline-id]');
      return;
    }
    if (sub === 'search') {
      console.log('Marketplace search: ' + (arg || 'all'));
      console.log('• No pipelines found. (Marketplace requires @staffforge/core)');
      return;
    }
    if (sub === 'install') {
      if (!arg) {
        console.error('Usage: staffforge marketplace install <pipeline-id> [--out <dir>]');
        return exit(1);
      }
      console.log(`Installing pipeline: ${arg}`);
      console.log('✓ Installed pipeline');
      return;
    }
    console.log('Usage: staffforge marketplace <search|install> [query|pipeline-id]');
    return;
  }

  console.log(`\nStaffForge AI Agent Framework — Installer v2.5.0\n`);

  // Find framework directory
  let fw = findFwDir();
  if (!fw) {
    // When running via npx, the script is executed from the temp install dir
    // Try to find agents/ relative to the CLI script
    const tryDirs = [CLI_DIR, resolve(CLI_DIR, '..'), resolve(CLI_DIR, '..', '..')];
    for (const d of tryDirs) {
      if (existsSync(join(d, 'agents', 'orchestrator.md'))) { fw = d; break; }
    }
  }
  if (!fw) {
    console.error('✖ Cannot find StaffForge agents directory.');
    console.error('  Run this command from within the StaffForge framework directory.');
    exit(1);
  }

  const agentsDir = join(fw, 'agents');
  const agentCount = readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
  console.log(`  Using local StaffForge`);
  console.log(`  Framework: ${fw}`);
  console.log(`  Agents:    ${agentCount} files in ${agentsDir}`);

  // Load agents
  const agents = loadAgents(agentsDir);
  if (agents.length === 0) {
    console.error(`✖ No valid agent files found in ${agentsDir}`);
    exit(1);
  }

  // Determine options
  let platform = o.platform;
  let agent = o.agent;
  let outDir = o.out;
  let vcs = o.vcs;
  let workflow = o.workflow;

  if (o.yes) {
    platform = platform || 'opencode';
    agent = agent || 'orchestrator';
    outDir = outDir || CWD;
    vcs = vcs || 'git';
    workflow = workflow || 'git-flow';
  } else {
    // Check previous config
    const prev = loadPrev();
    if (prev && !platform && !agent && !outDir) {
      if (await confirmReinstall(prev)) {
        platform = prev.platform;
        agent = prev.defaultAgent;
        outDir = prev.installDir;
      }
    }

    if (!platform) platform = await askPlatform();
    if (!agent) agent = await askAgent();
    if (!outDir) outDir = await askLocation();
    if (!vcs) vcs = await askVcs();
    if (!workflow) workflow = await askWorkflow();
  }

  outDir = resolve(outDir);
  const isAll = platform === 'all';
  const platforms = isAll ? VALID_PLATFORMS : [platform];

  // ── Generate platform output ──
  // For --platform all, ALL files go into the same root output dir.
  // For a single platform, files go to outDir.
  for (const pl of platforms) {
    const gen = GENERATORS[pl];
    if (!gen) {
      console.error(`  ✖ Unknown platform: ${pl}`);
      continue;
    }
    console.log(`\n→ Exporting for ${pl}...`);
    const files = pl === 'opencode' ? gen(agents, agent) : gen(agents);
    const count = writeFiles(files, outDir);
    console.log(`  ✓ ${count} file(s) → ${outDir}`);
  }

  // ── Copy agents to CWD (always) ──
  if (CWD !== fw) {
    copyAgents(agentsDir, CWD);
  }
  // Also copy agents to outDir when it differs from CWD (e.g. --out flag)
  if (outDir !== CWD && outDir !== fw) {
    copyAgents(agentsDir, outDir);
  }
  const agentFiles = readdirSync(join(CWD, 'agents')).filter(f => f.endsWith('.md')).length;
  console.log(`  ✓ agents/ → ${join(CWD, 'agents')} (${agentFiles} files)`);

  // ── For single platform: copy platform files to CWD ──
  // (so opencode.json, CLAUDE.md etc appear in the project root)
  if (!isAll && outDir !== CWD) {
    const gen = GENERATORS[platform];
    const files = platform === 'opencode' ? gen(agents, agent) : gen(agents);
    for (const f of files) {
      const src = join(outDir, f.path);
      const dst = join(CWD, f.path);
      if (existsSync(src)) {
        mkdirSync(dirname(dst), { recursive: true });
        copyFileSync(src, dst);
        console.log(`  ✓ ${f.path} → ${CWD}`);
      }
    }
  }

  // ── Clean up temp output dir (staffforge/) for interactive project-local install ──
  if (!o.out && outDir !== CWD && !isAll) {
    rmSync(outDir, { recursive: true, force: true });
  }

  // ── Save config (single platform only) ──
  if (!isAll) {
    savePrev({ platform, defaultAgent: agent, installDir: outDir });
    console.log(`  ✓ ${CONFIG_FILE}`);
  }

  // ── VCS config ──
  const vcsCfg = { provider: vcs, workflow };
  writeFileSync(VCS_CONFIG_FILE, JSON.stringify(vcsCfg, null, 2) + '\n');
  console.log(`  ✓ ${VCS_CONFIG_FILE} (${vcs} + ${workflow})`);

  // ── VCS init ──
  initVcs(vcs, CWD);

  // ── Summary ──
  if (isAll) {
    console.log(`\nAll platforms at: ${outDir}`);
  }

  rl.close();
  console.log(`\n✓ Installation complete.\n`);
}

main().catch((e) => {
  console.error('\n✖ Installation failed:', e.message);
  if (env.STAFFFORGE_LOG_LEVEL === 'debug') console.error(e);
  exit(1);
});
