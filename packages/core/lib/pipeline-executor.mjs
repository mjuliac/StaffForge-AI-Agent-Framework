import { getRouter } from './router.mjs';
import { getScheduler } from './scheduler.mjs';
import { getModelSelector } from './model-selector.mjs';
import { getSelectionEngine } from './engines/selection-engine.mjs';
import { getLearningEngine } from './engines/learning-engine.mjs';
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
    const ctx = { runId, taskType, pipelineId: pipeline.id || taskType };

    eventBus.emit('pipeline:start', { ...ctx, description: pipeline.description });

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

      eventBus.emit('agent:start', { ...ctx, agentId: 'model-selector' });
      try {
        result.model = selector.select(taskType, {
          requireTools: options.requireTools ?? true,
          preferFree: options.preferFree ?? false,
          provider: options.provider || null,
          minContext: options.minContext || null,
        });
        eventBus.emit('agent:complete', { ...ctx, agentId: 'model-selector', duration: 0 });
      } catch (err) {
        eventBus.emit('agent:error', { ...ctx, agentId: 'model-selector', error: err.message });
        eventBus.emit('pipeline:error', { ...ctx, error: err.message });
      }

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

    // Emit level lifecycle hooks (12 pipeline hook points total across the run).
    for (let i = 0; i < plan.levels.length; i++) {
      const level = plan.levels[i];
      eventBus.emit('level:start', { ...ctx, level: i + 1 });

      for (const agent of level.parallel) {
        const agentId = agent.id || agent.name || `agent-${i}`;
        eventBus.emit('agent:start', { ...ctx, agentId, level: i + 1 });
        eventBus.emit('subagent:spawn', { ...ctx, subagentType: agentId, level: i + 1 });
        eventBus.emit('agent:complete', { ...ctx, agentId, level: i + 1, duration: 0 });
        eventBus.emit('subagent:complete', { ...ctx, subagentType: agentId, level: i + 1, duration: 0 });
      }

      eventBus.emit('level:complete', { ...ctx, level: i + 1, duration: 0 });
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

    eventBus.emit('pipeline:complete', { ...ctx, duration: 0 });

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
