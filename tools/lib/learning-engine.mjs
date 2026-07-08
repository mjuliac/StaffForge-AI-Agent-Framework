import { TelemetryStorage } from './telemetry/storage.mjs';

export class LearningEngine {
  constructor(storage = null) {
    this._storage = storage;
    this._executions = [];
  }

  recordExecution({ modelId, agentId, taskType, duration, tokens, cost, success, error, retries }) {
    const execution = {
      modelId,
      agentId,
      taskType,
      duration,
      tokens,
      cost,
      success,
      error,
      retries,
      timestamp: new Date().toISOString(),
    };
    this._executions.push(execution);
    if (this._storage) {
      this._storage.save(execution);
    }
  }

  getModelRanking(taskType, { topN = 5 } = {}) {
    const modelExecs = {};
    for (const exec of this._executions) {
      if (exec.taskType !== taskType) continue;
      if (!modelExecs[exec.modelId]) modelExecs[exec.modelId] = [];
      modelExecs[exec.modelId].push(exec);
    }

    const rankings = Object.entries(modelExecs).map(([modelId, execs]) => {
      const totalRuns = execs.length;
      const successCount = execs.filter(e => e.success).length;
      const successRate = successCount / totalRuns;
      const avgDuration = execs.reduce((s, e) => s + e.duration, 0) / totalRuns;
      const avgTokens = execs.reduce((s, e) => s + e.tokens, 0) / totalRuns;

      const durationScore = avgDuration > 0 ? 1 / (1 + avgDuration) : 0;
      const tokensScore = avgTokens > 0 ? 1 / (1 + avgTokens) : 0;

      const score = successRate * 0.6 + durationScore * 0.2 + tokensScore * 0.2;

      return { modelId, score, successRate, avgDuration, avgTokens, totalRuns };
    });

    rankings.sort((a, b) => b.score - a.score);
    return rankings.slice(0, topN);
  }

  getSuccessRate(modelId, taskType) {
    const execs = this._executions.filter(e => e.modelId === modelId && e.taskType === taskType);
    if (execs.length === 0) return 0;
    return execs.filter(e => e.success).length / execs.length;
  }

  getAverageCost(modelId) {
    const execs = this._executions.filter(e => e.modelId === modelId);
    if (execs.length === 0) return 0;
    return execs.reduce((s, e) => s + e.cost, 0) / execs.length;
  }

  getTotalRuns(modelId, taskType) {
    if (!modelId && !taskType) return this._executions.length;
    const filtered = this._executions.filter(e => {
      if (modelId && e.modelId !== modelId) return false;
      if (taskType && e.taskType !== taskType) return false;
      return true;
    });
    return filtered.length;
  }

  getAllRankings() {
    const taskTypes = [...new Set(this._executions.map(e => e.taskType))];
    const result = {};
    for (const tt of taskTypes) {
      result[tt] = this.getModelRanking(tt, { topN: Infinity });
    }
    return result;
  }

  getAdjustedWeights(baseWeights = null) {
    const weights = { ...(baseWeights || { profile: 0.35, capability: 0.25, priority: 0.15, cost: 0.15, reasoning: 0.10 }) };
    const totalRuns = this._executions.length;
    if (totalRuns < 10) return weights;

    const allRankings = this.getAllRankings();
    let totalRanked = 0;
    let freeSuccessCount = 0;
    let freeTotalCount = 0;
    let complexSuccessCount = 0;
    let complexTotalCount = 0;

    for (const [, rankings] of Object.entries(allRankings)) {
      for (const r of rankings) {
        totalRanked++;
        const modelExecs = this._executions.filter(e => e.modelId === r.modelId);
        const isFree = modelExecs.every(e => (e.cost || 0) === 0);
        if (isFree) {
          freeTotalCount += r.totalRuns;
          freeSuccessCount += Math.round(r.totalRuns * r.successRate);
        }
        const isComplex = modelExecs.some(e => e.taskType === 'architecture' || e.taskType === 'security');
        if (isComplex) {
          complexTotalCount += r.totalRuns;
          complexSuccessCount += Math.round(r.totalRuns * r.successRate);
        }
      }
    }

    if (freeTotalCount > 0) {
      const freeSuccessRate = freeSuccessCount / freeTotalCount;
      if (freeSuccessRate > 0.8) {
        weights.cost = Math.min(0.30, weights.cost + 0.05);
        weights.priority = Math.max(0.10, weights.priority - 0.025);
        weights.reasoning = Math.max(0.05, weights.reasoning - 0.025);
      }
    }

    if (complexTotalCount > 0) {
      const complexSuccessRate = complexSuccessCount / complexTotalCount;
      if (complexSuccessRate > 0.7) {
        weights.reasoning = Math.min(0.20, weights.reasoning + 0.05);
      }
    }

    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const key of Object.keys(weights)) {
        weights[key] /= sum;
      }
    }

    return weights;
  }

  clearHistory() {
    this._executions = [];
  }
}

let _instance = null;

export function getLearningEngine(storage = null) {
  if (!_instance) {
    _instance = new LearningEngine(storage);
  }
  return _instance;
}

export default LearningEngine;
