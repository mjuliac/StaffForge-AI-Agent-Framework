import { ModelDiscovery } from '../../../tools/lib/model-discovery.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Test 1: registerAdapter and listProviders
{
  const d = new ModelDiscovery();
  d.registerAdapter('test', async () => [{ id: 'test-model' }]);
  const providers = d.listProviders();
  assert(providers.includes('test'), 'registerAdapter listed');
}

// Test 2: discoverProvider
{
  const d = new ModelDiscovery();
  d.registerAdapter('test', async () => [{ id: 'test-model', name: 'Test' }]);
  const models = await d.discoverProvider('test');
  assert(models.length === 1, 'discoverProvider length');
  assert(models[0].id === 'test-model', 'discoverProvider id');
}

// Test 3: discoverProvider throws for unknown
{
  const d = new ModelDiscovery();
  try {
    await d.discoverProvider('nonexistent');
    assert(false, 'should throw');
  } catch (e) {
    assert(e.message.includes('No discovery adapter'), 'throws unknown provider');
  }
}

// Test 4: discoverAll
{
  const d = new ModelDiscovery();
  d.registerAdapter('a', async () => [{ id: 'a1' }]);
  d.registerAdapter('b', async () => [{ id: 'b1' }, { id: 'b2' }]);
  const results = await d.discoverAll();
  assert(results.a.length === 1, 'discoverAll a');
  assert(results.b.length === 2, 'discoverAll b');
}

// Test 5: discoverAll handles adapter error gracefully
{
  const d = new ModelDiscovery();
  d.registerAdapter('failing', async () => { throw new Error('API error'); });
  d.registerAdapter('ok', async () => [{ id: 'ok-model' }]);
  const results = await d.discoverAll();
  assert(results.failing.error === 'API error', 'discoverAll error captured');
  assert(results.ok.length === 1, 'discoverAll ok unaffected');
}

// Test 6: clearAdapters
{
  const d = new ModelDiscovery();
  d.registerAdapter('test', async () => []);
  d.listProviders(); // triggers file load
  assert(d.listProviders().includes('test'), 'clearAdapters before');
  d.clearAdapters();
  // After clear, only the registered adapter is gone, but file adapters reload
  // Register a new adapter to verify clear worked
  d.registerAdapter('new', async () => []);
  assert(d.listProviders().includes('new'), 'clearAdapters new registered');
  assert(!d.listProviders().includes('test'), 'clearAdapters old gone');
}

// Test 7: discoverAll with file adapters (discovery/opencode)
{
  const d = new ModelDiscovery();
  const results = await d.discoverAll();
  if (d.listProviders().includes('opencode')) {
    assert(results.opencode !== undefined, 'file adapter loaded');
    assert(results.opencode.length >= 4, 'opencode models count');
    assert(results.opencode[0].provider === 'opencode', 'opencode provider');
  } else {
    passed++;
  }
}

// Test 8: singleton getModelDiscovery
{
  const { getModelDiscovery } = await import('../../../tools/lib/model-discovery.mjs');
  const d1 = getModelDiscovery();
  const d2 = getModelDiscovery();
  assert(d1 === d2, 'singleton same instance');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
