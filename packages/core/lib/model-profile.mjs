import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { resolveRoot } from './find-project-root.mjs';

const root = resolveRoot(import.meta.url);

export class ModelProfile {
  constructor(profilesPath = null) {
    this._profilesPath = profilesPath || join(root, 'models', 'profiles.yaml');
    this._profiles = null;
  }

  load() {
    if (this._profiles) return this;

    const content = readFileSync(this._profilesPath, 'utf-8');
    const data = yaml.load(content);

    if (!data || !data.profiles) {
      throw new Error('profiles.yaml must contain a "profiles" key');
    }

    this._profiles = data.profiles;
    return this;
  }

  getProfile(taskType) {
    this.load();
    return this._profiles[taskType] || null;
  }

  listProfiles() {
    this.load();
    return Object.keys(this._profiles).sort();
  }

  matchProfile(taskType, model) {
    this.load();
    const profile = this._profiles[taskType];
    if (!profile) return 0;

    let score = 0;

    if (profile.prefer) {
      const modelFamily = model.family?.toLowerCase() || '';
      const modelId = model.id?.toLowerCase() || '';
      for (const preferred of profile.prefer) {
        const p = preferred.toLowerCase();
        if (modelFamily.includes(p) || p.includes(modelFamily)) score += 20;
        if (modelId.includes(p) || p.includes(modelId)) score += 15;
      }
    }

    if (profile.require_tools && model.supports_tools) score += 10;
    if (profile.require_tools && !model.supports_tools) score -= 50;

    if (profile.require_reasoning && model.supports_reasoning) score += 10;
    if (profile.require_reasoning && !model.supports_reasoning) score -= 50;

    if (profile.min_context && (model.context_window || 0) >= profile.min_context) score += 5;
    if (profile.min_context && (model.context_window || 0) < profile.min_context) score -= 20;

    const modelCost = (model.cost_per_1k_input || 0) + (model.cost_per_1k_output || 0);
    if (profile.max_cost !== undefined && modelCost <= profile.max_cost) score += 5;
    if (profile.max_cost !== undefined && modelCost > profile.max_cost) score -= 20;

    return score;
  }

  rankModels(taskType, models) {
    this.load();
    const scored = models.map((m) => ({
      model: m,
      score: this.matchProfile(taskType, m),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  registerProfile(taskType, profile) {
    this.load();
    this._profiles[taskType] = profile;
  }

  toJSON() {
    this.load();
    return { ...this._profiles };
  }
}

let _defaultInstance = null;
export function getModelProfile() {
  if (!_defaultInstance) {
    _defaultInstance = new ModelProfile();
  }
  return _defaultInstance;
}

export default getModelProfile;
