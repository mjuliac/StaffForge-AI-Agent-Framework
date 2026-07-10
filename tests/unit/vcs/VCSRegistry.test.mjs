import { VCSRegistry, getVCSRegistry } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Test 1: Empty registry
{
  const reg = new VCSRegistry();
  assert(reg.listProviders().length === 0, 'empty registry has no providers');
  assert(reg.listWorkflows().length === 0, 'empty registry has no workflows');
}

// Test 2: Register provider
{
  const reg = new VCSRegistry();
  const provider = { name: 'test-vcs', detect: async () => ({ available: true }) };
  reg.registerProvider('test-vcs', provider);
  assert(reg.listProviders().length === 1, 'one provider registered');
  assert(reg.listProviders()[0] === 'test-vcs', 'provider name correct');
  assert(reg.hasProvider('test-vcs'), 'hasProvider true');
}

// Test 3: Get registered provider
{
  const reg = new VCSRegistry();
  const provider = { name: 'test-vcs' };
  reg.registerProvider('test-vcs', provider);
  const result = reg.getProvider('test-vcs');
  assert(result === provider, 'getProvider returns correct object');
}

// Test 4: Get unregistered provider returns null
{
  const reg = new VCSRegistry();
  const result = reg.getProvider('nonexistent');
  assert(result === null, 'getProvider unknown returns null');
}

// Test 5: Register duplicate provider overrides
{
  const reg = new VCSRegistry();
  reg.registerProvider('dup', { name: 'first' });
  reg.registerProvider('dup', { name: 'second' });
  assert(reg.getProvider('dup').name === 'second', 'duplicate provider overrides');
}

// Test 6: Unregister provider
{
  const reg = new VCSRegistry();
  reg.registerProvider('test-vcs', { name: 'test' });
  reg.unregisterProvider('test-vcs');
  assert(!reg.hasProvider('test-vcs'), 'unregistered provider gone');
  assert(reg.listProviders().length === 0, 'empty after unregister');
}

// Test 7: Register workflow
{
  const reg = new VCSRegistry();
  const workflow = { name: 'test-flow', getBranchTypes: () => ['feature'] };
  reg.registerWorkflow('test-flow', workflow);
  assert(reg.listWorkflows().length === 1, 'one workflow registered');
  assert(reg.hasWorkflow('test-flow'), 'hasWorkflow true');
}

// Test 8: Get workflow
{
  const reg = new VCSRegistry();
  const workflow = { name: 'test-flow' };
  reg.registerWorkflow('test-flow', workflow);
  const result = reg.getWorkflow('test-flow');
  assert(result === workflow, 'getWorkflow returns correct object');
}

// Test 9: Get unregistered workflow returns null
{
  const reg = new VCSRegistry();
  assert(reg.getWorkflow('nonexistent') === null, 'getWorkflow unknown returns null');
}

// Test 10: Unregister workflow
{
  const reg = new VCSRegistry();
  reg.registerWorkflow('test-flow', { name: 'test' });
  reg.unregisterWorkflow('test-flow');
  assert(!reg.hasWorkflow('test-flow'), 'unregistered workflow gone');
}

// Test 11: Clear registry
{
  const reg = new VCSRegistry();
  reg.registerProvider('git', { name: 'git' });
  reg.registerProvider('svn', { name: 'svn' });
  reg.registerWorkflow('git-flow', { name: 'git-flow' });
  reg.clear();
  assert(reg.listProviders().length === 0, 'clear removes all providers');
  assert(reg.listWorkflows().length === 0, 'clear removes all workflows');
}

// Test 12: Singleton getVCSRegistry
{
  const a = getVCSRegistry();
  const b = getVCSRegistry();
  assert(a === b, 'singleton returns same instance');
}

console.log(`\nVCSRegistry: ${passed} passed, ${failed} failed`);
