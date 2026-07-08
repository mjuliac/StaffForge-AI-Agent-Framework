/**
 * In-memory telemetry storage implementation.
 * Default storage for development and testing.
 * Implements ITelemetryStorage from @staffforge/plugin-sdk.
 */

class MemoryStorage {
  constructor() {
    /** @type {Map<string, object>} */
    this._entries = new Map();
    /** @type {number} */
    this._counter = 0;
  }

  /**
   * Save execution data.
   * @param {object} runData - Execution data to persist
   * @returns {{ id: string, savedAt: string }}
   */
  save(runData) {
    const id = runData.id || `run-${++this._counter}`;
    const savedAt = new Date().toISOString();
    const entry = { ...runData, id, savedAt };
    this._entries.set(id, entry);
    return { id, savedAt };
  }

  /**
   * Load execution data by run ID.
   * @param {string} runId
   * @returns {object|null}
   */
  load(runId) {
    return this._entries.get(runId) || null;
  }

  /**
   * List recent executions.
   * @param {number} [limit=10]
   * @returns {object[]}
   */
  list(limit = 10) {
    const entries = [...this._entries.values()];
    return entries.slice(-limit);
  }

  /**
   * Count total executions.
   * @returns {number}
   */
  count() {
    return this._entries.size;
  }

  /**
   * Delete all execution data.
   * @returns {boolean}
   */
  deleteAll() {
    this._entries.clear();
    return true;
  }

  /**
   * Query executions by filter.
   * @param {object} filter
   * @param {string} [filter.taskType]
   * @param {string} [filter.status]
   * @param {string} [filter.from] - ISO date string
   * @param {string} [filter.to] - ISO date string
   * @returns {object[]}
   */
  query(filter = {}) {
    let entries = [...this._entries.values()];

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

export default MemoryStorage;
export { MemoryStorage };
