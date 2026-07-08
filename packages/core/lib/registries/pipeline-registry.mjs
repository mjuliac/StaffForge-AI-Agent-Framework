/**
 * PipelineRegistry - Registry for pipeline templates loaded from YAML.
 *
 * Replaces the hardcoded PIPELINE_TEMPLATES in router.mjs.
 * Supports:
 *   - Loading from YAML files
 *   - Loading from JSON files (legacy compatibility)
 *   - Dynamic registration
 *   - Task type resolution
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINES_DIR = join(__dirname, '..', '..', 'pipelines');

class PipelineRegistry {
  constructor() {
    /** @type {Map<string, object>} taskType → pipeline template */
    this._templates = new Map();
    /** @type {Map<string, object>} loader name → loader instance */
    this._loaders = new Map();
    /** @type {boolean} */
    this._loaded = false;
  }

  _ensureLoaded() {
    if (!this._loaded) {
      this.loadFromDir(PIPELINES_DIR);
      this._loaded = true;
    }
  }

  /**
   * Register a loader.
   * @param {string} name - Loader name
   * @param {object} loader - Loader with load() method
   */
  registerLoader(name, loader) {
    this._loaders.set(name, loader);
  }

  /**
   * Load pipeline templates from a directory.
   * Supports .yaml and .json files.
   * @param {string} dirPath - Directory containing pipeline files
   * @returns {number} Number of templates loaded
   */
  loadFromDir(dirPath) {
    let count = 0;

    const files = readdirSync(dirPath);
    for (const file of files) {
      const ext = extname(file);
      const filePath = join(dirPath, file);

      if (ext === '.yaml' || ext === '.yml') {
        this._loadYaml(filePath);
        count++;
      } else if (ext === '.json') {
        this._loadJson(filePath);
        count++;
      }
    }

    return count;
  }

  /**
   * Load a YAML pipeline file.
   * @param {string} filePath
   * @private
   */
  _loadYaml(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const template = this._parseSimpleYaml(content);
    if (template && template.name) {
      this._templates.set(template.name, template);
    }
  }

  /**
   * Load a JSON pipeline file.
   * @param {string} filePath
   * @private
   */
  _loadJson(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    try {
      const template = JSON.parse(content);
      if (template && template.name) {
        this._templates.set(template.name, template);
      }
    } catch (err) {
      console.error(`PipelineRegistry: failed to parse ${filePath}:`, err.message);
    }
  }

  /**
   * Simple YAML parser for pipeline files.
   * @param {string} content
   * @returns {object}
   * @private
   */
  _parseSimpleYaml(content) {
    const lines = content.split('\n');
    const result = { levels: [] };
    let currentLevel = null;

    for (const line of lines) {
      const trimmed = line.replace(/^#.*$/, '').trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('name:')) {
        result.name = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('description:')) {
        result.description = trimmed.split(':').slice(1).join(':').trim();
      } else if (trimmed.startsWith('version:')) {
        result.version = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('- name:') || trimmed.match(/^- name:/)) {
        currentLevel = { name: trimmed.split(':')[1].trim(), agents: [], parallel: false };
        result.levels.push(currentLevel);
      } else if (trimmed.startsWith('agents:') && currentLevel) {
        // agents list follows
      } else if (trimmed.startsWith('parallel:') && currentLevel) {
        currentLevel.parallel = trimmed.split(':')[1].trim() === 'true';
      } else if (trimmed.startsWith('- ') && currentLevel && !trimmed.includes(':')) {
        // Agent entry
        currentLevel.agents.push(trimmed.slice(2).trim());
      }
    }

    return result;
  }

  /**
   * Register a pipeline template directly.
   * @param {string} taskType - Task type name
   * @param {object} template - Pipeline template
   */
  register(taskType, template) {
    this._templates.set(taskType, template);
  }

  /**
   * Resolve a task type to a pipeline template.
   * @param {string} taskType - Task type
   * @returns {object|null} Pipeline template
   */
  resolve(taskType) {
    this._ensureLoaded();
    return this._templates.get(taskType) || null;
  }

  /**
   * List all registered task types.
   * @returns {string[]}
   */
  listTaskTypes() {
    this._ensureLoaded();
    return [...this._templates.keys()];
  }

  /**
   * Get all registered templates.
   * @returns {Map<string, object>}
   */
  getAll() {
    return new Map(this._templates);
  }
}

const pipelineRegistry = new PipelineRegistry();

export default pipelineRegistry;
export { PipelineRegistry, pipelineRegistry };
