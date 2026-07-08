import { getModelRegistry } from '../registries/model-registry.mjs';
import { getModelProfile } from '../model-profile.mjs';

export class SelectionEngine {
  constructor(modelRegistry = null, modelProfile = null) {
    this._registry = modelRegistry || getModelRegistry();
    this._profile = modelProfile || getModelProfile();
    this._weights = { profile: 0.35, capability: 0.25, priority: 0.15, cost: 0.15, reasoning: 0.1 };
  }

  select(taskType, options = {}) {
    const candidates = this.rankModels(taskType, options);
    return candidates.length > 0 ? candidates[0].model : null;
  }

  selectTopN(taskType, options = {}) {
    return this.rankModels(taskType, options);
  }

  rankModels(taskType, options = {}) {
    const {
      capabilities = [],
      requireTools = false,
      requireReasoning = false,
      provider = null,
      minContext = null,
      maxCost = null,
      preferFree = false,
      topN = 5,
    } = options;

    let models = this._registry.all();

    if (provider) {
      models = models.filter((m) => m.provider === provider);
    }
    if (requireTools) {
      models = models.filter((m) => m.supports_tools === true);
    }
    if (requireReasoning) {
      models = models.filter((m) => m.supports_reasoning === true);
    }
    if (minContext) {
      models = models.filter((m) => (m.context_window || 0) >= minContext);
    }
    if (maxCost !== null) {
      models = models.filter((m) => {
        const cost = (m.cost_per_1k_input || 0) + (m.cost_per_1k_output || 0);
        return cost <= maxCost;
      });
    }
    if (preferFree) {
      models = models.filter((m) => (m.cost_per_1k_input || 0) === 0 && (m.cost_per_1k_output || 0) === 0);
    }

    const scored = models.map((m) => ({
      model: m,
      score: this._calculateScore(m, taskType, capabilities),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
  }

  scoreModel(model, taskType, capabilities = []) {
    return this._calculateScore(model, taskType, capabilities);
  }

  _calculateScore(model, taskType, capabilities = []) {
    let score = 0;

    const profileScore = this._profileScore(model, taskType);
    score += profileScore * this._weights.profile;

    const capScore = this._capabilityScore(model, capabilities);
    score += capScore * this._weights.capability;

    const priorityScore = this._priorityScore(model);
    score += priorityScore * this._weights.priority;

    const costScore = this._costScore(model);
    score += costScore * this._weights.cost;

    const reasoningScore = this._reasoningScore(model);
    score += reasoningScore * this._weights.reasoning;

    return Math.round(score * 100) / 100;
  }

  _profileScore(model, taskType) {
    if (!taskType) return 0.5;
    const profile = this._profile.getProfile(taskType);
    if (!profile) return 0.5;
    const raw = this._profile.matchProfile(taskType, model);
    return this._normalize(raw, -100, 100);
  }

  _capabilityScore(model, capabilities) {
    if (!capabilities || capabilities.length === 0) return 0.7;
    const strengths = (model.strengths || []).map((s) => s.toLowerCase());
    const caps = capabilities.map((c) => c.toLowerCase());
    const matches = caps.filter((c) => strengths.some((s) => s.includes(c) || c.includes(s)));
    return matches.length / caps.length;
  }

  _priorityScore(model) {
    return (model.priority || 50) / 100;
  }

  _costScore(model) {
    const cost = (model.cost_per_1k_input || 0) + (model.cost_per_1k_output || 0);
    if (cost === 0) return 1.0;
    return Math.max(0, 1 - Math.log10(1 + cost * 100));
  }

  _reasoningScore(model) {
    if (model.supports_reasoning) return 1.0;
    return 0.0;
  }

  _normalize(value, min, max) {
    if (max === min) return 0.5;
    const clamped = Math.max(min, Math.min(max, value));
    return (clamped - min) / (max - min);
  }

  getWeights() {
    return { ...this._weights };
  }

  setWeights(weights) {
    Object.assign(this._weights, weights);
  }
}

let _defaultInstance = null;
export function getSelectionEngine(registry = null, profile = null) {
  if (!_defaultInstance) {
    _defaultInstance = new SelectionEngine(registry, profile);
  }
  return _defaultInstance;
}

export default getSelectionEngine;
