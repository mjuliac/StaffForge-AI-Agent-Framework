#!/usr/bin/env node

/**
 * StaffForge AI Agent Framework — universal installer
 *
 * Local (repo cloned):    node install.mjs
 * Remote (any project):   npx @staffforge/cli
 *
 * Options:
 *   --platform <name>   opencode | claude-code | cursor | copilot | aider | gemini-cli | all
 *   --agent <name>      orchestrator | build | plan
 *   --out <dir>         output directory (default: project root)
 *   --yes, -y           non-interactive, use defaults
 *   --help, -h          show help
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  renameSync,
  cpSync,
  readdirSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { env, argv, exit, cwd } from 'node:process';
import { search as marketplaceSearch, install as marketplaceInstall } from './marketplace.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CWD = cwd();

const REPO = 'https://github.com/mjuliac/StaffForge-AI-Agent-Framework';
const BRANCH = 'develop';
const TMP = join('/tmp', `staffforge-${process.pid}`);
const CONFIG = join(CWD, '.staffforge-install.json');
const ME = __dirname;

// ── Colors ──
const b = (s) => `\x1b[1m${s}\x1b[0m`;
const g = (s) => `\x1b[32m${s}\x1b[0m`;
const bl = (s) => `\x1b[34m${s}\x1b[0m`;

// ── Help ──
function help() {
  console.log(`${b('StaffForge AI Agent Framework — Installer')}

${b('Usage:')}
  node install.mjs                          ${bl('# interactive')}
  node install.mjs -y                       ${bl('# non-interactive (defaults)')}
  node install.mjs --platform opencode --agent orchestrator
  npx github:mjuliac/StaffForge-AI-Agent-Framework              ${bl('# remote install')}

${b('Options:')}
  --platform <name>   Platform (opencode, claude-code, cursor, copilot, aider, gemini-cli, all)
  --agent <name>      Default agent (orchestrator, build, plan)
  --out <dir>         Output directory
  --vcs <name>        VCS provider (git, svn, hg, tfvc, perforce, custom)
  --workflow <name>   Workflow preset (git-flow, github-flow, gitlab-flow, trunk-based, custom)
  --yes, -y           Skip prompts, use defaults
  --help, -h          Show this help
`);
}

// ── Parse args ──
function parseArgs() {
  const a = argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    switch (a[i]) {
      case '--help':
      case '-h':
        help();
        exit(0);
      case '--platform':
        o.platform = a[++i];
        break;
      case '--agent':
        o.agent = a[++i];
        break;
      case '--out':
        o.out = a[++i];
        break;
      case '--vcs':
        o.vcs = a[++i];
        break;
      case '--workflow':
        o.workflow = a[++i];
        break;
      case '--catalog':
        o.catalog = a[++i];
        break;
      case '--yes':
      case '-y':
        o.yes = true;
        break;
      default:
        if (a[i] === 'marketplace' && !o.command) {
          o.command = 'marketplace';
          o.args = a.slice(i + 1).filter((x) => !x.startsWith('--'));
          break;
        }
        if (!o.command) {
          console.error(`Unknown: ${a[i]}`);
          exit(1);
        }
    }
  }
  return o;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

function findFrameworkDir() {
  const candidates = [ME, resolve(ME, '..', '..'), CWD];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'tools', 'export.mjs'))) return dir;
  }
  return null;
}

function download(target) {
  console.log(`\n${bl('→')} Downloading StaffForge...`);
  mkdirSync(target, { recursive: true });
  execSync(`git clone --depth 1 --branch ${BRANCH} ${REPO} "${target}"`, { stdio: 'inherit' });
  console.log(`${bl('→')} Installing dependencies...`);
  execSync('npm install --silent', { cwd: target, stdio: 'inherit' });
  return target;
}

function loadPrev() {
  try {
    return existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf-8')) : null;
  } catch {
    return null;
  }
}
function savePrev(d) {
  writeFileSync(CONFIG, JSON.stringify(d, null, 2) + '\n');
}

function runExport(fwDir, platform, agent, out) {
  const tools = join(fwDir, 'tools');
  console.log(`\n${bl('→')} Exporting for ${platform}...`);
  mkdirSync(out, { recursive: true });
  if (platform === 'opencode') {
    execSync(`node "${join(tools, 'install.mjs')}" --agent ${agent} --platform opencode --out "${out}"`, {
      stdio: 'inherit',
      cwd: fwDir,
    });
  } else {
    execSync(`node "${join(tools, 'export.mjs')}" --platform ${platform} --out "${out}"`, {
      stdio: 'inherit',
      cwd: fwDir,
    });
  }
}

function copyResult(platform, src, dest) {
  const cp = (f, d) => {
    copyFileSync(f, d);
  };
  const mv = (f, d) => {
    rmSync(d, { recursive: true, force: true });
    mkdirSync(dirname(d), { recursive: true });
    renameSync(f, d);
  };
  switch (platform) {
    case 'opencode':
      cp(join(src, 'opencode.json'), join(dest, 'opencode.json'));
      console.log(`  ${g('✓')} opencode.json → ${dest}/`);
      break;
    case 'claude-code':
      if (existsSync(join(src, 'CLAUDE.md'))) cp(join(src, 'CLAUDE.md'), join(dest, 'CLAUDE.md'));
      if (existsSync(join(src, '.claude/agents'))) mv(join(src, '.claude/agents'), join(dest, '.claude/agents'));
      console.log(`  ${g('✓')} CLAUDE.md + .claude/agents/`);
      break;
    case 'cursor':
      if (existsSync(join(src, '.cursor/rules'))) mv(join(src, '.cursor/rules'), join(dest, '.cursor/rules'));
      console.log(`  ${g('✓')} .cursor/rules/`);
      break;
    case 'copilot':
      mkdirSync(join(dest, '.github'), { recursive: true });
      if (existsSync(join(src, '.github/copilot-instructions.md')))
        cp(join(src, '.github/copilot-instructions.md'), join(dest, '.github/copilot-instructions.md'));
      console.log(`  ${g('✓')} .github/copilot-instructions.md`);
      break;
    case 'aider':
      if (existsSync(join(src, '.aider.rules.md'))) cp(join(src, '.aider.rules.md'), join(dest, '.aider.rules.md'));
      console.log(`  ${g('✓')} .aider.rules.md`);
      break;
    case 'gemini-cli':
      if (existsSync(join(src, '.gemini'))) mv(join(src, '.gemini'), join(dest, '.gemini'));
      console.log(`  ${g('✓')} .gemini/`);
      break;
  }
}

// Copy the canonical agents/ folder (each agent's full .md rules) to the
// target project so every install has the rules available as separate files.
function copyAgentsFolder(fwDir, dest) {
  const src = join(fwDir, 'agents');
  if (!existsSync(src)) return;
  const target = join(dest, 'agents');
  // Guard: never delete the source when framework dir === destination
  if (resolve(src) === resolve(target)) return;
  rmSync(target, { recursive: true, force: true });
  cpSync(src, target, { recursive: true });
  const count = readdirSync(target).filter((f) => f.endsWith('.md')).length;
  console.log(`  ${g('✓')} agents/ → ${target}/ (${count} agent files)`);
}

function isTracked(f) {
  try {
    execSync(`git -C "${CWD}" ls-files --error-unmatch "${f}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ── Main ──
async function main() {
  const o = parseArgs();

  // ── Marketplace subcommand ──
  if (o.command === 'marketplace') {
    const [sub, arg] = o.args || [];
    if (sub === 'search') {
      const results = await marketplaceSearch(arg || '', o.catalog);
      if (!results.length) return console.log('No pipelines found.');
      for (const r of results) console.log(`• ${r.name} — ${r.description || ''} (${r.version || '?'})`);
      return;
    }
    if (sub === 'install') {
      if (!arg) {
        console.error('Usage: staffforge marketplace install <pipeline-id> [--out <dir>]');
        return exit(1);
      }
      const outPath = await marketplaceInstall(arg, { out: o.out, catalogUrl: o.catalog });
      return console.log(`✓ Installed pipeline to ${outPath}`);
    }
    console.log('Usage: staffforge marketplace <search|install> [query|pipeline-id]');
    return;
  }

  console.log(`\n${b('StaffForge AI Agent Framework — Installer')}\n`);

  let fw = findFrameworkDir();
  const isLocal = fw !== null;
  let downloaded = false;

  if (!isLocal) {
    fw = TMP;
    download(fw);
    downloaded = true;
  } else console.log(`${bl('→')} Using local StaffForge`);

  let p = o.platform,
    a = o.agent,
    d = o.out;
  const prev = loadPrev();

  // ── Auto defaults with --yes ──
  if (o.yes) {
    p = p || 'opencode';
    a = a || 'orchestrator';
    d = d || join(CWD, 'staffforge');
    o.vcs = o.vcs || 'git';
    o.workflow = o.workflow || 'git-flow';
  }

  if (!o.yes && prev && !p && !a && !d) {
    console.log(`${bl('→')} Previous: ${prev.platform} (agent: ${prev.defaultAgent})`);
    const r = await ask('  Reinstall? [Y/n]: ');
    if (r.toLowerCase() !== 'n' && r !== 'no') {
      p = prev.platform;
      a = prev.defaultAgent;
      d = prev.installDir;
    }
  }

  if (!p) {
    console.log('\nPlatform:');
    console.log('  1) opencode    2) claude-code  3) cursor  4) copilot  5) aider  6) gemini-cli  7) all');
    const c = (await ask('\n? [1]: ')).trim();
    const m = { 2: 'claude-code', 3: 'cursor', 4: 'copilot', 5: 'aider', 6: 'gemini-cli', 7: 'all' };
    p = m[c] || c || 'opencode';
    if (!['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli', 'all'].includes(p)) p = 'opencode';
  }

  if (!a) {
    console.log('\nDefault agent:');
    console.log('  1) orchestrator  2) build  3) plan');
    const c = (await ask('\n? [1]: ')).trim();
    const m = { 2: 'build', 3: 'plan' };
    a = m[c] || c || 'orchestrator';
    if (!['orchestrator', 'build', 'plan'].includes(a)) a = 'orchestrator';
  }

  if (!d) {
    console.log('\nLocation:');
    console.log('  1) Project  (./staffforge/)');
    console.log('  2) Global   (~/.config/staffforge/)');
    const c = (await ask('\n? [1]: ')).trim();
    d = c === '2' ? join(env.HOME || env.USERPROFILE || '~', '.config', 'staffforge') : join(CWD, 'staffforge');
  }

  // ── VCS provider selection ──
  if (!o.vcs) {
    console.log('\nVersion Control System:');
    console.log('  1) Git (default)');
    console.log('  2) Subversion (SVN)');
    console.log('  3) Mercurial (Hg)');
    console.log('  4) Azure DevOps (TFVC)');
    console.log('  5) Perforce');
    console.log('  6) Custom');
    const c = (await ask('\n? [1]: ')).trim();
    const vcsMap = { 2: 'svn', 3: 'hg', 4: 'tfvc', 5: 'perforce', 6: 'custom' };
    o.vcs = vcsMap[c] || c || 'git';
    if (!['git', 'svn', 'hg', 'tfvc', 'perforce', 'custom'].includes(o.vcs)) o.vcs = 'git';
  }

  // ── Workflow selection ──
  if (!o.workflow) {
    console.log('\nWorkflow:');
    console.log('  1) Git Flow (default)');
    console.log('  2) GitHub Flow');
    console.log('  3) GitLab Flow');
    console.log('  4) Trunk Based');
    console.log('  5) Custom');
    const c = (await ask('\n? [1]: ')).trim();
    const wfMap = { 2: 'github-flow', 3: 'gitlab-flow', 4: 'trunk-based', 5: 'custom' };
    o.workflow = wfMap[c] || c || 'git-flow';
    if (!['git-flow', 'github-flow', 'gitlab-flow', 'trunk-based', 'custom'].includes(o.workflow)) o.workflow = 'git-flow';
  }

  d = resolve(d);
  const platforms = p === 'all' ? ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'] : [p];

  for (const pl of platforms) {
    runExport(fw, pl, a, join(d, pl === p || p === 'all' ? '' : pl));
  }

  if (p === 'all') {
    console.log(`\n${g('✓')} All platforms at: ${d}/`);
  } else {
    console.log(`\n${g('✓')} StaffForge installed for ${p}`);
    copyResult(p, d, CWD);
  }

  // Always copy the canonical agents/ folder so every install has each
  // agent's full rules available as separate files.
  copyAgentsFolder(fw, CWD);

  if (p !== 'all') savePrev({ platform: p, defaultAgent: a, installDir: d });

  // ── Write .staffforge-vcs.json ──
  const vcsConfig = { provider: o.vcs, workflow: o.workflow };
  writeFileSync(join(CWD, '.staffforge-vcs.json'), JSON.stringify(vcsConfig, null, 2) + '\n');
  console.log(`  ${g('✓')} .staffforge-vcs.json (${o.vcs} + ${o.workflow})`);

  // ── VCS init (requirement: all projects MUST have a VCS repo) ──
  if (o.vcs === 'git') {
    if (!existsSync(join(CWD, '.git'))) {
      console.log(`\n${bl('→')} Initializing git repository...`);
      execSync('git init', { cwd: CWD, stdio: 'pipe' });
      execSync('git add -A', { cwd: CWD, stdio: 'pipe' });
      try { execSync('git commit -m "chore: initial commit"', { cwd: CWD, stdio: 'pipe' }); } catch { }
      console.log(`  ${g('✓')} Git repo initialized at ${CWD}`);
    }
  } else if (o.vcs === 'hg' && !existsSync(join(CWD, '.hg'))) {
    console.log(`\n${bl('→')} Initializing Mercurial repository...`);
    execSync('hg init', { cwd: CWD, stdio: 'pipe' });
    console.log(`  ${g('✓')} Hg repo initialized at ${CWD}`);
  } else if (o.vcs !== 'git') {
    console.log(`\n${bl('→')} VCS: ${o.vcs}. Initialize your ${o.vcs} repository manually.`);
  }

  // Cleanup
  if (downloaded) {
    console.log(`\n${bl('→')} Cleaning up...`);
    rmSync(fw, { recursive: true, force: true });
  } else if (d.startsWith(CWD) && !d.includes('node_modules')) {
    const name = process.platform === 'win32' ? 'install.ps1' : 'install.sh';
    const sp = join(CWD, name);
    if (existsSync(sp) && !isTracked(sp)) rmSync(sp, { force: true });
    if (existsSync(d) && d !== CWD) rmSync(d, { recursive: true, force: true });
  }

  console.log(`\n${b(g('✓ Installation complete.'))}\n`);
  rl.close();
}

main().catch((e) => {
  console.error(e);
  exit(1);
});
