/**
 * @staffforge/sdk - Public API for building StaffForge plugins.
 *
 * Usage:
 *   import { createPlugin, defineAdapter, defineModelProvider } from '@staffforge/sdk';
 *
 *   export default createPlugin({
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     adapters: [defineAdapter({ ... })],
 *     models: [defineModelProvider({ ... })],
 *     init: async (ctx) => { ... },
 *     destroy: async () => { ... }
 *   });
 */

import { IPlugin } from '@staffforge/plugin-sdk';
import { IEventBus } from '@staffforge/plugin-sdk';
import { IAdapterProvider } from '@staffforge/plugin-sdk';
import { IModelProvider } from '@staffforge/plugin-sdk';
import { IPipelineProvider } from '@staffforge/plugin-sdk';
import { IAgentProvider } from '@staffforge/plugin-sdk';
import { ITelemetryStorage } from '@staffforge/plugin-sdk';

/**
 * Create a plugin from a configuration object.
 * @param {object} config - Plugin configuration
 * @param {string} config.name - Plugin name
 * @param {string} config.version - Plugin version
 * @param {string} [config.description] - Plugin description
 * @param {function} config.init - Async init function receiving context
 * @param {function} [config.destroy] - Async destroy function
 * @param {object} [config.hooks] - Lifecycle hooks
 * @param {IAdapterProvider[]} [config.adapters] - Adapter providers
 * @param {IModelProvider[]} [config.models] - Model providers
 * @param {IAgentProvider[]} [config.agents] - Agent providers
 * @param {IPipelineProvider[]} [config.pipelines] - Pipeline providers
 * @param {ITelemetryStorage} [config.storage] - Telemetry storage
 * @returns {IPlugin} Plugin instance
 */
export function createPlugin(config) {
  const plugin = new IPlugin();
  plugin.name = config.name;
  plugin.version = config.version;
  plugin.description = config.description || '';
  plugin.init = config.init;
  plugin.destroy = config.destroy || (async () => {});
  plugin.hooks = config.hooks || null;
  plugin.adapters = config.adapters || null;
  plugin.models = config.models || null;
  plugin.agents = config.agents || null;
  plugin.pipelines = config.pipelines || null;
  plugin.storage = config.storage || null;
  return plugin;
}

/**
 * Define an adapter provider from a config object.
 * @param {object} config
 * @param {string} config.name
 * @param {string} [config.description]
 * @param {string} [config.version]
 * @param {function} config.export - Export function
 * @param {function} [config.validate] - Validation function
 * @returns {IAdapterProvider}
 */
export function defineAdapter(config) {
  const adapter = new IAdapterProvider();
  adapter.name = config.name;
  adapter.description = config.description || '';
  adapter.version = config.version || '1.0.0';
  adapter.export = config.export;
  if (config.validate) adapter.validate = config.validate;
  return adapter;
}

/**
 * Define a model provider from a config object.
 * @param {object} config
 * @param {string} config.name
 * @param {function} config.discover
 * @param {function} config.getById
 * @param {function} config.listAll
 * @returns {IModelProvider}
 */
export function defineModelProvider(config) {
  const provider = new IModelProvider();
  provider.name = config.name;
  provider.discover = config.discover;
  provider.getById = config.getById;
  provider.listAll = config.listAll;
  return provider;
}

/**
 * Define a pipeline provider from a config object.
 * @param {object} config
 * @param {string} config.name
 * @param {function} config.resolveTask
 * @param {function} config.listTaskTypes
 * @param {function} config.registerTaskType
 * @returns {IPipelineProvider}
 */
export function definePipelineProvider(config) {
  const provider = new IPipelineProvider();
  provider.name = config.name;
  provider.resolveTask = config.resolveTask;
  provider.listTaskTypes = config.listTaskTypes;
  provider.registerTaskType = config.registerTaskType;
  return provider;
}

/**
 * Define an agent provider from a config object.
 * @param {object} config
 * @param {string} config.name
 * @param {function} config.loadAgents
 * @param {function} config.findById
 * @param {function} config.search
 * @returns {IAgentProvider}
 */
export function defineAgentProvider(config) {
  const provider = new IAgentProvider();
  provider.name = config.name;
  provider.loadAgents = config.loadAgents;
  provider.findById = config.findById;
  provider.search = config.search;
  return provider;
}

/**
 * Define a telemetry storage from a config object.
 * @param {object} config
 * @param {function} config.save
 * @param {function} config.load
 * @param {function} config.list
 * @param {function} config.count
 * @param {function} config.deleteAll
 * @param {function} [config.query]
 * @returns {ITelemetryStorage}
 */
export function defineStorage(config) {
  const storage = new ITelemetryStorage();
  storage.save = config.save;
  storage.load = config.load;
  storage.list = config.list;
  storage.count = config.count;
  storage.deleteAll = config.deleteAll;
  if (config.query) storage.query = config.query;
  return storage;
}

// Re-export all interfaces
export { IPlugin, IEventBus, IAdapterProvider, IModelProvider, IPipelineProvider, IAgentProvider, ITelemetryStorage };
