import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const CONFIG_FILE = '.staffforge-vcs.json';

const DEFAULT_CONFIG = {
  provider: 'git',
  workflow: 'git-flow',
};

const VALID_PROVIDERS = ['git', 'svn', 'hg', 'tfvc', 'perforce', 'custom'];
const VALID_WORKFLOWS = ['git-flow', 'github-flow', 'gitlab-flow', 'trunk-based', 'custom'];

export class VCSConfig {
  constructor(configPath = null, config = null) {
    this._configPath = configPath || join(cwd(), CONFIG_FILE);
    this._config = config || null;
  }

  load() {
    if (this._config) return this._config;
    if (!existsSync(this._configPath)) return { ...DEFAULT_CONFIG };
    try {
      const raw = readFileSync(this._configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return this._validate(parsed) ? parsed : { ...DEFAULT_CONFIG };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  save(config) {
    const validated = this._validate(config) ? config : DEFAULT_CONFIG;
    writeFileSync(this._configPath, JSON.stringify(validated, null, 2) + '\n');
    return validated;
  }

  getEffectiveConfig() {
    return { ...DEFAULT_CONFIG, ...this.load() };
  }

  _validate(config) {
    if (!config || typeof config !== 'object') return false;
    if (config.provider && !VALID_PROVIDERS.includes(config.provider)) return false;
    if (config.workflow && !VALID_WORKFLOWS.includes(config.workflow)) return false;
    return true;
  }

  static getDefaults() {
    return { ...DEFAULT_CONFIG };
  }

  static isValidProvider(name) {
    return VALID_PROVIDERS.includes(name);
  }

  static isValidWorkflow(name) {
    return VALID_WORKFLOWS.includes(name);
  }

  static getValidProviders() {
    return [...VALID_PROVIDERS];
  }

  static getValidWorkflows() {
    return [...VALID_WORKFLOWS];
  }
}
