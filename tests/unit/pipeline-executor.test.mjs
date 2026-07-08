import { getPipelineExecutor } from '../../tools/lib/pipeline-executor.mjs';
import { getRouter } from '../../tools/lib/router.mjs';
import { getScheduler } from '../../tools/lib/scheduler.mjs';
import { getTaskMapper } from '../../tools/lib/task-mapper.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const executor = getPipelineExecutor();
const mapper = getTaskMapper();

// Test 1: Execute feature pipeline
{
  const result = executor.execute('feature', 'implement user auth');
  assert(result.taskType === 'feature', 'taskType is feature');
  assert(result.modelProfile !== null, 'has modelProfile');
  assert(result.agents.length > 0, 'has agents');
  assert(result.levels.length > 0, 'has levels');
  assert(result.summary.length === result.levels.length, 'summary matches levels');
}

// Test 2: Execute bugfix pipeline
{
  const result = executor.execute('bugfix', 'fix login crash');
  assert(result.taskType === 'bugfix', 'taskType is bugfix');
  assert(result.agents.length > 0, 'bugfix has agents');
}

// Test 3: Execute unknown task type
{
  const result = executor.execute('unknown', 'test');
  assert(result.taskType === 'unknown', 'taskType is unknown');
  assert(result.agents.length === 0, 'unknown has no agents');
  assert(result.modelProfile === null, 'unknown has no profile');
}

// Test 4: Levels contain valid agents
{
  const result = executor.execute('feature', 'build rest api');
  for (const level of result.levels) {
    for (const entry of level.parallel) {
      assert(entry.id && (entry.agent?.name || entry.name), `level agent has id: ${entry.id}`);
    }
  }
}

// Test 5: Summary format
{
  const result = executor.execute('security', 'audit auth tokens');
  for (const line of result.summary) {
    assert(line.startsWith('Level '), `summary line starts with Level: ${line}`);
  }
}

// Test 6: All pipeline types get a modelProfile
{
  for (const type of ['feature', 'bugfix', 'refactor', 'security', 'deployment', 'hotfix']) {
    const result = executor.execute(type, 'test');
    assert(result.modelProfile !== null, `${type} has modelProfile`);
  }
}

// Test 7: Pipeline with tech agents via prompt keywords
{
  const result = executor.execute('bugfix', 'fix docker networking issue');
  assert(result.agents.length > 0, 'tech agents found');
}

// Test 8: TaskMapper maps all task types
{
  const mappings = mapper.getAllMappings();
  assert(mappings.feature === 'coding', 'feature → coding');
  assert(mappings.bugfix === 'coding', 'bugfix → coding');
  assert(mappings.refactor === 'architecture', 'refactor → architecture');
  assert(mappings.security === 'security', 'security → security');
  assert(mappings.deployment === 'coding', 'deployment → coding');
  assert(mappings.hotfix === 'quick', 'hotfix → quick');
}

// Test 9: TaskMapper unknown type defaults to coding
{
  assert(mapper.mapTaskType('unknown') === 'coding', 'unknown defaults to coding');
  assert(mapper.mapTaskType('') === 'coding', 'empty defaults to coding');
}

// Test 10: PipelineExecutor levels do not duplicate tech agents
{
  const result = executor.execute('bugfix', 'fix docker networking issue');
  for (const level of result.levels) {
    const ids = level.parallel.map(p => p.id);
    const unique = new Set(ids);
    assert(ids.length === unique.size, `no duplicates in level: ${ids}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
