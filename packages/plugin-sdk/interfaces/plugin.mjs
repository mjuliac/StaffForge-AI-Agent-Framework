/**
 * Core plugin interface. All StaffForge plugins must implement this.
 */
export class IPlugin {
  /** @type {string} Plugin name (unique identifier) */
  name = '';

  /** @type {string} Semantic version */
  version = '';

  /** @type {string} Human-readable description */
  description = '';

  /**
   * Initialize the plugin with access to the framework context.
   * @param {import('./event-bus.mjs').IEventBus} context.eventBus - Event bus for hooking into pipeline events
   * @param {object} context.config - Plugin-specific configuration
   * @param {string} context.dataDir - Plugin data directory
   * @returns {Promise<void>}
   */
  async init(context) {
    throw new Error('IPlugin.init() must be implemented');
  }

  /**
   * Clean up resources when the plugin is unloaded.
   * @returns {Promise<void>}
   */
  async destroy() {
    throw new Error('IPlugin.destroy() must be implemented');
  }

  /** @type {object} Optional lifecycle hooks */
  hooks = null;

  /** @type {import('./adapter-provider.mjs').IAdapterProvider[]|null} */
  adapters = null;

  /** @type {import('./model-provider.mjs').IModelProvider[]|null} */
  models = null;

  /** @type {import('./agent-provider.mjs').IAgentProvider[]|null} */
  agents = null;

  /** @type {import('./pipeline-provider.mjs').IPipelineProvider[]|null} */
  pipelines = null;

  /** @type {import('./telemetry-storage.mjs').ITelemetryStorage|null} */
  storage = null;

  /** @type {import('./vcs-provider.mjs').IVCSProvider[]|null} */
  vcs = null;
}
