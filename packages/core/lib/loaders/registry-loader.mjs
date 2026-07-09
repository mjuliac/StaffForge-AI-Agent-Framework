import { RemoteLoader } from './remote-loader.mjs';

export class RegistryLoader extends RemoteLoader {
  constructor(options = {}) {
    super(options);
    this._registryUrl = options.registryUrl || 'http://127.0.0.1:3737';
    this._apiKey = options.apiKey || null;
    this._cache = new Map();
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this._apiKey) h['Authorization'] = `Bearer ${this._apiKey}`;
    return h;
  }

  async _fetch(path) {
    const url = `${this._registryUrl}${path}`;
    const cacheKey = `fetch:${url}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    const response = await fetch(url, {
      headers: this._headers(),
      signal: AbortSignal.timeout(this._timeout),
    });
    if (!response.ok) {
      throw new Error(`RegistryLoader: ${response.status} from ${url}`);
    }
    const data = await response.json();
    this._cache.set(cacheKey, data);
    return data;
  }

  async load(source) {
    // If source is a URL, delegate to RemoteLoader
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return super.load(source);
    }

    // If source looks like a pipeline name, fetch from registry
    const data = await this._fetch(`/api/pipelines/${encodeURIComponent(source)}`);
    if (!data || data.error) {
      throw new Error(`Pipeline "${source}" not found in registry`);
    }

    // Return raw YAML if available, otherwise the JSON definition
    return data.raw || data;
  }

  async search(query = '') {
    const data = await this._fetch(`/api/pipelines?limit=500`);
    const pipelines = data.pipelines || [];

    if (!query) return pipelines;

    const q = query.toLowerCase();
    return pipelines.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }

  async listAgents() {
    const data = await this._fetch('/api/agents?limit=500');
    return data.agents || [];
  }

  canLoad(source) {
    // Can load by pipeline name (registry lookup) or URL
    return !source.includes('.') || source.startsWith('http://') || source.startsWith('https://');
  }
}

export default RegistryLoader;
