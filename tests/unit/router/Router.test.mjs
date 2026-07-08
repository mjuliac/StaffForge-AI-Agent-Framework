import { getRouter } from '../../../tools/lib/router.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const router = getRouter();

// Test 1: resolveTask for feature
{
  const pipeline = router.resolveTask('feature', 'implement login with Python');
  assert(pipeline.taskType === 'feature', 'resolveTask taskType');
  assert(pipeline.agents.length > 0, 'resolveTask has agents');
  assert(pipeline.description, 'resolveTask has description');
}

// Test 2: resolveTask for bugfix
{
  const pipeline = router.resolveTask('bugfix', 'fix database connection error');
  assert(pipeline.taskType === 'bugfix', 'bugfix taskType');
  assert(pipeline.agents.length > 0, 'bugfix has agents');
}

// Test 3: resolveTask for unknown type
{
  const pipeline = router.resolveTask('unknown-task-type');
  assert(pipeline.agents.length === 0, 'unknown type empty agents');
  assert(pipeline.description.includes('Unknown'), 'unknown type message');
}

// Test 4: buildPipeline orders by dependencies
{
  const order = router.buildPipeline(['testing', 'architect']);
  assert(Array.isArray(order), 'buildPipeline returns array');
  assert(order.length === 2, 'buildPipeline length');
}

// Test 5: suggestAgents returns suggestions
{
  const result = router.suggestAgents('implement python flask api');
  assert(result.intent, 'suggestAgents has intent');
  assert(result.suggestions.length > 0, 'suggestAgents has suggestions');
  assert(result.suggestions[0].id, 'suggestAgents has id');
  assert(result.suggestions[0].score !== undefined, 'suggestAgents has score');
}

// Test 6: suggestAgents with no match
{
  const result = router.suggestAgents('zzzzyxwv nonexis tent');
  assert(result.suggestions.length >= 0, 'suggestAgents no crash on no match');
}

// Test 7: suggestAgents returns top N
{
  const result = router.suggestAgents('python', { topN: 2 });
  assert(result.suggestions.length <= 2, 'suggestAgents topN');
}

// Test 8: resolveTask adds tech agents from prompt
{
  const pipeline = router.resolveTask('feature', 'python django postgres');
  const ids = pipeline.agents.map(a => a.id);
  const hasPython = ids.some(id => id.includes('python'));
  assert(hasPython, 'resolveTask includes python');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
