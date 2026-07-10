import { VCSManager, VCSRegistry } from '@staffforge/core';
import { writeFileSync, unlinkSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

function makeMockProvider(name) {
  return {
    name,
    detect: async () => ({ available: true }),
    init: async (path) => ({ success: true }),
    clone: async () => ({ success: true }),
    checkout: async () => ({ success: true }),
    commit: async () => ({ success: true }),
    push: async () => ({ success: true }),
    pull: async () => ({ success: true }),
    merge: async () => ({ success: true }),
    branch: async () => ({ success: true }),
    tag: async () => ({ success: true }),
    status: async () => ({ success: true, data: '' }),
    log: async () => ({ success: true, data: '' }),
    diff: async () => ({ success: true, data: '' }),
    addRemote: async () => ({ success: true }),
    getCapabilities: () => ['init', 'commit', 'push', 'pull', 'branch', 'merge', 'tag', 'status', 'log', 'diff'],
  };
}

function makeMockWorkflow(name) {
  return {
    name,
    getBranchName: (type, n) => `${type}/${n}`,
    getCommitPrefix: (type) => ({ feature: 'feat', bugfix: 'fix' }[type] || type),
    getMergeFlags: () => ['--no-ff'],
    getBranchTypes: () => ['feature', 'bugfix', 'hotfix'],
    validate: () => ({ valid: true, errors: [] }),
  };
}

let tmpDir;

function setup() {
  tmpDir = mkdtempSync(join(tmpdir(), 'vcs-manager-test-'));
}

function teardown() {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
}

// Test 1: Constructor defaults
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const mgr = new VCSManager(configPath);
  const cfg = mgr.getConfig();
  assert(cfg.provider === 'git', 'default provider git');
  assert(cfg.workflow === 'git-flow', 'default workflow git-flow');
  teardown();
}

// Test 2: GetActiveProvider returns null when not registered
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const mgr = new VCSManager(configPath);
  const provider = mgr.getActiveProvider();
  assert(provider === null, 'null provider when not registered');
  teardown();
}

// Test 3: GetActiveProvider returns registered provider
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const registry = new VCSRegistry();
  registry.registerProvider('git', makeMockProvider('git'));
  const mgr = new VCSManager(configPath, registry);
  const provider = mgr.getActiveProvider();
  assert(provider !== null, 'provider found');
  assert(provider.name === 'git', 'provider name git');
  teardown();
}

// Test 4: Execute operation delegates to provider
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const registry = new VCSRegistry();
  registry.registerProvider('git', makeMockProvider('git'));
  const mgr = new VCSManager(configPath, registry);
  const result = await mgr.status();
  assert(result.success === true, 'status delegated to provider');
  teardown();
}

// Test 5: Execute operation throws when provider not registered
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const mgr = new VCSManager(configPath);
  try {
    await mgr.status();
    assert(false, 'should throw');
  } catch (e) {
    assert(e.message.includes('No active VCS provider'), 'throws on missing provider');
  }
  teardown();
}

// Test 6: getActiveWorkflow returns null when not registered
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const mgr = new VCSManager(configPath);
  const wf = mgr.getActiveWorkflow();
  assert(wf === null, 'null workflow when not registered');
  teardown();
}

// Test 7: getActiveWorkflow returns registered workflow
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const registry = new VCSRegistry();
  registry.registerWorkflow('git-flow', makeMockWorkflow('git-flow'));
  const mgr = new VCSManager(configPath, registry);
  const wf = mgr.getActiveWorkflow();
  assert(wf !== null, 'workflow found');
  assert(wf.name === 'git-flow', 'workflow name git-flow');
  teardown();
}

// Test 8: formatBranchName delegates to workflow
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const registry = new VCSRegistry();
  registry.registerWorkflow('git-flow', makeMockWorkflow('git-flow'));
  const mgr = new VCSManager(configPath, registry);
  const name = mgr.formatBranchName('feature', 'my-feature');
  assert(name === 'feature/my-feature', 'formatBranchName');
  teardown();
}

// Test 9: formatBranchName fallback when no workflow
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const mgr = new VCSManager(configPath);
  const name = mgr.formatBranchName('feature', 'my-feature');
  assert(name === 'feature/my-feature', 'fallback branch name');
  teardown();
}

// Test 10: clearCache forces re-read
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const registry = new VCSRegistry();
  registry.registerProvider('git', makeMockProvider('git'));
  const mgr = new VCSManager(configPath, registry);
  mgr.getActiveProvider();
  mgr.clearCache();
  assert(mgr._providerCache === null, 'cache cleared');
  teardown();
}

// Test 11: detect delegates to provider
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const registry = new VCSRegistry();
  registry.registerProvider('git', makeMockProvider('git'));
  const mgr = new VCSManager(configPath, registry);
  const result = await mgr.detect();
  assert(result.available === true, 'detect available');
  teardown();
}

// Test 12: detect with no provider
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const mgr = new VCSManager(configPath);
  const result = await mgr.detect();
  assert(result.available === false, 'detect not available');
  assert(result.error !== undefined, 'detect has error message');
  teardown();
}

console.log(`\nVCSManager: ${passed} passed, ${failed} failed`);
