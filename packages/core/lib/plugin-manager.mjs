import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import eventBus from './event-bus.mjs';

/**
 * PluginManager — discovers and loads StaffForge plugins from the user plugins directory.
 *
 * Plugins live under `~/.staffforge/plugins/<plugin-name>/` and export a default
 * class implementing IPlugin. The manager instantiates each plugin, calls its
 * `init(context)` and registers any adapters / models / agents / pipelines / storage
 * it exposes.
 */
export class PluginManager {
  constructor(pluginsDir = null) {
    this._pluginsDir = pluginsDir || join(homedir(), '.staffforge', 'plugins');
    /** @type {Map<string, object>} name -> loaded plugin instance */
    this._plugins = new Map();
    this._context = {
      eventBus,
      config: {},
      dataDir: join(this._pluginsDir, '.data'),
    };
  }

  /**
   * Discover plugin directories under the plugins root.
   * @returns {string[]} plugin directory names
   */
  discover() {
    if (!existsSync(this._pluginsDir)) return [];
    return readdirSync(this._pluginsDir).filter((entry) => {
      const full = join(this._pluginsDir, entry);
      return statSync(full).isDirectory() && existsSync(join(full, 'package.json'));
    });
  }

  /**
   * Load a single plugin by directory name.
   * @param {string} name - plugin directory name
   * @returns {Promise<object>} loaded plugin instance
   */
  async load(name) {
    if (this._plugins.has(name)) return this._plugins.get(name);

    const dir = join(this._pluginsDir, name);
    const pkgPath = join(dir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const mainFile = pkg.main && pkg.main.endsWith('.mjs') ? pkg.main : 'index.mjs';
    const mod = await import(pathToFileURL(join(dir, mainFile)).href);
    const PluginClass = mod.default;
    if (!PluginClass) {
      throw new Error(`Plugin "${name}" does not export a default class`);
    }

    const plugin = new PluginClass();
    await plugin.init(this._context);
    this._plugins.set(name, plugin);
    eventBus.emit('plugin:loaded', { name, version: plugin.version || pkg.version || '0.0.0' });
    return plugin;
  }

  /**
   * Load all discovered plugins.
   * @returns {Promise<object[]>} loaded plugin instances
   */
  async loadAll() {
    const loaded = [];
    for (const name of this.discover()) {
      try {
        loaded.push(await this.load(name));
      } catch (err) {
        console.error(`PluginManager: failed to load "${name}":`, err.message);
      }
    }
    return loaded;
  }

  /**
   * Collect providers of a given kind across all loaded plugins.
   * @param {'adapters'|'models'|'agents'|'pipelines'|'storage'} kind
   * @returns {Array<object>}
   */
  collect(kind) {
    const out = [];
    for (const plugin of this._plugins.values()) {
      const providers = plugin[kind];
      if (Array.isArray(providers)) out.push(...providers);
    }
    return out;
  }

  /**
   * Unload a plugin and call its destroy hook.
   * @param {string} name
   */
  async unload(name) {
    const plugin = this._plugins.get(name);
    if (!plugin) return;
    if (typeof plugin.destroy === 'function') await plugin.destroy();
    this._plugins.delete(name);
    eventBus.emit('plugin:unloaded', { name });
  }

  list() {
    return [...this._plugins.keys()];
  }
}

let _defaultManager = null;
export function getPluginManager(pluginsDir = null) {
  if (!_defaultManager) _defaultManager = new PluginManager(pluginsDir);
  return _defaultManager;
}

export default getPluginManager;
