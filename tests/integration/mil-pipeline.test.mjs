import { ModelRegistry, ModelProfile, SelectionEngine, FallbackEngine, LearningEngine, ModelSelector } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const reg = new ModelRegistry();

// Integration: SelectionEngine + FallbackEngine + LearningEngine
{
  const selector = new ModelSelector();
  selector.configure({ fallback: true, learning: true });

  const model = selector.select('coding', { requireTools: true });
  assert(model !== null, 'full pipeline select model');
  assert(model.supports_tools === true, 'full pipeline tools filter');

  const models = selector.listAvailable({ taskType: 'coding', topN: 5 });
  assert(models.length > 0, 'full pipeline listAvailable');

  const ranking = selector.getRanking('coding');
  assert(ranking.length > 0, 'full pipeline getRanking');
}

// Integration: Fallback with mock
{
  const selector = new ModelSelector();
  selector.configure({ fallback: true, learning: true });

  let callCount = 0;
  const agentFn = async (model) => {
    callCount++;
    if (callCount === 1) throw new Error('primary failed');
    return { text: `done with ${model.id}` };
  };

  const result = await selector.execute('coding', agentFn);
  assert(result.modelUsed !== null, 'fallback integration modelUsed');
  assert(result.attempts >= 2, 'fallback integration attempts');
}

// Integration: Learning records after execution
{
  const learning = new LearningEngine();
  const selection = new SelectionEngine(reg);
  const selector = new ModelSelector(reg, selection, null, learning);
  selector.configure({ fallback: false, learning: true });

  const agentFn = async (model) => ({ text: `done with ${model.id}` });
  await selector.execute('coding', agentFn);

  const ranking = learning.getModelRanking('coding');
  assert(ranking.length > 0, 'learning integration ranking');
}

// Integration: All strategies return a model
{
  const selector = new ModelSelector();
  const strategies = ['intelligent', 'free', 'cheapest', 'fastest'];
  for (const strategy of strategies) {
    const model = selector.select('coding', { strategy });
    assert(model !== null, `strategy ${strategy} returns model`);
  }
}

// Integration: Profile + Selection alignment
{
  const profile = new ModelProfile();
  const selection = new SelectionEngine(reg, profile);
  const topModels = selection.selectTopN('coding', { topN: 3 });
  assert(topModels.length > 0, 'profile+selection aligned');
  assert(topModels[0].score >= 0, 'profile+selection score valid');
}

// Integration: ModelSelector with provider ranking
{
  const selector = new ModelSelector();
  selector.configure({ auto_rank: true });

  const ranking = selector.getRanking('coding');
  const providers = [...new Set(ranking.map(r => r.provider))];
  assert(providers.length > 0, 'provider ranking has providers');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
