import { FallbackEngine, FallbackExhaustedError, getFallbackEngine } from '../../../tools/lib/fallback-engine.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// --- mock models ---
const modelAlpha  = { id: 'alpha',  provider: 'prov1', name: 'Alpha'  };
const modelBeta   = { id: 'beta',   provider: 'prov1', name: 'Beta'   };
const modelGamma  = { id: 'gamma',  provider: 'prov2', name: 'Gamma'  };
const modelDelta  = { id: 'delta',  provider: 'prov2', name: 'Delta'  };
const modelFree   = { id: 'freebie', provider: 'prov3', name: 'Free',
                      cost_per_1k_input: 0, cost_per_1k_output: 0 };
const allModels   = [modelAlpha, modelBeta, modelGamma, modelDelta, modelFree];

class MockSelectionEngine {
  selectTopN(_taskType, options = {}) {
    let pool = [...allModels];
    if (options.provider) pool = pool.filter(m => m.provider === options.provider);
    if (options.preferFree) pool = pool.filter(m =>
      (m.cost_per_1k_input || 0) === 0 && (m.cost_per_1k_output || 0) === 0);
    const topN = options.topN || 5;
    return pool.slice(0, topN).map(m => ({ model: m, score: 1 }));
  }
}

// --- 1. Constructor ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  assert(e instanceof FallbackEngine,              'constructor creates instance');
  assert(typeof e.executeWithFallback === 'function', 'has executeWithFallback');
  assert(typeof e.getNextModel === 'function',        'has getNextModel');
  assert(typeof e.recordFailure === 'function',       'has recordFailure');
  assert(typeof e.recordSuccess === 'function',       'has recordSuccess');
}

// --- 2. Singleton ---
{
  const a = getFallbackEngine();
  const b = getFallbackEngine();
  assert(a === b, 'singleton returns same instance');
  assert(a instanceof FallbackEngine, 'singleton is FallbackEngine');
}

// --- 3. executeWithFallback succeeds on first try ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  const agentFn = async (m) => ({ ok: true, id: m.id });
  const r = await e.executeWithFallback(agentFn, 'test', modelAlpha);
  assert(r.result.ok     === true,  'result ok');
  assert(r.modelUsed.id  === 'alpha', 'modelUsed is alpha');
  assert(r.attempts      === 1,     'attempts = 1');
  assert(r.errors.length === 0,     'no errors');
}

// --- 4. executeWithFallback falls back when primary fails ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  const agentFn = async (m) => {
    if (m.id === 'alpha') throw new Error('primary failed');
    return { ok: true };
  };
  const r = await e.executeWithFallback(agentFn, 'test', modelAlpha);
  assert(r.result.ok     === true,  'fallback succeeded');
  assert(r.modelUsed.id  === 'beta', 'fallback to beta (same provider)');
  assert(r.attempts      === 2,     'attempts = 2');
  assert(r.errors.length === 1,     'one error recorded');
}

// --- 5. executeWithFallback all models fail -> throws ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  const agentFn = async (m) => { throw new Error(`fail: ${m.id}`); };
  try {
    await e.executeWithFallback(agentFn, 'test', modelAlpha, { maxRetries: 3 });
    assert(false, 'should have thrown');
  } catch (err) {
    assert(err instanceof FallbackExhaustedError, 'threw FallbackExhaustedError');
    assert(err.errors.length > 0, 'errors array non-empty');
  }
}

// --- 6. getNextModel after failure returns alternative ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  e._triedModels.add('alpha');
  const next = e.getNextModel(modelAlpha, 'test');
  assert(next !== null,      'getNextModel returns model');
  assert(next.id !== 'alpha', 'next is not the failed model');
  assert(next.id === 'beta',  'next is beta (same provider)');
}

// --- 7. getNextModel returns null when no alternatives ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  for (const m of allModels) e._triedModels.add(m.id);
  const next = e.getNextModel(modelAlpha, 'test');
  assert(next === null, 'getNextModel returns null when exhausted');
}

// --- 8. recordFailure increments counter ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  e.recordFailure('alpha', new Error('err1'));
  assert(e.getFailureCount('alpha') === 1, 'failure count = 1');
  e.recordFailure('alpha', new Error('err2'));
  assert(e.getFailureCount('alpha') === 2, 'failure count = 2');
  assert(e.getFailureCount('unknown') === 0, 'unknown model count = 0');
}

// --- 9. recordSuccess increments counter ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  e.recordSuccess('alpha', 'coding');
  assert(e.getSuccessCount('alpha') === 1, 'success count = 1');
  e.recordSuccess('alpha', 'testing');
  assert(e.getSuccessCount('alpha') === 2, 'success count = 2');
  assert(e.getSuccessCount('unknown') === 0, 'unknown model count = 0');
}

// --- 10. maxRetries limit respected ---
{
  const e = new FallbackEngine(new MockSelectionEngine());
  const agentFn = async (m) => { throw new Error('fail'); };
  try {
    await e.executeWithFallback(agentFn, 'test', modelAlpha, { maxRetries: 1 });
    assert(false, 'should have thrown');
  } catch (err) {
    assert(err instanceof FallbackExhaustedError, 'threw FallbackExhaustedError');
    assert(err.errors.length === 1, 'only 1 attempt with maxRetries=1');
  }
}

// --- 11. Integration with real SelectionEngine ---
{
  const e = new FallbackEngine();
  const agentFn = async (m) => {
    // succeed on any model to exercise the real path
    return { ok: true, id: m.id };
  };
  const fakeModel = { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o' };
  const r = await e.executeWithFallback(agentFn, 'coding', fakeModel, { maxRetries: 1 });
  assert(r.result.ok === true, 'real selection engine integration');
  assert(r.attempts  === 1,    'single attempt with real engine');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
