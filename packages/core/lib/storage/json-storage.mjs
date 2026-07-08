/**
 * JSON file-based telemetry storage implementation.
 * Persists to disk as JSONL (one JSON object per line).
 * Implements ITelemetryStorage from @staffforge/plugin-sdk.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

class JsonStorage {
  /**
   * @param {string} filePath - Path to the JSONL storage file
   */
  constructor(filePath) {
    this._filePath = filePath;
    this._ensureFile();
  }

  _ensureFile() {
    const dir = dirname(this._filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this._filePath)) {
      writeFileSync(this._filePath, '', 'utf-8');
    }
  }

  _readAll() {
    const content = readFileSync(this._filePath, 'utf-8').trim();
    if (!content) return [];
    return content
      .split('\n')
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Save execution data.
   * @param {object} runData
   * @returns {{ id: string, savedAt: string }}
   */
  save(runData) {
    const entries = this._readAll();
    const id = runData.id || `run-${entries.length + 1}`;
    const savedAt = new Date().toISOString();
    const entry = { ...runData, id, savedAt };
    appendFileSync(this._filePath, JSON.stringify(entry) + '\n', 'utf-8');
    return { id, savedAt };
  }

  /**
   * Load execution data by run ID.
   * @param {string} runId
   * @returns {object|null}
   */
  load(runId) {
    const entries = this._readAll();
    return entries.find((e) => e.id === runId) || null;
  }

  /**
   * List recent executions.
   * @param {number} [limit=10]
   * @returns {object[]}
   */
  list(limit = 10) {
    const entries = this._readAll();
    return entries.slice(-limit);
  }

  /**
   * Count total executions.
   * @returns {number}
   */
  count() {
    return this._readAll().length;
  }

  /**
   * Delete all execution data.
   * @returns {boolean}
   */
  deleteAll() {
    writeFileSync(this._filePath, '', 'utf-8');
    return true;
  }

  /**
   * Query executions by filter.
   * @param {object} filter
   * @returns {object[]}
   */
  query(filter = {}) {
    let entries = this._readAll();

    if (filter.taskType) {
      entries = entries.filter((e) => e.taskType === filter.taskType);
    }
    if (filter.status) {
      entries = entries.filter((e) => e.status === filter.status);
    }
    if (filter.from) {
      const from = new Date(filter.from);
      entries = entries.filter((e) => new Date(e.savedAt) >= from);
    }
    if (filter.to) {
      const to = new Date(filter.to);
      entries = entries.filter((e) => new Date(e.savedAt) <= to);
    }

    return entries;
  }
}

export default JsonStorage;
export { JsonStorage };
