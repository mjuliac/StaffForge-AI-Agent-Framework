import { VCSConfig } from '@staffforge/core';
import { writeFileSync, unlinkSync, existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

let tmpDir;

function setup() {
  tmpDir = mkdtempSync(join(tmpdir(), 'vcs-config-test-'));
}

function teardown() {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
}

// Test 1: Default config when no file exists
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const cfg = new VCSConfig(configPath);
  const result = cfg.load();
  assert(result.provider === 'git', 'default provider is git');
  assert(result.workflow === 'git-flow', 'default workflow is git-flow');
  teardown();
}

// Test 2: Load valid config file
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  writeFileSync(configPath, JSON.stringify({ provider: 'svn', workflow: 'trunk-based' }));
  const cfg = new VCSConfig(configPath);
  const result = cfg.load();
  assert(result.provider === 'svn', 'load provider svn');
  assert(result.workflow === 'trunk-based', 'load workflow trunk-based');
  teardown();
}

// Test 3: Load invalid JSON returns defaults
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  writeFileSync(configPath, 'not-json');
  const cfg = new VCSConfig(configPath);
  const result = cfg.load();
  assert(result.provider === 'git', 'invalid json fallback to git');
  assert(result.workflow === 'git-flow', 'invalid json fallback to git-flow');
  teardown();
}

// Test 4: Load with invalid provider returns defaults
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  writeFileSync(configPath, JSON.stringify({ provider: 'unknown-vcs' }));
  const cfg = new VCSConfig(configPath);
  const result = cfg.load();
  assert(result.provider === 'git', 'invalid provider fallback to git');
  teardown();
}

// Test 5: Save config writes file
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  const cfg = new VCSConfig(configPath);
  cfg.save({ provider: 'hg', workflow: 'github-flow' });
  const saved = JSON.parse(readFileSync(configPath, 'utf-8'));
  assert(saved.provider === 'hg', 'save provider hg');
  assert(saved.workflow === 'github-flow', 'save workflow github-flow');
  teardown();
}

// Test 6: getEffectiveConfig merges defaults with loaded
{
  setup();
  const configPath = join(tmpDir, '.staffforge-vcs.json');
  writeFileSync(configPath, JSON.stringify({ provider: 'perforce' }));
  const cfg = new VCSConfig(configPath);
  const result = cfg.getEffectiveConfig();
  assert(result.provider === 'perforce', 'effective provider perforce');
  assert(result.workflow === 'git-flow', 'effective workflow defaults to git-flow');
  teardown();
}

// Test 7: Static validation methods
{
  assert(VCSConfig.isValidProvider('git'), 'git is valid provider');
  assert(VCSConfig.isValidProvider('svn'), 'svn is valid provider');
  assert(!VCSConfig.isValidProvider('foobar'), 'foobar is invalid provider');
  assert(VCSConfig.isValidWorkflow('git-flow'), 'git-flow is valid workflow');
  assert(VCSConfig.isValidWorkflow('trunk-based'), 'trunk-based is valid workflow');
  assert(!VCSConfig.isValidWorkflow('unknown'), 'unknown is invalid workflow');
}

// Test 8: getDefaults
{
  const d = VCSConfig.getDefaults();
  assert(d.provider === 'git', 'getDefaults provider');
  assert(d.workflow === 'git-flow', 'getDefaults workflow');
}

// Test 9: getValidProviders and getValidWorkflows
{
  const providers = VCSConfig.getValidProviders();
  assert(providers.includes('git'), 'providers includes git');
  assert(providers.includes('svn'), 'providers includes svn');
  assert(providers.includes('hg'), 'providers includes hg');
  assert(providers.includes('tfvc'), 'providers includes tfvc');
  assert(providers.includes('perforce'), 'providers includes perforce');
  assert(providers.includes('custom'), 'providers includes custom');

  const workflows = VCSConfig.getValidWorkflows();
  assert(workflows.includes('git-flow'), 'workflows includes git-flow');
  assert(workflows.includes('github-flow'), 'workflows includes github-flow');
  assert(workflows.includes('gitlab-flow'), 'workflows includes gitlab-flow');
  assert(workflows.includes('trunk-based'), 'workflows includes trunk-based');
  assert(workflows.includes('custom'), 'workflows includes custom');
}

console.log(`\nVCSConfig: ${passed} passed, ${failed} failed`);
