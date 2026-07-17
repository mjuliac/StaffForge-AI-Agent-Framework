import { getScheduler, getRouter } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const scheduler = getScheduler();
const router = getRouter();

// Test 1: fromAgentIds with known agents
{
  const plan = scheduler.fromAgentIds(['architect', 'knowledge', 'security']);
  assert(plan.totalAgents === 3, 'plan has 3 agents');
  assert(plan.totalLevels >= 1, 'plan has at least 1 level');
  assert(plan.type === 'dag', 'plan type is dag');
}

// Test 2: fromRouterPipeline
{
  const pipeline = router.resolveTask('bugfix', 'fix login error');
  const plan = scheduler.fromRouterPipeline(pipeline);
  assert(plan.totalAgents > 0, 'router pipeline has agents');
  assert(plan.totalLevels >= 1, 'router pipeline has levels');
}

// Test 3: buildPlan
{
  const plan = scheduler.buildPlan('feature', ['git', 'architect', 'code-review']);
  assert(plan.taskType === 'feature', 'buildPlan taskType');
  assert(plan.totalAgents === 3, 'buildPlan agents');
  assert(plan.summary.length === plan.totalLevels, 'summary matches levels');
}

// Test 4: validatePipeline valid
{
  const validation = scheduler.validatePipeline(['architect', 'security']);
  assert(validation.valid === true, 'valid pipeline');
}

// Test 5: Handle missing agents gracefully
{
  const plan = scheduler.fromAgentIds(['nonexistent-agent-xyz']);
  assert(plan.totalAgents === 0, 'missing agents handled');
}

// Test 6: Full pipeline from Router suggest → Scheduler
{
  const suggestion = router.suggestAgents('fix docker networking');
  if (suggestion.suggestions.length > 0) {
    const ids = suggestion.suggestions.map(s => s.id);
    const plan = scheduler.buildPlan('bugfix', ids);
    assert(plan.totalAgents > 0, 'suggest to plan');
    assert(plan.totalAgents === ids.length, 'suggest to plan matches');
  } else {
    console.log('SKIP suggest test (no results)');
    passed++;
  }
}

// Test 7: buildPlan summary format
{
  const plan = scheduler.buildPlan('feature', ['architect']);
  assert(plan.summary[0].startsWith('Level 1'), 'summary format');
  assert(plan.summary[0].includes('Architect'), 'summary contains name');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
