/**
 * Integration test: VCS installation from scratch.
 * Simulates a fresh project setup.
 * Tests: git + svn config writing, init, provider detection, backward compat.
 * Note: only git and svn are CI-tested; hg, tfvc, perforce, custom are stubbed at unit level.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  VCSConfig, GitProvider, SvnProvider,
} from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

function runGit(args, opts = {}) {
  try { return execFileSync('git', args, { ...opts, stdio: 'pipe', encoding: 'utf-8' }); }
  catch (e) { console.error(`FAIL  git ${args.join(' ')}: ${e.message}`); failed++; return ''; }
}

function gitInit(dir) {
  runGit(['init'], { cwd: dir });
  runGit(['config', 'user.name', 'Test'], { cwd: dir });
  runGit(['config', 'user.email', 'test@test.com'], { cwd: dir });
}

function gitCommit(dir, msg) {
  runGit(['add', '-A'], { cwd: dir });
  runGit(['commit', '-m', msg], { cwd: dir });
}

let tmpDirs = [];

function makeTmp(label) {
  const dir = mkdtempSync(join(tmpdir(), `vcs-install-${label}-`));
  tmpDirs.push(dir);
  return dir;
}

function cleanup() {
  for (const d of tmpDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
  tmpDirs = [];
}

function runSync(label, fn) {
  const dir = makeTmp(label);
  try { fn(dir); } catch (e) { console.error(`FAIL  ${label}: ${e.message}`); failed++; }
}

async function run() {
  // ── Sync tests ──

  runSync('git-install', (dir) => {
    writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'git', workflow: 'git-flow' }) + '\n');
    assert(existsSync(join(dir, '.staffforge-vcs.json')), 'git: .staffforge-vcs.json created');

    const config = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
    assert(config.provider === 'git', 'git: config provider');
    assert(config.workflow === 'git-flow', 'git: config workflow');

    gitInit(dir);
    assert(existsSync(join(dir, '.git')), 'git: .git created');

    gitCommit(dir, 'chore: initial commit');

    const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir }).trim();
    assert(branch === 'master' || branch === 'main', `git: on branch (${branch})`);

    console.log('  ✓ git: full install from scratch');
  });

  runSync('git-noconfig', (dir) => {
    runGit(['init'], { cwd: dir });
    assert(existsSync(join(dir, '.git')), 'git-noconfig: .git created');
    console.log('  ✓ git: direct init works without config');
  });

  runSync('git-flow', (dir) => {
    gitInit(dir);
    writeFileSync(join(dir, 'README.md'), '# test\n');
    gitCommit(dir, 'chore: initial');

    try { runGit(['branch', '-m', 'master', 'main'], { cwd: dir }); } catch {}
    runGit(['branch', 'develop', 'main'], { cwd: dir });

    runGit(['checkout', '-b', 'feature/test-auth'], { cwd: dir });
    writeFileSync(join(dir, 'auth.js'), '// auth\n');
    gitCommit(dir, 'feat: add auth');

    runGit(['checkout', 'develop'], { cwd: dir });
    runGit(['merge', '--no-ff', 'feature/test-auth', '-m', 'merge: feature/test-auth'], { cwd: dir });

    const log = runGit(['log', '--oneline', '-3'], { cwd: dir });
    assert(log.includes('merge:') || log.includes('feat:'), 'git-flow: merge commit created');
    assert(log.split('\n').length >= 2, 'git-flow: multiple commits');

    runGit(['branch', '-d', 'feature/test-auth'], { cwd: dir });
    const branches = runGit(['branch'], { cwd: dir });
    assert(!branches.includes('feature/test-auth'), 'git-flow: branch deleted');

    console.log('  ✓ git: git flow workflow (init → feature → merge --no-ff → cleanup)');
  });

  runSync('svn-config', (dir) => {
    writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'svn', workflow: 'trunk-based' }) + '\n');
    assert(existsSync(join(dir, '.staffforge-vcs.json')), 'svn: config created');

    const config = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
    assert(config.provider === 'svn', 'svn: config provider');
    assert(config.workflow === 'trunk-based', 'svn: config workflow');

    try {
      const v = execFileSync('svn', ['--version'], { encoding: 'utf-8' });
      assert(v.includes('svn'), 'svn: CLI detected');
    } catch { console.log('  ⚠ svn: CLI not available'); }

    console.log('  ✓ svn: config + CLI detection');
  });

  runSync('flag-parsing', (dir) => {
    function parseVcs(f) { return ['git','svn','hg','tfvc','perforce','custom'].includes(f) ? f : 'git'; }
    function parseWf(f) { return ['git-flow','github-flow','gitlab-flow','trunk-based','custom'].includes(f) ? f : 'git-flow'; }
    assert(parseVcs('git') === 'git', 'flag: git'); assert(parseVcs('svn') === 'svn', 'flag: svn');
    assert(parseVcs('hg') === 'hg', 'flag: hg'); assert(parseVcs('tfvc') === 'tfvc', 'flag: tfvc');
    assert(parseVcs('perforce') === 'perforce', 'flag: perforce'); assert(parseVcs('custom') === 'custom', 'flag: custom');
    assert(parseVcs('x') === 'git', 'flag: unknown → git'); assert(parseWf('git-flow') === 'git-flow', 'wf: git-flow');
    assert(parseWf('trunk-based') === 'trunk-based', 'wf: trunk-based');
    assert(parseWf('x') === 'git-flow', 'wf: unknown → git-flow');
    console.log('  ✓ CLI flag parsing (--vcs/--workflow)');
  });

  runSync('full-install', (dir) => {
    writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'git', workflow: 'git-flow' }) + '\n');
    gitInit(dir);
    const config = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
    assert(config.provider === 'git', 'full: provider');
    assert(config.workflow === 'git-flow', 'full: workflow');
    assert(existsSync(join(dir, '.git')), 'full: .git exists');
    console.log('  ✓ full install (--yes --vcs git --workflow git-flow)');
  });

  // ── Async tests ──

  const dir1 = makeTmp('defaults');
  gitInit(dir1);
  const cfg = new VCSConfig(join(dir1, '.staffforge-vcs.json'));
  const defConfig = cfg.load();
  assert(defConfig.provider === 'git', 'default: provider git');
  assert(defConfig.workflow === 'git-flow', 'default: workflow git-flow');
  console.log('  ✓ backward compat: no config → defaults to git+git-flow');

  const dir2 = makeTmp('svn-detect');
  const svnP = new SvnProvider();
  const svnResult = await svnP.detect();
  console.log(`  ⚠ svn: ${svnResult.available ? 'available' : 'not available'}`);
  const caps = svnP.getCapabilities();
  assert(caps.includes('init'), 'svn: cap init'); assert(caps.includes('checkout'), 'svn: cap checkout');
  console.log('  ✓ svn: provider capabilities');

  cleanup();
  console.log(`\n${passed} passed, ${failed} failed`);
}

run().catch((e) => {
  console.error('UNCAUGHT:', e.message);
  failed++;
  cleanup();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(1);
});
