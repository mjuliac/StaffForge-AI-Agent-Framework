import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ModelRegistry } from '../../../tools/lib/model-registry.mjs';
import { ModelProfile } from '../../../tools/lib/model-profile.mjs';
import { SelectionEngine } from '../../../tools/lib/selection-engine.mjs';
import { ModelSelector } from '../../../tools/lib/model-selector.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sel-facade-test-'));
  const modelDir = path.join(dir, 'models');
  fs.mkdirSync(modelDir);

  const models = {
    'alpha.yaml': `id: alpha
provider: prov1
family: alpha-family
name: Alpha Model
context_window: 32768
supports_tools: true
supports_reasoning: false
supports_json: true
supports_streaming: true
cost_per_1k_input: 0.001
cost_per_1k_output: 0.002
priority: 80
strengths: [coding, fast]
weaknesses: [reasoning]
`,
    'beta.yaml': `id: beta
provider: prov1
family: beta-family
name: Beta Model
context_window: 131072
supports_tools: true
supports_reasoning: true
supports_json: true
supports_streaming: true
cost_per_1k_input: 0.003
cost_per_1k_output: 0.015
priority: 90
strengths: [reasoning, architecture]
weaknesses: [cost]
`,
    'gamma.yaml': `id: gamma
provider: prov2
family: gamma-family
name: Gamma Model
context_window: 8192
supports_tools: false
supports_reasoning: true
supports_json: false
supports_streaming: true
cost_per_1k_input: 0
cost_per_1k_output: 0
priority: 50
strengths: [reasoning, planning]
weaknesses: [no-tools]
`,
  };
  for (const [f, c] of Object.entries(models)) {
    fs.writeFileSync(path.join(modelDir, f), c, 'utf-8');
  }

  const profilePath = path.join(dir, 'profiles.yaml');
  fs.writeFileSync(profilePath, `profiles:
  coding:
    prefer: [alpha-family]
    require_tools: true
    min_context: 16384
  reasoning:
    prefer: [beta-family]
    require_reasoning: true
    min_context: 65536
`, 'utf-8');

  const reg = new ModelRegistry(modelDir);
  const profile = new ModelProfile(profilePath);
  const selection = new SelectionEngine(reg, profile);
  const selector = new ModelSelector(reg, selection);

  return { dir, reg, profile, selection, selector };
}

// Test 1: select returns a model
{
  const { dir, selector } = setup();
  const model = selector.select('coding');
  assert(model !== null, 'select returns model');
  assert(model.id !== undefined, 'select has id');
  fs.rmSync(dir, { recursive: true });
}

// Test 2: select with strategy 'free'
{
  const { dir, selector } = setup();
  const model = selector.select('coding', { strategy: 'free' });
  assert(model !== null, 'free strategy returns model');
  assert(model.cost_per_1k_input === 0, 'free strategy free model');
  fs.rmSync(dir, { recursive: true });
}

// Test 3: select with strategy 'cheapest'
{
  const { dir, selector } = setup();
  const model = selector.select('coding', { strategy: 'cheapest' });
  assert(model !== null, 'cheapest strategy returns model');
  fs.rmSync(dir, { recursive: true });
}

// Test 4: select with provider filter
{
  const { dir, selector } = setup();
  const model = selector.select('coding', { provider: 'prov2' });
  assert(model !== null, 'select provider not null');
  assert(model.provider === 'prov2', 'select provider filter');
  fs.rmSync(dir, { recursive: true });
}

// Test 5: select with requireTools
{
  const { dir, selector } = setup();
  const model = selector.select('coding', { requireTools: true });
  if (model) {
    assert(model.supports_tools === true, 'select requireTools');
  } else {
    assert(true, 'select requireTools (no match OK)');
  }
  fs.rmSync(dir, { recursive: true });
}

// Test 6: estimateCost
{
  const { dir, selector, reg } = setup();
  const model = reg.findById('alpha');
  const cost = selector.estimateCost(model, 1000, 500);
  assert(typeof cost === 'number', 'estimateCost returns number');
  assert(cost >= 0, 'estimateCost non-negative');
  fs.rmSync(dir, { recursive: true });
}

// Test 7: estimateCost with null model
{
  const selector = new ModelSelector();
  const cost = selector.estimateCost(null, 100, 100);
  assert(cost === 0, 'estimateCost null model');
}

// Test 8: listAvailable returns models
{
  const { dir, selector } = setup();
  const models = selector.listAvailable({ taskType: 'coding', topN: 5 });
  assert(models.length > 0, 'listAvailable returns models');
  fs.rmSync(dir, { recursive: true });
}

// Test 9: listAvailable with provider filter
{
  const { dir, selector } = setup();
  const models = selector.listAvailable({ provider: 'prov2' });
  for (const m of models) {
    assert(m.provider === 'prov2', 'listAvailable provider filter');
  }
  fs.rmSync(dir, { recursive: true });
}

// Test 10: getRanking returns ranking
{
  const { dir, selector } = setup();
  const ranking = selector.getRanking('coding');
  assert(ranking.length > 0, 'getRanking returns results');
  assert(ranking[0].modelId !== undefined, 'getRanking has modelId');
  fs.rmSync(dir, { recursive: true });
}

// Test 11: configure and getPolicy
{
  const { dir, selector } = setup();
  selector.configure({ prefer_free: true, max_retries: 5 });
  const policy = selector.getPolicy();
  assert(policy.prefer_free === true, 'configure prefer_free');
  assert(policy.max_retries === 5, 'configure max_retries');
  fs.rmSync(dir, { recursive: true });
}

// Test 12: execute with non-fallback (success)
{
  const { dir, selector } = setup();
  selector.configure({ fallback: false, learning: false });
  const agentFn = async (model) => ({ text: `done with ${model.id}` });
  const result = await selector.execute('coding', agentFn);
  assert(result.modelUsed !== undefined, 'execute has modelUsed');
  assert(result.attempts === 1, 'execute attempts');
  fs.rmSync(dir, { recursive: true });
}

// Test 13: execute with non-fallback (failure)
{
  const { dir, selector } = setup();
  selector.configure({ fallback: false, learning: false });
  const agentFn = async () => { throw new Error('model failed'); };
  try {
    await selector.execute('coding', agentFn);
    assert(false, 'should throw');
  } catch (e) {
    assert(e.message === 'model failed', 'execute failure propagates');
  }
  fs.rmSync(dir, { recursive: true });
}

// Test 14: singleton getModelSelector
{
  const { getModelSelector } = await import('../../../tools/lib/model-selector.mjs');
  const s1 = getModelSelector();
  const s2 = getModelSelector();
  assert(s1 === s2, 'singleton same instance');
}

// Test 15: real data integration
{
  const selector = new ModelSelector();
  const model = selector.select('coding', { requireTools: true });
  assert(model !== null, 'real select');
  const models = selector.listAvailable({ taskType: 'coding' });
  assert(models.length > 0, 'real listAvailable');
  const ranking = selector.getRanking('coding');
  assert(ranking.length > 0, 'real getRanking');
}

// Test 16: default policy has defaults
{
  const selector = new ModelSelector();
  const policy = selector.getPolicy();
  assert(policy.strategy === 'intelligent', 'default strategy');
  assert(policy.fallback === true, 'default fallback');
  assert(policy.learning === true, 'default learning');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
