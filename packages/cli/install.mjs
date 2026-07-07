#!/usr/bin/env node

/**
 * StaffForge AI Agent Framework — universal installer
 *
 * Local (repo cloned):    node install.mjs
 * Remote (any project):   npx github:mjuliac/StaffForge-AI-Agent-Framework
 *
 * Options:
 *   --platform <name>   opencode | claude-code | cursor | copilot | aider | gemini-cli | all
 *   --agent <name>      orchestrator | build | plan
 *   --out <dir>         output directory (project: copies to CWD; global: platform standard dir)
 *   --global, -g        Install to platform's standard global directory
 *   --yes, -y           non-interactive, use defaults
 *   --help, -h          show help
 */

import { execSync } from 'node:child_process';
import {
  existsSync, copyFileSync, readFileSync, writeFileSync,
  mkdirSync, rmSync, renameSync
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { env, argv, exit, cwd } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CWD = cwd();

const REPO = 'https://github.com/mjuliac/StaffForge-AI-Agent-Framework';
const BRANCH = 'develop';
const TMP = join('/tmp', `staffforge-${process.pid}`);
const CONFIG = join(CWD, '.staffforge-install.json');
const ME = __dirname;

const GLOBAL_DIRS = {
  'opencode':   join(env.HOME || env.USERPROFILE || '~', '.config', 'opencode'),
  'claude-code': join(env.HOME || env.USERPROFILE || '~', '.claude'),
  'cursor':     join(env.HOME || env.USERPROFILE || '~', '.cursor'),
  'copilot':    null,
  'aider':      env.HOME || env.USERPROFILE || '~',
  'gemini-cli': join(env.HOME || env.USERPROFILE || '~', '.gemini'),
};

// ── Colors ──
const b = s => `\x1b[1m${s}\x1b[0m`;
const g = s => `\x1b[32m${s}\x1b[0m`;
const bl = s => `\x1b[34m${s}\x1b[0m`;

// ── Help ──
function help() {
  console.log(`${b('StaffForge AI Agent Framework — Installer')}

${b('Usage:')}
  node install.mjs                          ${bl('# interactive')}
  node install.mjs -y                       ${bl('# non-interactive (defaults)')}
  node install.mjs --platform opencode --agent orchestrator
  node install.mjs --global                 ${bl('# install globally for all projects')}
  npx github:mjuliac/StaffForge-AI-Agent-Framework              ${bl('# remote install')}

${b('Options:')}
  --platform <name>   Platform (opencode, claude-code, cursor, copilot, aider, gemini-cli, all)
  --agent <name>      Default agent (orchestrator, build, plan)
  --out <dir>         Output directory (project: copies to CWD; global: platform standard dir)
  --global, -g        Install to platform's standard global directory
  --yes, -y           Skip prompts, use defaults
  --help, -h          Show this help

${b('Global directories per platform:')}
  opencode          ~/.config/opencode/
  claude-code       ~/.claude/
  cursor            ~/.cursor/
  copilot           (not supported globally, use project install)
  aider             ~/.aider.rules.md
  gemini-cli        ~/.gemini/
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
      case '--agent': o.agent = a[++i]; break;
      case '--out': o.out = a[++i]; break;
      case '--global': case '-g': o.global = true; break;
      case '--yes': case '-y': o.yes = true; break;
      default: console.error(`Unknown: ${a[i]}`); exit(1);
    }
  }
  return o;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, r));

function findFrameworkDir() {
  const candidates = [
    ME,
    resolve(ME, '..', '..'),
    CWD,
  ];
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
  try { return existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf-8')) : null; }
  catch { return null; }
}
function savePrev(d) { writeFileSync(CONFIG, JSON.stringify(d, null, 2) + '\n'); }

function runExport(fwDir, platform, agent, out) {
  const tools = join(fwDir, 'tools');
  console.log(`\n${bl('→')} Exporting for ${platform}...`);
  mkdirSync(out, { recursive: true });
  if (platform === 'opencode') {
    execSync(`node "${join(tools, 'install.mjs')}" --agent ${agent} --out "${out}"`, { stdio: 'inherit', cwd: fwDir });
  } else {
    execSync(`node "${join(tools, 'export.mjs')}" --platform ${platform} --out "${out}"`, { stdio: 'inherit', cwd: fwDir });
  }
}

function copyResult(platform, src, dest, isGlobal) {
  const cp = (f, d) => { mkdirSync(dirname(d), { recursive: true }); copyFileSync(f, d); };
  const mv = (f, d) => { rmSync(d, { recursive: true, force: true }); mkdirSync(dirname(d), { recursive: true }); renameSync(f, d); };

  if (isGlobal) {
    const gd = GLOBAL_DIRS[platform];
    if (!gd) {
      console.log(`  ${b('!')} ${platform} has no standard global location. Use project install instead.`);
      return;
    }
    dest = gd;
  }

  switch (platform) {
    case 'opencode':
      cp(join(src, 'opencode.json'), join(dest, 'opencode.json'));
      break;
    case 'claude-code': {
      const cd = isGlobal ? dest : join(dest, '.claude');
      if (existsSync(join(src, 'CLAUDE.md'))) cp(join(src, 'CLAUDE.md'), join(dest, 'CLAUDE.md'));
      if (existsSync(join(src, '.claude/rules'))) mv(join(src, '.claude/rules'), join(cd, 'rules'));
      break;
    }
    case 'cursor': {
      const cd = isGlobal ? dest : join(dest, '.cursor');
      if (existsSync(join(src, '.cursor/rules'))) mv(join(src, '.cursor/rules'), join(cd, 'rules'));
      break;
    }
    case 'copilot':
      mkdirSync(join(dest, '.github'), { recursive: true });
      if (existsSync(join(src, '.github/copilot-instructions.md'))) cp(join(src, '.github/copilot-instructions.md'), join(dest, '.github/copilot-instructions.md'));
      break;
    case 'aider':
      if (existsSync(join(src, '.aider.rules.md'))) cp(join(src, '.aider.rules.md'), join(dest, '.aider.rules.md'));
      break;
    case 'gemini-cli': {
      const gd = isGlobal ? dest : join(dest, '.gemini');
      if (existsSync(join(src, '.gemini'))) mv(join(src, '.gemini'), gd);
      break;
    }
  }
  console.log(`  ${g('✓')} ${platform} → ${dest}/`);
}

function isTracked(f) {
  try { execSync(`git -C "${CWD}" ls-files --error-unmatch "${f}"`, { stdio: 'pipe' }); return true; }
  catch { return false; }
}

// ── Main ──
async function main() {
  const o = parseArgs();
  console.log(`\n${b('StaffForge AI Agent Framework — Installer')}\n`);

  let fw = findFrameworkDir();
  const isLocal = fw !== null;
  let downloaded = false;

  if (!isLocal) { fw = TMP; download(fw); downloaded = true; }
  else console.log(`${bl('→')} Using local StaffForge`);

  let p = o.platform, a = o.agent, d = o.out;
  let isGlobal = o.global || false;
  const prev = loadPrev();

  // ── Auto defaults with --yes ──
  if (o.yes) {
    p = p || 'opencode';
    a = a || 'orchestrator';
    if (!d) d = isGlobal ? null : join(CWD, 'staffforge');
  }

  if (!o.yes && prev && !p && !a && !d && !o.global) {
    console.log(`${bl('→')} Previous: ${prev.platform} (agent: ${prev.defaultAgent})${prev.global ? ' [global]' : ''}`);
    const r = await ask('  Reinstall? [Y/n]: ');
    if (r.toLowerCase() !== 'n' && r !== 'no') { p = prev.platform; a = prev.defaultAgent; d = prev.installDir; isGlobal = prev.global || false; }
  }

  if (!p) {
    console.log('\nPlatform:');
    console.log('  1) opencode    2) claude-code  3) cursor  4) copilot  5) aider  6) gemini-cli  7) all');
    const c = (await ask('\n? [1]: ')).trim();
    const m = { '2': 'claude-code', '3': 'cursor', '4': 'copilot', '5': 'aider', '6': 'gemini-cli', '7': 'all' };
    p = m[c] || c || 'opencode';
    if (!['opencode','claude-code','cursor','copilot','aider','gemini-cli','all'].includes(p)) p = 'opencode';
  }

  if (!a) {
    console.log('\nDefault agent:');
    console.log('  1) orchestrator  2) build  3) plan');
    const c = (await ask('\n? [1]: ')).trim();
    const m = { '2': 'build', '3': 'plan' };
    a = m[c] || c || 'orchestrator';
    if (!['orchestrator','build','plan'].includes(a)) a = 'orchestrator';
  }

  if (!d && !isGlobal) {
    console.log('\nLocation:');
    console.log('  1) Project   — copy to this project root (./)');
    console.log('  2) Global    — copy to platform standard directory');
    console.log('                  opencode  → ~/.config/opencode/');
    console.log('                  claude    → ~/.claude/');
    console.log('                  cursor    → ~/.cursor/');
    console.log('                  aider     → ~/.aider.rules.md');
    console.log('                  gemini-cli → ~/.gemini/');
    const c = (await ask('\n? [1]: ')).trim();
    isGlobal = c === '2';
    d = isGlobal ? null : join(CWD, 'staffforge');
  }

  if (isGlobal && !d) d = join(CWD, '.staffforge-tmp');

  d = resolve(d);
  const platforms = p === 'all' ? ['opencode','claude-code','cursor','copilot','aider','gemini-cli'] : [p];

  for (const pl of platforms) {
    runExport(fw, pl, a, join(d, pl === p || p === 'all' ? '' : pl));
  }

  if (p === 'all') {
    console.log(`\n${g('✓')} All platforms exported to staging: ${d}/`);
    if (isGlobal) {
      console.log(`${bl('→')} Copying each platform to its global directory...\n`);
      for (const pl of platforms) {
        copyResult(pl, join(d, pl), CWD, true);
      }
    }
  } else {
    console.log(`\n${g('✓')} StaffForge installed for ${p}`);
    copyResult(p, d, CWD, isGlobal);
  }

  if (p !== 'all') savePrev({ platform: p, defaultAgent: a, installDir: d, global: isGlobal });

  // Cleanup
  if (downloaded) {
    console.log(`\n${bl('→')} Cleaning up...`);
    rmSync(fw, { recursive: true, force: true });
  } else if (!isGlobal && d.startsWith(CWD) && !d.includes('node_modules')) {
    const name = process.platform === 'win32' ? 'install.ps1' : 'instala.sh';
    const sp = join(CWD, name);
    if (existsSync(sp) && !isTracked(sp)) rmSync(sp, { force: true });
    if (existsSync(d) && d !== CWD) rmSync(d, { recursive: true, force: true });
  }
  // For global, keep staging for reference and leave cleanup to user

  console.log(`\n${b(g('✓ Installation complete.'))}\n`);
  rl.close();
}

main().catch(e => { console.error(e); exit(1); });
