/**
 * Pipeline provider interface. Plugins can register new pipeline templates.
 */
export class IPipelineProvider {
  /** @type {string} Provider name */
  name = '';

  /**
   * Resolve a task type to a pipeline template.
   * @param {string} taskType - Task type (e.g., 'feature', 'bugfix')
   * @param {string} [prompt] - User prompt for additional context
   * @returns {object|null} Pipeline template or null if not resolvable
   */
  resolveTask(taskType, prompt) {
    throw new Error('IPipelineProvider.resolveTask() must be implemented');
  }

  /**
   * List all task types this provider can handle.
   * @returns {string[]} Array of task type names
   */
  listTaskTypes() {
    throw new Error('IPipelineProvider.listTaskTypes() must be implemented');
  }

  /**
   * Register a new task type with its pipeline template.
   * @param {string} taskType - Task type name
   * @param {object} template - Pipeline template
   */
  registerTaskType(taskType, template) {
    throw new Error('IPipelineProvider.registerTaskType() must be implemented');
  }
}
