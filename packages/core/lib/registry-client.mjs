import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getLogger } from './logger.mjs';

export class RegistryClient {
  constructor(options = {}) {
    this._baseUrl = options.registryUrl || 'http://127.0.0.1:3737';
    this._apiKey = options.apiKey || null;
    this._agentsDir = options.agentsDir || null;
    this._pipelinesDir = options.pipelinesDir || null;
    this._timeout = options.timeout || 10000;
    this._log = options.logger || getLogger();
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this._apiKey) h['Authorization'] = `Bearer ${this._apiKey}`;
    return h;
  }

  async _fetch(path) {
    const url = `${this._baseUrl}${path}`;
    const response = await fetch(url, {
      headers: this._headers(),
      signal: AbortSignal.timeout(this._timeout),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Registry ${response.status} ${response.statusText}: ${body}`);
    }
    return response.json();
  }

  async _post(path, body) {
    const url = `${this._baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this._timeout),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Registry POST ${response.status}: ${text}`);
    }
    return response.json();
  }

  async checkHealth() {
    return this._fetch('/api/health');
  }

  async listAgents({ limit = 100, offset = 0 } = {}) {
    return this._fetch(`/api/agents?limit=${limit}&offset=${offset}`);
  }

  async getAgent(id) {
    return this._fetch(`/api/agents/${encodeURIComponent(id)}`);
  }

  async listPipelines({ limit = 100, offset = 0 } = {}) {
    return this._fetch(`/api/pipelines?limit=${limit}&offset=${offset}`);
  }

  async getPipeline(name) {
    return this._fetch(`/api/pipelines/${encodeURIComponent(name)}`);
  }

  async listPlugins({ limit = 100, offset = 0 } = {}) {
    return this._fetch(`/api/plugins?limit=${limit}&offset=${offset}`);
  }

  async sync({ agentsDir, pipelinesDir } = {}) {
    const aDir = agentsDir || this._agentsDir;
    const pDir = pipelinesDir || this._pipelinesDir;

    const results = {
      agentsDownloaded: 0,
      agentsSkipped: 0,
      agentsFailed: 0,
      pipelinesDownloaded: 0,
      pipelinesSkipped: 0,
      pipelinesFailed: 0,
      errors: [],
    };

    if (aDir) {
      await this._syncAgents(aDir, results);
    }

    if (pDir) {
      await this._syncPipelines(pDir, results);
    }

    return results;
  }

  async _syncAgents(dir, results) {
    try {
      const remote = await this.listAgents({ limit: 500 });

      for (const agent of remote.agents) {
        try {
          const localPath = join(dir, `${agent.id}.md`);

          if (existsSync(localPath)) {
            results.agentsSkipped++;
            continue;
          }

          const full = await this.getAgent(agent.id);
          if (!full) {
            results.agentsSkipped++;
            continue;
          }

          const content = this._agentToMarkdown(full);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(localPath, content, 'utf-8');
          results.agentsDownloaded++;
        } catch (err) {
          results.agentsFailed++;
          results.errors.push(`agent:${agent.id}: ${err.message}`);
        }
      }
    } catch (err) {
      results.errors.push(`sync agents: ${err.message}`);
    }
  }

  async _syncPipelines(dir, results) {
    try {
      const remote = await this.listPipelines({ limit: 500 });

      for (const pipeline of remote.pipelines) {
        try {
          const localPath = join(dir, `${pipeline.name}.yaml`);

          if (existsSync(localPath)) {
            results.pipelinesSkipped++;
            continue;
          }

          const full = await this.getPipeline(pipeline.name);
          if (!full || !full.raw) {
            results.pipelinesSkipped++;
            continue;
          }

          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(localPath, full.raw, 'utf-8');
          results.pipelinesDownloaded++;
        } catch (err) {
          results.pipelinesFailed++;
          results.errors.push(`pipeline:${pipeline.name}: ${err.message}`);
        }
      }
    } catch (err) {
      results.errors.push(`sync pipelines: ${err.message}`);
    }
  }

  _agentToMarkdown(agent) {
    const frontmatter = agent.frontmatter || {};
    const lines = ['---'];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (typeof value === 'object') {
        lines.push(`${key}:`);
        lines.push(JSON.stringify(value, null, 2));
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    lines.push('---');
    if (agent.body) lines.push('', agent.body);
    return lines.join('\n');
  }

  async checkForUpdates() {
    const health = await this.checkHealth();
    return {
      connected: true,
      serverTime: health.timestamp,
      updateAvailable: false,
    };
  }
}

export function createRegistryClient(options = {}) {
  return new RegistryClient(options);
}

export default createRegistryClient;
