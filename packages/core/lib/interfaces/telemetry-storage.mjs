/**
 * Telemetry storage interface for persisting pipeline execution data.
 * Core provides MemoryStorage and JsonStorage.
 * Enterprise provides SQLiteStorage and PostgresStorage.
 */
export class ITelemetryStorage {
  /**
   * Save execution data.
   * @param {object} runData - Execution data to persist
   * @returns {{ id: string, savedAt: string }} Saved entry metadata
   */
  save(runData) {
    throw new Error('ITelemetryStorage.save() must be implemented');
  }

  /**
   * Load execution data by run ID.
   * @param {string} runId - Run identifier
   * @returns {object|null} Run data or null
   */
  load(runId) {
    throw new Error('ITelemetryStorage.load() must be implemented');
  }

  /**
   * List recent executions.
   * @param {number} [limit] - Maximum number of entries
   * @returns {object[]} Array of run data
   */
  list(limit) {
    throw new Error('ITelemetryStorage.list() must be implemented');
  }

  /**
   * Count total executions.
   * @returns {number}
   */
  count() {
    throw new Error('ITelemetryStorage.count() must be implemented');
  }

  /**
   * Delete all execution data.
   * @returns {boolean} Success
   */
  deleteAll() {
    throw new Error('ITelemetryStorage.deleteAll() must be implemented');
  }

  /**
   * Query executions by filter.
   * @param {object} filter - Filter criteria
   * @returns {object[]} Matching executions
   */
  query(filter) {
    throw new Error('ITelemetryStorage.query() must be implemented');
  }
}
