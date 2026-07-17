import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ModelProfile } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const profileYaml = `profiles:
  coding:
    prefer: [deepseek, claude]
    require_tools: true
    min_context: 32768
    max_cost: 0.01
  testing:
    prefer: [deepseek]
    require_tools: true
    min_context: 16384
  quick:
    prefer: [miMo]
    require_tools: false
    min_context: 4096
    max_cost: 0
`;

const sampleModels = [
  { id: 'deepseek-v4', family: 'deepseek', supports_tools: true, supports_reasoning: true, context_window: 131072, cost_per_1k_input: 0, cost_per_1k_output: 0 },
  { id: 'claude-sonnet-4', family: 'claude', supports_tools: true, supports_reasoning: true, context_window: 200000, cost_per_1k_input: 0.003, cost_per_1k_output: 0.015 },
  { id: 'miMo', family: 'miMo', supports_tools: true, supports_reasoning: true, context_window: 32768, cost_per_1k_input: 0, cost_per_1k_output: 0 },
  { id: 'gpt-4o-mini', family: 'gpt-4', supports_tools: true, supports_reasoning: true, context_window: 128000, cost_per_1k_input: 0.00015, cost_per_1k_output: 0.0006 },
  { id: 'llama-3-70b', family: 'llama', supports_tools: false, supports_reasoning: true, context_window: 32768, cost_per_1k_input: 0, cost_per_1k_output: 0 },
];

function tmpProfile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-test-'));
  const file = path.join(dir, 'profiles.yaml');
  fs.writeFileSync(file, content, 'utf-8');
  return { dir, file };
}

// Test 1: load profiles
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  p.load();
  assert(p.listProfiles().length === 3, 'load count');
  fs.rmSync(dir, { recursive: true });
}

// Test 2: getProfile
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  const profile = p.getProfile('coding');
  assert(profile !== null, 'getProfile found');
  assert(profile.prefer.includes('deepseek'), 'getProfile prefer');
  assert(profile.require_tools === true, 'getProfile require_tools');
  fs.rmSync(dir, { recursive: true });
}

// Test 3: getProfile not found
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  assert(p.getProfile('nonexistent') === null, 'getProfile not found');
  fs.rmSync(dir, { recursive: true });
}

// Test 4: listProfiles
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  const list = p.listProfiles();
  assert(list.includes('coding'), 'listProfiles coding');
  assert(list.includes('testing'), 'listProfiles testing');
  fs.rmSync(dir, { recursive: true });
}

// Test 5: matchProfile scores preferred model higher
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  const scoreDeepseek = p.matchProfile('coding', sampleModels[0]);
  const scoreLlama = p.matchProfile('coding', sampleModels[4]);
  assert(scoreDeepseek > scoreLlama, 'preferred model scores higher');
  fs.rmSync(dir, { recursive: true });
}

// Test 6: matchProfile penalizes missing tools
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  const score = p.matchProfile('coding', sampleModels[4]); // llama: no tools
  assert(score < 0, 'missing tools penalized');
  fs.rmSync(dir, { recursive: true });
}

// Test 7: matchProfile no profile returns 0
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  const score = p.matchProfile('nonexistent', sampleModels[0]);
  assert(score === 0, 'no profile returns 0');
  fs.rmSync(dir, { recursive: true });
}

// Test 8: rankModels returns sorted
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  const ranked = p.rankModels('coding', sampleModels);
  assert(ranked.length === sampleModels.length, 'rankModels count');
  assert(ranked[0].score >= ranked[1].score, 'rankModels sorted');
  assert(ranked[0].model.id !== undefined, 'rankModels has model');
  fs.rmSync(dir, { recursive: true });
}

// Test 9: registerProfile
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  p.registerProfile('custom', { prefer: ['test'], require_tools: false });
  assert(p.getProfile('custom') !== null, 'registerProfile found');
  assert(p.listProfiles().includes('custom'), 'registerProfile listed');
  fs.rmSync(dir, { recursive: true });
}

// Test 10: toJSON
{
  const { dir, file } = tmpProfile(profileYaml);
  const p = new ModelProfile(file);
  const json = p.toJSON();
  assert(json.coding !== undefined, 'toJSON coding');
  assert(json.testing !== undefined, 'toJSON testing');
  fs.rmSync(dir, { recursive: true });
}

// Test 11: load from real file
{
  const p = new ModelProfile();
  p.load();
  const profiles = p.listProfiles();
  assert(profiles.length >= 4, 'real profiles count');
  assert(profiles.includes('coding'), 'real profiles coding');
}

// Test 12: matchProfile with real data
{
  const p = new ModelProfile();
  const model = { id: 'deepseek-v4-flash-free', family: 'deepseek', supports_tools: true, supports_reasoning: true, context_window: 131072, cost_per_1k_input: 0, cost_per_1k_output: 0 };
  const score = p.matchProfile('coding', model);
  assert(score > 0, 'real matchProfile positive');
}

// Test 13: singleton getModelProfile
{
  const { getModelProfile } = await import('@staffforge/core');
  const p1 = getModelProfile();
  const p2 = getModelProfile();
  assert(p1 === p2, 'singleton same instance');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
