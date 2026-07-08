import { getSelectionEngine } from './selection-engine.mjs';

export class FallbackExhaustedError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'FallbackExhaustedError';
    this.errors = errors;
  }
}

export class FallbackEngine {
  constructor(selectionEngine = null) {
    this._selectionEngine = selectionEngine || getSelectionEngine();
    this._failures = new Map();
    this._successes = new Map();
    this._triedModels = new Set();
  }

  async executeWithFallback(agentFn, taskContext, primaryModel, options = {}) {
    const maxRetries = options.maxRetries ?? 3;
    this._triedModels.clear();

    const errors = [];
    let currentModel = primaryModel;
    let attempt = 0;

    while (attempt < maxRetries && currentModel) {
      attempt++;
      this._triedModels.add(currentModel.id);

      try {
        const result = await agentFn(currentModel, taskContext);
        this.recordSuccess(currentModel.id, taskContext);
        return {
          result,
          modelUsed: currentModel,
          attempts: attempt,
          errors,
        };
      } catch (err) {
        this.recordFailure(currentModel.id, err);
        errors.push({ modelId: currentModel.id, error: err.message || String(err) });
        currentModel = this.getNextModel(currentModel, taskContext, options);
      }
    }

    throw new FallbackExhaustedError(
      `All ${attempt} model(s) exhausted`,
      errors,
    );
  }

  getNextModel(failedModel, taskType, options = {}) {
    const engine = this._selectionEngine;

    const notTried = candidates =>
      candidates.find(c => !this._triedModels.has(c.model.id));

    let candidates = engine.selectTopN(taskType, {
      ...options,
      provider: failedModel.provider,
      topN: 5,
    });
    let hit = notTried(candidates);
    if (hit) return hit.model;

    candidates = engine.selectTopN(taskType, { ...options, topN: 5 });
    hit = notTried(candidates);
    if (hit) return hit.model;

    candidates = engine.selectTopN(taskType, {
      ...options,
      preferFree: true,
      topN: 5,
    });
    hit = notTried(candidates);
    if (hit) return hit.model;

    return null;
  }

  recordFailure(modelId, error) {
    if (!this._failures.has(modelId)) {
      this._failures.set(modelId, { count: 0, errors: [] });
    }
    const record = this._failures.get(modelId);
    record.count += 1;
    record.errors.push(error.message || String(error));
  }

  recordSuccess(modelId, taskType) {
    if (!this._successes.has(modelId)) {
      this._successes.set(modelId, { count: 0, taskTypes: [] });
    }
    const record = this._successes.get(modelId);
    record.count += 1;
    if (taskType) record.taskTypes.push(taskType);
  }

  getFailureCount(modelId) {
    return this._failures.get(modelId)?.count || 0;
  }

  getSuccessCount(modelId) {
    return this._successes.get(modelId)?.count || 0;
  }
}

let _defaultInstance = null;

export function getFallbackEngine(selectionEngine = null) {
  if (!_defaultInstance) {
    _defaultInstance = new FallbackEngine(selectionEngine);
  }
  return _defaultInstance;
}

export default getFallbackEngine;
