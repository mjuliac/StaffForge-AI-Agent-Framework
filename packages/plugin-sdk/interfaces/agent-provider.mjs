/**
 * Agent provider interface. Plugins can register new agent definitions.
 */
export class IAgentProvider {
  /** @type {string} Provider name */
  name = '';

  /**
   * Load all agents from this provider.
   * @returns {object[]} Array of agent definitions
   */
  loadAgents() {
    throw new Error('IAgentProvider.loadAgents() must be implemented');
  }

  /**
   * Find an agent by ID.
   * @param {string} id - Agent identifier
   * @returns {object|null} Agent definition or null
   */
  findById(id) {
    throw new Error('IAgentProvider.findById() must be implemented');
  }

  /**
   * Search agents by query string.
   * @param {string} query - Search query
   * @returns {object[]} Matching agents
   */
  search(query) {
    throw new Error('IAgentProvider.search() must be implemented');
  }
}
