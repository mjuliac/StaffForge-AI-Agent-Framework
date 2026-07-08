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
    return this._executions.filter(e => e.modelId === modelId && e.taskType === taskType).length;
  }

  getAllRankings() {
    const taskTypes = [...new Set(this._executions.map(e => e.taskType))];
    const result = {};
    for (const tt of taskTypes) {
      result[tt] = this.getModelRanking(tt, { topN: Infinity });
    }
    return result;
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
