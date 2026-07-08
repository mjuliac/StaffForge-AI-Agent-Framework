/**
 * Platform adapter interface. Plugins can register new export targets.
 */
export class IAdapterProvider {
  /** @type {string} Adapter name (e.g., 'opencode', 'claude-code') */
  name = '';

  /** @type {string} Human-readable description */
  description = '';

  /** @type {string} Adapter version */
  version = '';

  /**
   * Export agents to platform-specific format.
   * @param {object[]} agents - Array of agent objects
   * @returns {{ path: string, content: string }[]} Array of {path, content} pairs
   */
  export(agents) {
    throw new Error('IAdapterProvider.export() must be implemented');
  }

  /**
   * Validate agents for this adapter's requirements.
   * @param {object[]} agents - Array of agent objects
   * @returns {{ valid: boolean, errors: string[] }} Validation result
   */
  validate(agents) {
    return { valid: true, errors: [] };
  }
}
