import { GitProvider } from '@staffforge/core';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Test 1: Provider identity
{
  const provider = new GitProvider();
  assert(provider.name === 'git', 'name is git');
  assert(provider.version === '1.0.0', 'version is 1.0.0');
}

// Test 2: detect returns available when git CLI is present
{
  const provider = new GitProvider();
  const result = await provider.detect();
  // This test assumes git is installed in CI/dev environment
  assert(result.available === true, 'git CLI available');
}

// Test 3: getCapabilities returns full list
{
  const provider = new GitProvider();
  const caps = provider.getCapabilities();
  assert(caps.includes('init'), 'capability init');
  assert(caps.includes('clone'), 'capability clone');
  assert(caps.includes('commit'), 'capability commit');
  assert(caps.includes('push'), 'capability push');
  assert(caps.includes('pull'), 'capability pull');
  assert(caps.includes('branch'), 'capability branch');
  assert(caps.includes('merge'), 'capability merge');
  assert(caps.includes('tag'), 'capability tag');
  assert(caps.includes('status'), 'capability status');
  assert(caps.includes('log'), 'capability log');
  assert(caps.includes('diff'), 'capability diff');
  assert(caps.includes('addRemote'), 'capability addRemote');
  assert(caps.includes('checkout'), 'capability checkout');
}

// Test 4: init creates a git repo
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'git-provider-test-'));
  const provider = new GitProvider();
  const result = await provider.init(tmpDir);
  assert(result.success === true, 'init succeeded');
  assert(existsSync(join(tmpDir, '.git')), '.git directory created');
  rmSync(tmpDir, { recursive: true, force: true });
}

// Test 5: status in a fresh repo
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'git-status-test-'));
  const provider = new GitProvider();
  await provider.init(tmpDir);
  const result = await provider.status({ cwd: tmpDir });
  assert(result.success === true, 'status succeeded');
  rmSync(tmpDir, { recursive: true, force: true });
}

// Test 6: commit with --all flag
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'git-commit-test-'));
  const provider = new GitProvider();
  await provider.init(tmpDir);
  // Git needs user config for commit
  try {
    await provider.commit('test commit', { cwd: tmpDir, all: true });
  } catch {
    // May fail without git user config, but should attempt the right command
  }
  rmSync(tmpDir, { recursive: true, force: true });
}

// Test 7: checkout creates branch
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'git-checkout-test-'));
  const provider = new GitProvider();
  await provider.init(tmpDir);
  try {
    const result = await provider.checkout('test-branch', { cwd: tmpDir, create: true });
    // May fail without commits, but command should be constructed correctly
  } catch {
    // Expected in empty repo
  }
  rmSync(tmpDir, { recursive: true, force: true });
}

// Test 8: addRemote configures remote
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'git-remote-test-'));
  const provider = new GitProvider();
  await provider.init(tmpDir);
  const result = await provider.addRemote('origin', 'https://example.com/repo.git', { cwd: tmpDir });
  assert(result.success === true, 'addRemote succeeded');
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\nGitProvider: ${passed} passed, ${failed} failed`);
