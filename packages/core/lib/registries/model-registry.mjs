import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { resolveRoot } from '../find-project-root.mjs';

const root = resolveRoot(import.meta.url);

function parseModel(file, content) {
  const data = yaml.load(content);
  if (!data || !data.id) return null;
  return data;
}

export class ModelRegistry {
  constructor(modelsDir = null) {
    this._modelsDir = modelsDir || join(root, 'models');
    this._models = null;
    this._byProvider = null;
    this._byFamily = null;
  }

  load() {
    if (this._models) return this;

    const files = readdirSync(this._modelsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    this._models = [];
    this._byProvider = {};
    this._byFamily = {};

    for (const file of files.sort()) {
      const content = readFileSync(join(this._modelsDir, file), 'utf-8');
      try {
        const model = parseModel(file, content);
        if (!model) continue;
        this._models.push(model);

        if (!this._byProvider[model.provider]) {
          this._byProvider[model.provider] = [];
        }
        this._byProvider[model.provider].push(model);

        if (!this._byFamily[model.family]) {
          this._byFamily[model.family] = [];
        }
        this._byFamily[model.family].push(model);
      } catch {
        // skip non-model files (profiles.yaml, etc.)
      }
    }

    return this;
  }

  all() {
    this.load();
    return this._models;
  }

  count() {
    this.load();
    return this._models.length;
  }

  findById(id) {
    this.load();
    return this._models.find((m) => m.id === id) || null;
  }

  findByProvider(provider) {
    this.load();
    return this._byProvider[provider] || [];
  }

  findByFamily(family) {
    this.load();
    return this._byFamily[family] || [];
  }

  findByCapability(capability) {
    this.load();
    return this._models.filter((m) =>
      (m.strengths || []).some((s) => s.includes(capability) || capability.includes(s)),
    );
  }

  findByTaskType(taskType) {
    this.load();
    const taskMap = {
      coding: ['coding', 'code', 'programming', 'development'],
      architecture: ['architecture', 'design', 'planning', 'ddd', 'clean'],
      documentation: ['documentation', 'writing', 'docs'],
      testing: ['testing', 'test', 'qa'],
      review: ['review', 'audit', 'code-review'],
      security: ['security', 'vulnerability', 'pentest'],
      reasoning: ['reasoning', 'analysis', 'planning'],
    };
    const signals = taskMap[taskType] || [taskType];
    return this._models.filter((m) => (m.strengths || []).some((s) => signals.some((sig) => s.includes(sig))));
  }

  findWithTools() {
    this.load();
    return this._models.filter((m) => m.supports_tools === true);
  }

  findWithReasoning() {
    this.load();
    return this._models.filter((m) => m.supports_reasoning === true);
  }

  findFree() {
    this.load();
    return this._models.filter((m) => (m.cost_per_1k_input || 0) === 0 && (m.cost_per_1k_output || 0) === 0);
  }

  listProviders() {
    this.load();
    return Object.keys(this._byProvider).sort();
  }

  listFamilies() {
    this.load();
    return Object.keys(this._byFamily).sort();
  }

  register(model) {
    this.load();
    if (this._models.find((m) => m.id === model.id)) {
      throw new Error(`Model "${model.id}" already registered`);
    }
    this._models.push(model);
    if (!this._byProvider[model.provider]) this._byProvider[model.provider] = [];
    this._byProvider[model.provider].push(model);
    if (!this._byFamily[model.family]) this._byFamily[model.family] = [];
    this._byFamily[model.family].push(model);
    return model;
  }

  toJSON() {
    this.load();
    return this._models.map((m) => ({ ...m }));
  }
}

let _defaultInstance = null;
export function getModelRegistry() {
  if (!_defaultInstance) {
    _defaultInstance = new ModelRegistry();
  }
  return _defaultInstance;
}

export default getModelRegistry;
