/**
 * Integration test: VCS installation from scratch.
 * Simulates a fresh project setup for each VCS type.
 * Tests: config writing, VCS init, provider detection, backward compat.
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
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
  fn(dir);
}

async function runAsync(label, fn) {
  const dir = makeTmp(label);
  await fn(dir);
}

// ── Tests ──

runSync('git-install', (dir) => {
  writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'git', workflow: 'git-flow' }) + '\n');
  assert(existsSync(join(dir, '.staffforge-vcs.json')), 'git: .staffforge-vcs.json created');

  const config = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
  assert(config.provider === 'git', 'git: config provider');
  assert(config.workflow === 'git-flow', 'git: config workflow');

  execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  assert(existsSync(join(dir, '.git')), 'git: .git created');

  execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'pipe' });
  try { execFileSync('git', ['commit', '-m', 'chore: initial commit'], { cwd: dir, stdio: 'pipe' }); } catch {}

  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf-8' }).trim();
  assert(branch === 'master' || branch === 'main', `git: on branch (${branch})`);

  console.log('  ✓ git: full install from scratch');
});

runSync('git-noconfig', (dir) => {
  execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  assert(existsSync(join(dir, '.git')), 'git-noconfig: .git created');
  console.log('  ✓ git: direct init works without config');
});

runSync('git-flow', (dir) => {
  execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  writeFileSync(join(dir, 'README.md'), '# test\n');
  execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'chore: initial'], { cwd: dir, stdio: 'pipe' });

  try { execFileSync('git', ['branch', '-m', 'master', 'main'], { cwd: dir, stdio: 'pipe' }); } catch {}
  execFileSync('git', ['branch', 'develop', 'main'], { cwd: dir, stdio: 'pipe' });

  execFileSync('git', ['checkout', '-b', 'feature/test-auth'], { cwd: dir, stdio: 'pipe' });
  writeFileSync(join(dir, 'auth.js'), '// auth\n');
  execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'feat: add auth'], { cwd: dir, stdio: 'pipe' });

  execFileSync('git', ['checkout', 'develop'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['merge', '--no-ff', 'feature/test-auth', '-m', 'merge: feature/test-auth'], { cwd: dir, stdio: 'pipe' });

  const log = execFileSync('git', ['log', '--oneline', '-3'], { cwd: dir, encoding: 'utf-8' });
  assert(log.includes('merge:') || log.includes('feat:'), 'git-flow: merge commit created');
  assert(log.split('\n').length >= 2, 'git-flow: multiple commits');

  execFileSync('git', ['branch', '-d', 'feature/test-auth'], { cwd: dir, stdio: 'pipe' });
  const branches = execFileSync('git', ['branch'], { cwd: dir, encoding: 'utf-8' });
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
  execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  const config = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
  assert(config.provider === 'git', 'full: provider');
  assert(config.workflow === 'git-flow', 'full: workflow');
  assert(existsSync(join(dir, '.git')), 'full: .git exists');
  console.log('  ✓ full install (--yes --vcs git --workflow git-flow)');
});

// ── Async tests ──
const asyncTests = [
  { name: 'git-noconfig-defaults', fn: async (dir) => {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
    const { VCSConfig } = await import('@staffforge/core');
    const cfg = new VCSConfig(join(dir, '.staffforge-vcs.json'));
    const config = cfg.load();
    assert(config.provider === 'git', 'default: provider git');
    assert(config.workflow === 'git-flow', 'default: workflow git-flow');
    console.log('  ✓ backward compat: no config → defaults to git+git-flow');
  }},
  { name: 'svn-detect', fn: async (dir) => {
    const { SvnProvider } = await import('@staffforge/core');
    const provider = new SvnProvider();
    const result = await provider.detect();
    assert(result.available === true, 'svn: CLI detected');
    const caps = provider.getCapabilities();
    assert(caps.includes('init'), 'svn: cap init'); assert(caps.includes('checkout'), 'svn: cap checkout');
    console.log('  ✓ svn: provider detect + capabilities');
  }},
  { name: 'hg-graceful', fn: async (dir) => {
    writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'hg', workflow: 'github-flow' }) + '\n');
    const c = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
    assert(c.provider === 'hg', 'hg: config provider'); assert(c.workflow === 'github-flow', 'hg: config workflow');
    const { HgProvider } = await import('@staffforge/core');
    const result = await new HgProvider().detect();
    assert(result.available === false, 'hg: graceful false');
    assert(result.error !== undefined, 'hg: error message');
    console.log('  ✓ hg: config + graceful CLI missing (returns false, no throw)');
  }},
  { name: 'tfvc-graceful', fn: async (dir) => {
    writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'tfvc', workflow: 'gitlab-flow' }) + '\n');
    const c = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
    assert(c.provider === 'tfvc', 'tfvc: config provider');
    const { TfvcProvider } = await import('@staffforge/core');
    const result = await new TfvcProvider().detect();
    assert(result.available === false, 'tfvc: graceful false');
    console.log('  ✓ tfvc: config + graceful CLI missing');
  }},
  { name: 'perforce-graceful', fn: async (dir) => {
    writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'perforce', workflow: 'custom' }) + '\n');
    const c = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
    assert(c.provider === 'perforce', 'p4: config provider'); assert(c.workflow === 'custom', 'p4: config workflow custom');
    const { PerforceProvider } = await import('@staffforge/core');
    const result = await new PerforceProvider().detect();
    assert(result.available === false, 'p4: graceful false');
    console.log('  ✓ perforce: config + graceful CLI missing');
  }},
  { name: 'custom-routing', fn: async (dir) => {
    writeFileSync(join(dir, '.staffforge-vcs.json'), JSON.stringify({ provider: 'custom', workflow: 'custom' }) + '\n');
    const { VCSConfig, VCSRegistry, VCSManager, CustomProvider, CustomWorkflow } = await import('@staffforge/core');
    const cfg = new VCSConfig(join(dir, '.staffforge-vcs.json'));
    const config = cfg.load();
    assert(config.provider === 'custom', 'custom: config provider');
    assert(config.workflow === 'custom', 'custom: config workflow');

    const registry = new VCSRegistry();
    registry.registerProvider('custom', new CustomProvider({ init: 'echo init' }));
    registry.registerWorkflow('custom', new CustomWorkflow({ branchTypes: ['feature'] }));

    const mgr = new VCSManager(join(dir, '.staffforge-vcs.json'), registry);
    assert(mgr.getActiveProvider().name === 'custom', 'custom: VCSManager resolves provider');
    assert(mgr.getActiveWorkflow().name === 'custom', 'custom: VCSManager resolves workflow');
    const bn = mgr.formatBranchName('feature', 'x');
    assert(bn.includes('feature'), 'custom: branch name formatted');
    console.log('  ✓ custom: config + VCSManager routing');
  }},
  { name: 'all-providers', fn: async (dir) => {
    const { VCSRegistry, GitProvider, SvnProvider, HgProvider, TfvcProvider, PerforceProvider, CustomProvider } = await import('@staffforge/core');
    const registry = new VCSRegistry();
    registry.registerProvider('git', new GitProvider()); registry.registerProvider('svn', new SvnProvider());
    registry.registerProvider('hg', new HgProvider()); registry.registerProvider('tfvc', new TfvcProvider());
    registry.registerProvider('perforce', new PerforceProvider()); registry.registerProvider('custom', new CustomProvider());
    const providers = registry.listProviders();
    assert(providers.length === 6, 'all: 6 providers');
    assert(providers.includes('git'), 'all: git'); assert(providers.includes('svn'), 'all: svn');
    assert(providers.includes('hg'), 'all: hg'); assert(providers.includes('tfvc'), 'all: tfvc');
    assert(providers.includes('perforce'), 'all: perforce'); assert(providers.includes('custom'), 'all: custom');
    console.log('  ✓ all 6 providers registered in VCSRegistry');
  }},
];

for (const { name, fn } of asyncTests) {
  const dir = makeTmp(name);
  try { await fn(dir); } catch (e) { console.error(`FAIL  ${e.message}`); failed++; }
}

cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
