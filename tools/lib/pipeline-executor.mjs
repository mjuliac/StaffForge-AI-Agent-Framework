import { getRouter } from './router.mjs';
import { getScheduler } from './scheduler.mjs';

export class PipelineExecutor {
  constructor(router = null, scheduler = null) {
    this._router = router || getRouter();
    this._scheduler = scheduler || getScheduler();
  }

  execute(taskType, prompt = '', options = {}) {
    const pipeline = this._router.resolveTask(taskType, prompt);

    const plan = this._scheduler.fromRouterPipeline(pipeline);

    return {
      taskType,
      description: pipeline.description,
      modelProfile: pipeline.modelProfile || null,
      agents: pipeline.agents,
      levels: plan.levels,
      summary: plan.totalLevels > 0
        ? plan.levels.map((l, i) => `Level ${i + 1}: [${l.parallel.map(p => p.name || p.id).join(', ')}]`)
        : [],
    };
  }
}

let _defaultInstance = null;
export function getPipelineExecutor(router = null, scheduler = null) {
  if (!_defaultInstance) {
    _defaultInstance = new PipelineExecutor(router, scheduler);
  }
  return _defaultInstance;
}

export default getPipelineExecutor;
