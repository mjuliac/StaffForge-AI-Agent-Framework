import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..', '..', '..');

export class AdapterRegistry {
  constructor(adaptersDir = null) {
    this._adaptersDir = adaptersDir || join(root, 'adapters');
    this._cache = {};
  }

  listAdapters() {
    return readdirSync(this._adaptersDir)
      .filter((f) => {
        try {
          return existsSync(join(this._adaptersDir, f, 'index.mjs'));
        } catch {
          return false;
        }
      })
      .sort();
  }

  async getAdapter(name) {
    if (this._cache[name]) return this._cache[name];

    const adapterDir = join(this._adaptersDir, name);
    if (!existsSync(join(adapterDir, 'index.mjs'))) {
      throw new Error(`Adapter "${name}" not found at ${adapterDir}`);
    }

    const mod = await import(join(adapterDir, 'index.mjs'));
    if (typeof mod.default !== 'function') {
      throw new Error(`Adapter "${name}" must export a default function`);
    }

    this._cache[name] = mod.default;
    return mod.default;
  }

  async export(agents, platform, outDir = null) {
    const adapter = await this.getAdapter(platform);
    const resolvedOut = outDir || join(this._adaptersDir, platform, 'output');

    mkdirSync(resolvedOut, { recursive: true });

    const files = adapter(agents);
    for (const { path, content } of files) {
      const fullPath = join(resolvedOut, path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, 'utf-8');
    }

    return { platform, outDir: resolvedOut, fileCount: files.length };
  }

  async exportToAll(agents) {
    const platforms = this.listAdapters();
    const results = [];
    for (const platform of platforms) {
      const result = await this.export(agents, platform);
      results.push(result);
    }
    return results;
  }

  clearCache() {
    this._cache = {};
  }
}

let _defaultInstance = null;
export function getAdapterRegistry() {
  if (!_defaultInstance) {
    _defaultInstance = new AdapterRegistry();
  }
  return _defaultInstance;
}

export default getAdapterRegistry;
