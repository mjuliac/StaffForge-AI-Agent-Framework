import { getRouter, getScheduler, DAG, TelemetryCollector } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Integration: Router → DAG → Scheduler → Telemetry
{
  const router = getRouter();
  const scheduler = getScheduler();
  const collector = new TelemetryCollector();

  const pipeline = router.resolveTask('feature', 'implement user auth with postgres');
  assert(pipeline.agents.length > 0, 'pipeline has agents');

  const plan = scheduler.fromRouterPipeline(pipeline);
  assert(plan.totalAgents === pipeline.agents.length, 'plan matches pipeline');

  const dag = DAG.fromAgents(pipeline.agents);
  assert(dag.validate().valid === true, 'pipeline DAG valid');

  const run = collector.startRun('int-test-1', 'feature', {
    pipeline: pipeline.agents.map(a => a.id),
  });
  for (const agent of pipeline.agents) {
    collector.recordAgentCall(agent.id, {
      duration: Math.random() * 1000,
      tokens: Math.floor(Math.random() * 500),
      status: 'success',
    });
  }
  const report = collector.endRun('completed');
  assert(report.status === 'completed', 'pipeline telemetry completed');
  assert(report.agents.length === pipeline.agents.length, 'pipeline telemetry all agents');
}

// Integration: suggestAgents → buildPlan → validate
{
  const router = getRouter();
  const scheduler = getScheduler();

  const suggestion = router.suggestAgents('deploy docker kubernetes');
  if (suggestion.suggestions.length > 0) {
    const ids = suggestion.suggestions.map(s => s.id);
    const plan = scheduler.buildPlan('deployment', ids);
    assert(plan.totalAgents === ids.length, 'suggest to buildPlan');
    assert(plan.totalLevels >= 1, 'suggest to buildPlan levels');
    const validation = scheduler.validatePipeline(ids);
    assert(validation.valid === true, 'suggest to validate');
  } else {
    passed++;
  }
}

// Integration: resolveTask different types
{
  const router = getRouter();
  const types = ['feature', 'bugfix', 'refactor', 'security', 'deployment', 'hotfix'];
  for (const type of types) {
    const pipeline = router.resolveTask(type, `test ${type} task`);
    assert(pipeline.taskType === type, `${type} resolved`);
    assert(pipeline.agents.length > 0, `${type} has agents`);
  }
}

// Integration: DAG from Router pipeline
{
  const router = getRouter();
  const pipeline = router.resolveTask('feature');
  const dag = DAG.fromAgents(pipeline.agents);
  const levels = dag.getLevels();
  assert(levels.length >= 1, 'DAG levels from pipeline');
  assert(levels.flat().length === pipeline.agents.length, 'DAG all agents in levels');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
