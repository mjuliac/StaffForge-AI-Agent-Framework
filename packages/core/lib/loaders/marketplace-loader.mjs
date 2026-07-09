import { RemoteLoader } from './remote-loader.mjs';

export class MarketplaceLoader extends RemoteLoader {
  constructor(options = {}) {
    super(options);
    this._registryUrl =
      options.registryUrl || 'https://raw.githubusercontent.com/mjuliac/staffforge-marketplace/main/registry.json';
    this._cache = new Map();
  }

  async load(pipelineName) {
    const cacheKey = `marketplace:${pipelineName}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const registry = await this._fetchRegistry();
    const pipeline = registry.pipelines?.find((p) => p.name === pipelineName);

    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineName}" not found in marketplace`);
    }

    const template = await super.load(pipeline.url);
    this._cache.set(cacheKey, template);
    return template;
  }

  async _fetchRegistry() {
    const cacheKey = 'marketplace:registry';
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const registry = await super.load(this._registryUrl);
    this._cache.set(cacheKey, registry);
    return registry;
  }

  async search(query = '') {
    const registry = await this._fetchRegistry();
    return registry.pipelines
      .filter((p) => !query || p.name.includes(query) || p.description?.includes(query))
      .map((p) => ({
        name: p.name,
        description: p.description,
        version: p.version,
        tags: p.tags,
      }));
  }

  async listAll() {
    const registry = await this._fetchRegistry();
    return registry.pipelines.map((p) => ({
      name: p.name,
      description: p.description,
      version: p.version,
      tags: p.tags,
    }));
  }

  canLoad(source) {
    return !super.canLoad(source) && !source.includes('.');
  }
}

export default MarketplaceLoader;
