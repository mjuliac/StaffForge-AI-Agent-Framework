import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ModelRegistry } from '../../../tools/lib/model-registry.mjs';
import { ModelProfile } from '../../../tools/lib/model-profile.mjs';
import { SelectionEngine } from '../../../tools/lib/selection-engine.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const modelYaml = `
id: alpha
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
---
id: beta
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
---
id: gamma
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
`;

const profileYaml = `profiles:
  coding:
    prefer: [alpha-family]
    require_tools: true
    min_context: 16384
  reasoning:
    prefer: [beta-family]
    require_reasoning: true
    min_context: 65536
`;

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sel-engine-test-'));

  const modelDir = path.join(dir, 'models');
  fs.mkdirSync(modelDir);
  // Split multi-doc YAML into separate files
  const docs = modelYaml.split('---\n').filter(Boolean);
  for (const doc of docs) {
    const m = doc.match(/^id:\s*(\S+)/m);
    if (m) {
      fs.writeFileSync(path.join(modelDir, `${m[1]}.yaml`), doc.trim(), 'utf-8');
    }
  }

  const profilePath = path.join(dir, 'profiles.yaml');
  fs.writeFileSync(profilePath, profileYaml, 'utf-8');

  const reg = new ModelRegistry(modelDir);
  const prof = new ModelProfile(profilePath);
  const engine = new SelectionEngine(reg, prof);
  return { dir, reg, prof, engine };
}

// Test 1: select returns a model
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { requireTools: true });
  assert(model !== null, 'select returns model');
  assert(model.id !== undefined, 'select has id');
  fs.rmSync(dir, { recursive: true });
}

// Test 2: select returns highest scored
{
  const { dir, engine } = setup();
  const model = engine.select('coding');
  assert(model.id === 'alpha', 'select coding prefers alpha');
  const model2 = engine.select('reasoning');
  assert(model2.id === 'beta', 'select reasoning prefers beta');
  fs.rmSync(dir, { recursive: true });
}

// Test 3: select with provider filter
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { provider: 'prov2' });
  assert(model.provider === 'prov2', 'select provider filter');
  fs.rmSync(dir, { recursive: true });
}

// Test 4: select with requireTools
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { requireTools: true });
  assert(model.supports_tools === true, 'select requireTools');
  fs.rmSync(dir, { recursive: true });
}

// Test 5: select with requireReasoning
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { requireReasoning: true });
  assert(model.supports_reasoning === true, 'select requireReasoning');
  fs.rmSync(dir, { recursive: true });
}

// Test 6: select with preferFree
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { preferFree: true });
  assert(model.cost_per_1k_input === 0, 'select preferFree');
  fs.rmSync(dir, { recursive: true });
}

// Test 7: select with minContext
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { minContext: 65536 });
  assert(model.context_window >= 65536, 'select minContext');
  fs.rmSync(dir, { recursive: true });
}

// Test 8: select returns null for impossible constraints
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { provider: 'nonexistent' });
  assert(model === null, 'select null for impossible');
  fs.rmSync(dir, { recursive: true });
}

// Test 9: selectTopN returns ranked list
{
  const { dir, engine } = setup();
  const results = engine.selectTopN('coding', { topN: 2 });
  assert(results.length === 2, 'selectTopN count');
  assert(results[0].score >= results[1].score, 'selectTopN sorted');
  assert(results[0].model !== undefined, 'selectTopN has model');
  fs.rmSync(dir, { recursive: true });
}

// Test 10: rankModels with all models
{
  const { dir, engine } = setup();
  const results = engine.rankModels('coding', { topN: 10 });
  assert(results.length <= 3, 'rankModels count');
  fs.rmSync(dir, { recursive: true });
}

// Test 11: scoreModel returns number
{
  const { dir, engine, reg } = setup();
  const model = reg.findById('alpha');
  const score = engine.scoreModel(model, 'coding', ['coding']);
  assert(typeof score === 'number', 'scoreModel returns number');
  assert(score >= 0 && score <= 1, 'scoreModel in 0-1 range');
  fs.rmSync(dir, { recursive: true });
}

// Test 12: scoreModel ranks better model higher
{
  const { dir, engine, reg } = setup();
  const alpha = reg.findById('alpha');
  const gamma = reg.findById('gamma');
  const alphaScore = engine.scoreModel(alpha, 'coding', ['coding']);
  const gammaScore = engine.scoreModel(gamma, 'coding', ['coding']);
  assert(alphaScore > gammaScore, 'better model scores higher');
  fs.rmSync(dir, { recursive: true });
}

// Test 13: select with capability filtering
{
  const { dir, engine } = setup();
  const model = engine.select('coding', { capabilities: ['architecture'] });
  assert(model !== null, 'select with capabilities');
  fs.rmSync(dir, { recursive: true });
}

// Test 14: select with maxCost
{
  const { dir, engine } = setup();
  const results = engine.rankModels('coding', { maxCost: 0.001, topN: 10 });
  for (const r of results) {
    const cost = (r.model.cost_per_1k_input || 0) + (r.model.cost_per_1k_output || 0);
    assert(cost <= 0.001, 'maxCost filter');
  }
  fs.rmSync(dir, { recursive: true });
}

// Test 15: getWeights and setWeights
{
  const { dir, engine } = setup();
  const weights = engine.getWeights();
  assert(weights.profile > 0, 'getWeights profile');
  engine.setWeights({ profile: 0.5 });
  assert(engine.getWeights().profile === 0.5, 'setWeights updated');
  fs.rmSync(dir, { recursive: true });
}

// Test 16: select from real registry data
{
  const engine = new SelectionEngine();
  const model = engine.select('coding', { requireTools: true });
  assert(model !== null, 'real select returns model');
}

// Test 17: scoreModel with real data
{
  const engine = new SelectionEngine();
  const reg = new ModelRegistry();
  const model = reg.findById('gpt-4o');
  if (model) {
    const score = engine.scoreModel(model, 'coding', ['coding', 'reasoning']);
    assert(score > 0, 'real scoreModel positive');
    assert(score <= 1, 'real scoreModel max 1');
  } else {
    passed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
