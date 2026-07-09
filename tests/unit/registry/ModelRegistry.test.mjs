import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ModelRegistry } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

function tmpModelsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-registry-test-'));
  const models = {
    'test-alpha.yaml': `id: test-alpha
provider: testp
family: testf
name: Test Alpha
context_window: 4096
supports_tools: true
supports_reasoning: false
supports_json: true
supports_streaming: true
cost_per_1k_input: 0
cost_per_1k_output: 0
priority: 50
strengths: [coding, fast]
weaknesses: [reasoning]
`,
    'test-beta.yaml': `id: test-beta
provider: testp
family: testf
name: Test Beta
context_window: 8192
supports_tools: true
supports_reasoning: true
supports_json: true
supports_streaming: true
cost_per_1k_input: 0.001
cost_per_1k_output: 0.002
priority: 80
strengths: [reasoning, architecture]
weaknesses: [cost]
`,
    'other-gamma.yaml': `id: other-gamma
provider: otherp
family: gamma
name: Other Gamma
context_window: 32768
supports_tools: false
supports_reasoning: true
supports_json: false
supports_streaming: true
cost_per_1k_input: 0
cost_per_1k_output: 0
priority: 30
strengths: [reasoning, planning]
weaknesses: [no-tools]
`,
  };
  for (const [f, content] of Object.entries(models)) {
    fs.writeFileSync(path.join(dir, f), content, 'utf-8');
  }
  return dir;
}

// Test 1: load
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  reg.load();
  assert(reg.count() === 3, 'load count');
  fs.rmSync(dir, { recursive: true });
}

// Test 2: all
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const models = reg.all();
  assert(models.length === 3, 'all length');
  fs.rmSync(dir, { recursive: true });
}

// Test 3: findById
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const m = reg.findById('test-alpha');
  assert(m !== null, 'findById found');
  assert(m.name === 'Test Alpha', 'findById name');
  assert(reg.findById('nonexistent') === null, 'findById not found');
  fs.rmSync(dir, { recursive: true });
}

// Test 4: findByProvider
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const models = reg.findByProvider('testp');
  assert(models.length === 2, 'findByProvider testp');
  assert(reg.findByProvider('noprov').length === 0, 'findByProvider none');
  fs.rmSync(dir, { recursive: true });
}

// Test 5: findByFamily
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const models = reg.findByFamily('gamma');
  assert(models.length === 1, 'findByFamily gamma');
  fs.rmSync(dir, { recursive: true });
}

// Test 6: findByCapability
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const models = reg.findByCapability('reasoning');
  assert(models.length >= 2, 'findByCapability reasoning');
  fs.rmSync(dir, { recursive: true });
}

// Test 7: findWithTools
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const models = reg.findWithTools();
  assert(models.length === 2, 'findWithTools');
  fs.rmSync(dir, { recursive: true });
}

// Test 8: findWithReasoning
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const models = reg.findWithReasoning();
  assert(models.length === 2, 'findWithReasoning');
  fs.rmSync(dir, { recursive: true });
}

// Test 9: findFree
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const models = reg.findFree();
  assert(models.length === 2, 'findFree');
  fs.rmSync(dir, { recursive: true });
}

// Test 10: listProviders
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const providers = reg.listProviders();
  assert(providers.includes('testp'), 'listProviders testp');
  assert(providers.includes('otherp'), 'listProviders otherp');
  fs.rmSync(dir, { recursive: true });
}

// Test 11: listFamilies
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const families = reg.listFamilies();
  assert(families.includes('testf'), 'listFamilies testf');
  assert(families.includes('gamma'), 'listFamilies gamma');
  fs.rmSync(dir, { recursive: true });
}

// Test 12: findByTaskType
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const coding = reg.findByTaskType('coding');
  assert(coding.length >= 1, 'findByTaskType coding');
  fs.rmSync(dir, { recursive: true });
}

// Test 13: register new model
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  reg.register({
    id: 'new-model',
    provider: 'newp',
    family: 'newf',
    name: 'New Model',
    context_window: 16384,
    supports_tools: true,
    supports_reasoning: true,
    supports_json: true,
    supports_streaming: true,
    cost_per_1k_input: 0.005,
    cost_per_1k_output: 0.015,
    priority: 90,
    strengths: ['coding'],
    weaknesses: [],
  });
  assert(reg.count() === 4, 'register count');
  assert(reg.findById('new-model') !== null, 'register findable');
  fs.rmSync(dir, { recursive: true });
}

// Test 14: register duplicate throws
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  try {
    reg.register({ id: 'test-alpha', provider: 'x', family: 'x', name: 'x', context_window: 1, supports_tools: false, supports_reasoning: false, supports_json: false, supports_streaming: false, cost_per_1k_input: 0, cost_per_1k_output: 0, priority: 0 });
    assert(false, 'should throw on duplicate');
  } catch (e) {
    assert(e.message.includes('already registered'), 'duplicate error');
  }
  fs.rmSync(dir, { recursive: true });
}

// Test 15: toJSON
{
  const dir = tmpModelsDir();
  const reg = new ModelRegistry(dir);
  const json = reg.toJSON();
  assert(json.length === 3, 'toJSON length');
  assert(json[0].id === 'other-gamma', 'toJSON id (sorted)');
  fs.rmSync(dir, { recursive: true });
}

// Test 16: singleton getModelRegistry
{
  const { getModelRegistry } = await import('@staffforge/core');
  const reg1 = getModelRegistry();
  const reg2 = getModelRegistry();
  assert(reg1 === reg2, 'singleton same instance');
}

// Test 17: load from real models dir
{
  const reg = new ModelRegistry();
  reg.load();
  assert(reg.count() >= 14, 'real models count');
  assert(reg.listProviders().length >= 4, 'real providers');
}

// Test 18: findById from real models
{
  const reg = new ModelRegistry();
  const m = reg.findById('gpt-4o');
  assert(m !== null, 'real findById gpt-4o');
  assert(m.provider === 'openai', 'real gpt-4o provider');
}

// Test 19: findByTaskType with real data
{
  const reg = new ModelRegistry();
  const coding = reg.findByTaskType('coding');
  assert(coding.length > 0, 'real coding models');
}

// Test 20: findFree with real data
{
  const reg = new ModelRegistry();
  const free = reg.findFree();
  assert(free.length >= 2, 'real free models');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
