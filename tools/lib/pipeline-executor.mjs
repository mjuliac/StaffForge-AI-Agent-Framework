import { getRouter } from './router.mjs';
import { getScheduler } from './scheduler.mjs';
import { getModelSelector } from './model-selector.mjs';
import { getSelectionEngine } from './selection-engine.mjs';
import { getLearningEngine } from './learning-engine.mjs';
import { TelemetryCollector } from './telemetry/collector.mjs';
import eventBus from './event-bus.mjs';

export class PipelineExecutor {
  constructor(router = null, scheduler = null) {
    this._router = router || getRouter();
    this._scheduler = scheduler || getScheduler();
  }

  execute(taskType, prompt = '', options = {}) {
    const pipeline = this._router.resolveTask(taskType, prompt);
    const plan = this._scheduler.fromRouterPipeline(pipeline);
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    eventBus.emit('pipeline:start', { runId, taskType, description: pipeline.description });

    const result = {
      taskType,
      description: pipeline.description,
      modelProfile: pipeline.modelProfile || null,
      model: null,
      telemetry: null,
      agents: pipeline.agents,
      levels: plan.levels,
      summary:
        plan.totalLevels > 0
          ? plan.levels.map((l, i) => `Level ${i + 1}: [${l.parallel.map((p) => p.name || p.id).join(', ')}]`)
          : [],
    };

    if (options.selectModel !== false) {
      const selector = getModelSelector();
      const selectionEngine = getSelectionEngine();
      const learningEngine = getLearningEngine();

      if (options.learningFeedback && learningEngine.getTotalRuns() >= 10) {
        const adjusted = learningEngine.getAdjustedWeights(selectionEngine.getWeights());
        selectionEngine.setWeights(adjusted);
      }

      result.model = selector.select(taskType, {
        requireTools: options.requireTools ?? true,
        preferFree: options.preferFree ?? false,
        provider: options.provider || null,
        minContext: options.minContext || null,
      });

      learningEngine.recordExecution({
        modelId: result.model?.id || 'none',
        taskType,
        success: true,
        duration: 0,
        tokens: 0,
        cost: 0,
        retries: 0,
      });
    }

    if (options.enableTelemetry) {
      const collector = new TelemetryCollector();
      collector.startRun(runId, taskType, {
        prompt,
        model: result.model?.id || null,
        provider: result.model?.provider || null,
        pipeline: pipeline.agents.map((a) => a.id),
      });
      collector.endRun('dry_run');
      result.telemetry = {
        runId,
        report: collector.getReport(),
      };
    }

    eventBus.emit('pipeline:complete', { runId, taskType, duration: 0 });

    return result;
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
