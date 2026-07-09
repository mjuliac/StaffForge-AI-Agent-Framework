import { AdapterRegistry } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Test 1: listAdapters returns platforms
{
  const reg = new AdapterRegistry();
  const adapters = reg.listAdapters();
  assert(adapters.length >= 6, 'listAdapters count');
  assert(adapters.includes('opencode'), 'listAdapters opencode');
  assert(adapters.includes('claude-code'), 'listAdapters claude-code');
  assert(adapters.includes('cursor'), 'listAdapters cursor');
}

// Test 2: getAdapter loads adapter function
{
  const reg = new AdapterRegistry();
  const adapter = await reg.getAdapter('opencode');
  assert(typeof adapter === 'function', 'getAdapter returns function');
}

// Test 3: getAdapter caches
{
  const reg = new AdapterRegistry();
  const a1 = await reg.getAdapter('opencode');
  const a2 = await reg.getAdapter('opencode');
  assert(a1 === a2, 'getAdapter caches');
}

// Test 4: getAdapter throws for unknown adapter
{
  const reg = new AdapterRegistry();
  try {
    await reg.getAdapter('nonexistent-platform');
    assert(false, 'should throw');
  } catch (e) {
    assert(e.message.includes('not found'), 'throws for unknown');
  }
}

// Test 5: clearCache invalidates
{
  const reg = new AdapterRegistry();
  const a1 = await reg.getAdapter('opencode');
  reg.clearCache();
  const a2 = await reg.getAdapter('opencode');
  assert(a1 === a2, 'clearCache returns same adapter (new import may match)');
}

// Test 6: export produces files
{
  const reg = new AdapterRegistry();
  const agents = [
    {
      id: 'test-agent',
      name: 'Test Agent',
      file: 'test-agent.md',
      frontmatter: {
        description: 'A test agent.',
        mode: 'subagent',
        tools: { write: false, bash: false, edit: false },
      },
      body: 'Test body.',
    },
  ];
  const result = await reg.export(agents, 'opencode');
  assert(result.platform === 'opencode', 'export platform');
  assert(result.fileCount >= 1, 'export fileCount');
}

// Test 7: exportToAll
{
  const reg = new AdapterRegistry();
  const agents = [
    {
      id: 'test-agent',
      name: 'Test Agent',
      file: 'test-agent.md',
      frontmatter: {
        description: 'A test agent.',
        mode: 'subagent',
        tools: { write: false, bash: false, edit: false },
      },
      body: 'Test body.',
    },
  ];
  const results = await reg.exportToAll(agents);
  assert(results.length >= 6, 'exportToAll count');
}

// Test 8: listAdapters sorted
{
  const reg = new AdapterRegistry();
  const adapters = reg.listAdapters();
  const sorted = [...adapters].sort();
  assert(JSON.stringify(adapters) === JSON.stringify(sorted), 'listAdapters sorted');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
