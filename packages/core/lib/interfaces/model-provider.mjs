/**
 * Model provider interface. Plugins can register new model sources.
 */
export class IModelProvider {
  /** @type {string} Provider name (e.g., 'openai', 'anthropic') */
  name = '';

  /**
   * Discover available models from this provider.
   * @returns {Promise<object[]>} Array of model definitions
   */
  async discover() {
    throw new Error('IModelProvider.discover() must be implemented');
  }

  /**
   * Get a specific model by ID.
   * @param {string} id - Model identifier
   * @returns {object|null} Model definition or null
   */
  getById(id) {
    throw new Error('IModelProvider.getById() must be implemented');
  }

  /**
   * List all known models from this provider.
   * @returns {object[]} Array of model definitions
   */
  listAll() {
    throw new Error('IModelProvider.listAll() must be implemented');
  }
}
