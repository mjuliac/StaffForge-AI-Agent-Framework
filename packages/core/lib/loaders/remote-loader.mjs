import { URL } from 'node:url';

export class RemoteLoader {
  constructor(options = {}) {
    this._timeout = options.timeout || 10000;
    this._headers = options.headers || {};
  }

  async load(url) {
    try {
      const response = await fetch(url, {
        headers: this._headers,
        signal: AbortSignal.timeout(this._timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (contentType.includes('application/json')) {
        return JSON.parse(text);
      }

      if (
        contentType.includes('yaml') ||
        contentType.includes('yml') ||
        url.endsWith('.yaml') ||
        url.endsWith('.yml')
      ) {
        return this._parseYaml(text);
      }

      return text;
    } catch (err) {
      throw new Error(`RemoteLoader: failed to load ${url}: ${err.message}`);
    }
  }

  _parseYaml(content) {
    const lines = content.split('\n');
    const result = { levels: [] };
    let currentLevel = null;

    for (const line of lines) {
      const trimmed = line.replace(/^#.*$/, '').trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('name:')) {
        result.name = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('description:')) {
        result.description = trimmed.split(':').slice(1).join(':').trim();
      } else if (trimmed.startsWith('version:')) {
        result.version = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('- name:') || trimmed.match(/^- name:/)) {
        currentLevel = { name: trimmed.split(':')[1].trim(), agents: [], parallel: false };
        result.levels.push(currentLevel);
      } else if (trimmed.startsWith('agents:') && currentLevel) {
      } else if (trimmed.startsWith('parallel:') && currentLevel) {
        currentLevel.parallel = trimmed.split(':')[1].trim() === 'true';
      } else if (trimmed.startsWith('- ') && currentLevel && !trimmed.includes(':')) {
        currentLevel.agents.push(trimmed.slice(2).trim());
      }
    }

    return result;
  }

  canLoad(source) {
    try {
      new URL(source);
      return true;
    } catch {
      return false;
    }
  }
}

export default RemoteLoader;
