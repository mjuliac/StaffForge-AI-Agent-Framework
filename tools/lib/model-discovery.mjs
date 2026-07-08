import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

export class ModelDiscovery {
  constructor(discoveryDir = null) {
    this._discoveryDir = discoveryDir || join(__dirname, 'discovery');
    this._adapters = {};
    this._fileAdaptersLoaded = false;
  }

  registerAdapter(provider, adapterFn) {
    this._adapters[provider] = adapterFn;
  }

  async discoverAll() {
    this._loadFileAdapters();
    const results = {};
    for (const [provider, adapter] of Object.entries(this._adapters)) {
      try {
        results[provider] = await adapter();
      } catch (err) {
        results[provider] = { error: err.message, models: [] };
      }
    }
    return results;
  }

  async discoverProvider(provider) {
    this._loadFileAdapters();
    const adapter = this._adapters[provider];
    if (!adapter) {
      throw new Error(`No discovery adapter registered for provider "${provider}"`);
    }
    return adapter();
  }

  _loadFileAdapters() {
    if (this._fileAdaptersLoaded) return;
    if (!existsSync(this._discoveryDir)) return;

    const files = readdirSync(this._discoveryDir).filter(f => f.endsWith('.mjs'));
    for (const file of files) {
      const provider = file.replace(/\.mjs$/, '');
      if (!this._adapters[provider]) {
        this._adapters[provider] = () => this._lazyImport(join(this._discoveryDir, file));
      }
    }
    this._fileAdaptersLoaded = true;
  }

  async _lazyImport(path) {
    const mod = await import(path);
    if (typeof mod.default === 'function') {
      return mod.default();
    }
    throw new Error(`Discovery adapter at ${path} must export a default async function`);
  }

  listProviders() {
    this._loadFileAdapters();
    return Object.keys(this._adapters).sort();
  }

  clearAdapters() {
    this._adapters = {};
    this._fileAdaptersLoaded = false;
  }
}

let _defaultInstance = null;
export function getModelDiscovery() {
  if (!_defaultInstance) {
    _defaultInstance = new ModelDiscovery();
  }
  return _defaultInstance;
}

export default getModelDiscovery;
