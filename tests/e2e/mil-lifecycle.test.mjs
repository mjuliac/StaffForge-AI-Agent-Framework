import { getModelRegistry } from '../../tools/lib/model-registry.mjs';
import { getModelSelector } from '../../tools/lib/model-selector.mjs';
import { TelemetryCollector } from '../../tools/lib/telemetry/collector.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// E2E: Full agent lifecycle with model selection + telemetry
{
  const selector = getModelSelector();
  const telemetry = new TelemetryCollector();
  const registry = getModelRegistry();

  const taskType = 'coding';
  const agentId = 'test-e2e-agent';

  telemetry.startRun('e2e-test-1', taskType, {
    pipeline: [agentId],
    model: 'auto-select',
  });

  const model = selector.select(taskType, { requireTools: true });
  assert(model !== null, 'e2e model selected');
  assert(model.id !== undefined, 'e2e model has id');

  telemetry.recordAgentCall(agentId, {
    duration: 150,
    tokens: 450,
    provider: model.provider,
    model: model.id,
    status: 'success',
  });

  const report = telemetry.endRun('completed');
  assert(report.status === 'completed', 'e2e telemetry completed');
  assert(report.total_tokens === 450, 'e2e telemetry tokens');
  assert(report.model === model.id, 'e2e telemetry model id');
}

// E2E: Select different models for different task types
{
  const selector = getModelSelector();
  const taskTypes = ['coding', 'architecture', 'reasoning', 'quick'];
  const selectedModels = [];

  for (const tt of taskTypes) {
    const model = selector.select(tt);
    assert(model !== null, `e2e select for ${tt}`);
    selectedModels.push({ taskType: tt, modelId: model.id, provider: model.provider });
  }

  const uniqueModels = [...new Set(selectedModels.map(s => s.modelId))];
  assert(uniqueModels.length >= 1, 'e2e at least one model selected');
}

// E2E: Cost estimation for a full pipeline
{
  const selector = getModelSelector();
  const model = selector.select('coding', { requireTools: true });

  const pipelineSteps = [
    { name: 'architect', inputTokens: 2000, outputTokens: 1500 },
    { name: 'developer', inputTokens: 5000, outputTokens: 3000 },
    { name: 'reviewer', inputTokens: 1500, outputTokens: 800 },
  ];

  let totalCost = 0;
  for (const step of pipelineSteps) {
    const cost = selector.estimateCost(model, step.inputTokens, step.outputTokens);
    totalCost += cost;
    assert(typeof cost === 'number', `e2e cost for ${step.name}`);
  }
  assert(totalCost >= 0, 'e2e total pipeline cost');
}

// E2E: List available models with constraints
{
  const selector = getModelSelector();
  const withTools = selector.listAvailable({ requireTools: true });
  const freeModels = selector.listAvailable({ taskType: 'coding', preferFree: true });

  assert(withTools.length > 0, 'e2e models with tools');
  if (freeModels.length > 0) {
    for (const m of freeModels) {
      assert(m.cost_per_1k_input === 0, 'e2e free model zero cost');
    }
  }
}

// E2E: Configure policy and verify effect
{
  const selector = getModelSelector();
  selector.configure({ prefer_free: true, strategy: 'free' });
  const policy = selector.getPolicy();
  assert(policy.prefer_free === true, 'e2e policy prefer_free');
  assert(policy.strategy === 'free', 'e2e policy strategy');

  const model = selector.select('coding');
  assert(model !== null, 'e2e free strategy select');
}

// E2E: Model ranking consistency
{
  const selector = getModelSelector();
  const rank1 = selector.getRanking('coding');
  const rank2 = selector.getRanking('coding');

  assert(rank1.length === rank2.length, 'e2e ranking consistent length');
  if (rank1.length > 0) {
    assert(rank1[0].modelId === rank2[0].modelId, 'e2e ranking consistent order');
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
