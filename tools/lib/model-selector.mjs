import { getModelRegistry } from './model-registry.mjs';
import { getSelectionEngine } from './selection-engine.mjs';
import { getFallbackEngine } from './fallback-engine.mjs';
import { getLearningEngine } from './learning-engine.mjs';

const DEFAULT_POLICY = {
  strategy: 'intelligent',
  prefer_free: false,
  prefer_local: false,
  prefer_fastest: false,
  prefer_cheapest: false,
  fallback: true,
  learning: true,
  auto_rank: true,
  max_retries: 3,
};

export class ModelSelector {
  constructor(registry = null, selectionEngine = null, fallbackEngine = null, learningEngine = null) {
    this._registry = registry || getModelRegistry();
    this._selection = selectionEngine || getSelectionEngine();
    this._fallback = fallbackEngine || getFallbackEngine();
    this._learning = learningEngine || getLearningEngine();
    this._policy = { ...DEFAULT_POLICY };
  }

  select(taskType, options = {}) {
    const strategy = options.strategy || this._policy.strategy;
    const policy = this._resolvePolicy(options);

    if (strategy === 'cheapest') {
      return this._selectCheapest(taskType, policy);
    }
    if (strategy === 'fastest') {
      return this._selectFastest(taskType, policy);
    }
    if (strategy === 'free') {
      return this._selectFree(taskType, policy);
    }

    return this._selectIntelligent(taskType, policy);
  }

  async execute(taskType, agentFn, options = {}) {
    const model = this.select(taskType, options);
    if (!model) {
      throw new Error(`No model found for task type "${taskType}"`);
    }

    if (this._policy.fallback) {
      const result = await this._fallback.executeWithFallback(agentFn, { taskType }, model, {
        taskType,
        selectionEngine: this._selection,
        registry: this._registry,
        maxRetries: this._policy.max_retries,
      });

      if (this._policy.learning) {
        this._learning.recordExecution({
          modelId: result.modelUsed?.id || model.id,
          taskType,
          duration: result.duration,
          success: true,
          retries: result.attempts - 1,
        });
      }

      return result;
    }

    try {
      const result = await agentFn(model);
      if (this._policy.learning) {
        this._learning.recordExecution({
          modelId: model.id,
          taskType,
          success: true,
        });
      }
      return { result, modelUsed: model, attempts: 1, errors: [] };
    } catch (error) {
      if (this._policy.learning) {
        this._learning.recordExecution({
          modelId: model.id,
          taskType,
          success: false,
          error: error.message,
        });
      }
      throw error;
    }
  }

  estimateCost(model, inputTokens = 0, outputTokens = 0) {
    if (!model) return 0;
    const inputCost = (model.cost_per_1k_input || 0) * (inputTokens / 1000);
    const outputCost = (model.cost_per_1k_output || 0) * (outputTokens / 1000);
    return Math.round((inputCost + outputCost) * 1000000) / 1000000;
  }

  listAvailable(options = {}) {
    const results = this._selection.rankModels(options.taskType || 'coding', {
      provider: options.provider || null,
      minContext: options.minContext || null,
      requireTools: options.requireTools || false,
      preferFree: options.preferFree ?? this._policy.prefer_free,
      topN: options.topN || 50,
    });
    return results.map((r) => r.model);
  }

  getRanking(taskType) {
    if (this._policy.learning && this._policy.auto_rank) {
      const ranking = this._learning.getModelRanking(taskType);
      if (ranking.length > 0) return ranking;
    }
    const results = this._selection.selectTopN(taskType, { topN: 10 });
    return results.map((r) => ({
      modelId: r.model.id,
      score: r.score,
      provider: r.model.provider,
      family: r.model.family,
    }));
  }

  configure(policy) {
    Object.assign(this._policy, policy);
  }

  getPolicy() {
    return { ...this._policy };
  }

  _resolvePolicy(options) {
    return {
      preferFree: options.preferFree ?? this._policy.prefer_free,
      preferLocal: options.preferLocal ?? this._policy.prefer_local,
      provider: options.provider || null,
      requireTools: options.requireTools ?? false,
      requireReasoning: options.requireReasoning ?? false,
      minContext: options.minContext || null,
      maxCost: options.maxCost || null,
      topN: options.topN || 5,
    };
  }

  _selectIntelligent(taskType, policy) {
    const options = {
      provider: policy.provider,
      requireTools: policy.requireTools,
      requireReasoning: policy.requireReasoning,
      minContext: policy.minContext,
      maxCost: policy.maxCost,
    };

    if (policy.preferFree) {
      options.preferFree = true;
    }

    if (this._policy.learning && this._policy.auto_rank) {
      const ranking = this._learning.getModelRanking(taskType, { topN: 3 });
      if (ranking.length > 0) {
        for (const entry of ranking) {
          const model = this._registry.findById(entry.modelId);
          if (model && this._passesFilters(model, policy)) {
            return model;
          }
        }
      }
    }

    return this._selection.select(taskType, options);
  }

  _selectCheapest(taskType, policy) {
    const results = this._selection.rankModels(taskType, {
      ...policy,
      topN: 10,
    });
    let best = null;
    let bestCost = Infinity;
    for (const { model } of results) {
      const cost = (model.cost_per_1k_input || 0) + (model.cost_per_1k_output || 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = model;
      }
    }
    return best;
  }

  _selectFastest(taskType, policy) {
    const results = this._selection.rankModels(taskType, {
      ...policy,
      topN: 10,
    });
    return results.length > 0 ? results[results.length - 1].model : null;
  }

  _selectFree(taskType, policy) {
    return this._selection.select(taskType, { ...policy, preferFree: true });
  }

  _passesFilters(model, policy) {
    if (policy.provider && model.provider !== policy.provider) return false;
    if (policy.requireTools && !model.supports_tools) return false;
    if (policy.requireReasoning && !model.supports_reasoning) return false;
    if (policy.minContext && (model.context_window || 0) < policy.minContext) return false;
    if (policy.preferFree && (model.cost_per_1k_input || 0) > 0) return false;
    return true;
  }
}

let _defaultInstance = null;
export function getModelSelector(registry = null, selection = null, fallback = null, learning = null) {
  if (!_defaultInstance) {
    _defaultInstance = new ModelSelector(registry, selection, fallback, learning);
  }
  return _defaultInstance;
}

export default getModelSelector;
