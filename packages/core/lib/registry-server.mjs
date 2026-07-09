import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAgentRegistry } from './registries/agent-registry.mjs';
import pipelineRegistry from './registries/pipeline-registry.mjs';
import { getLogger } from './logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const PIPELINES_DIR = join(ROOT, 'pipelines');

export class RegistryServer {
  constructor(options = {}) {
    this._port = options.port || 3737;
    this._host = options.host || '127.0.0.1';
    this._apiKey = options.apiKey || null;
    this._server = null;
    this._log = options.logger || getLogger();
  }

  async start() {
    return new Promise((resolve) => {
      this._server = createServer((req, res) => this._handle(req, res));
      this._server.listen(this._port, this._host, () => {
        this._log.info(`RegistryServer listening on http://${this._host}:${this._port}`);
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this._server) {
        this._server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  _authenticate(req) {
    if (!this._apiKey) return true;
    const auth = req.headers['authorization'] || '';
    return auth === `Bearer ${this._apiKey}` || auth === this._apiKey;
  }

  _json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  _error(res, message, status = 400) {
    this._json(res, { error: message }, status);
  }

  _parseUrl(req) {
    const url = new URL(req.url, `http://${this._host}:${this._port}`);
    const parts = url.pathname.split('/').filter(Boolean);
    return { parts, query: url.searchParams };
  }

  _handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (!this._authenticate(req)) {
      return this._error(res, 'Unauthorized', 401);
    }

    const { parts, query } = this._parseUrl(req);

    try {
      if (parts[0] === 'api') {
        this._routeApi(req, res, parts.slice(1), query);
      } else {
        this._json(res, { service: 'StaffForge Registry', version: '2.3.0' });
      }
    } catch (err) {
      this._log.error(`RegistryServer: ${err.message}`);
      this._error(res, 'Internal server error', 500);
    }
  }

  _routeApi(req, res, parts, query) {
    const [resource, id] = parts;

    if (req.method !== 'GET' && req.method !== 'POST') {
      return this._error(res, 'Method not allowed', 405);
    }

    switch (resource) {
      case 'health':
        return this._json(res, { status: 'ok', timestamp: new Date().toISOString() });

      case 'agents':
        if (id) return this._getAgent(res, id);
        return this._listAgents(res, query);

      case 'pipelines':
        if (id) return this._getPipeline(res, id);
        return this._listPipelines(res, query);

      case 'plugins':
        if (id) return this._getPlugin(res, id);
        return this._listPlugins(res, query);

      case 'sync':
        if (req.method === 'POST') return this._handleSync(req, res);
        return this._error(res, 'Use POST for sync', 405);

      default:
        return this._error(res, `Unknown resource: ${resource}`, 404);
    }
  }

  _listAgents(res, query) {
    const registry = getAgentRegistry();
    const agents = registry.all();
    const limit = Math.min(parseInt(query.get('limit') || '100', 10), 500);
    const offset = parseInt(query.get('offset') || '0', 10);

    const result = agents.slice(offset, offset + limit).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.frontmatter?.description || '',
      mode: a.frontmatter?.mode || '',
      category: a.frontmatter?.category || '',
    }));

    this._json(res, {
      count: result.length,
      total: agents.length,
      offset,
      agents: result,
    });
  }

  _getAgent(res, id) {
    const registry = getAgentRegistry();
    const agent = registry.findById(id);
    if (!agent) return this._error(res, `Agent "${id}" not found`, 404);
    this._json(res, agent);
  }

  _listPipelines(res, query) {
    const types = pipelineRegistry.listTaskTypes();
    const limit = Math.min(parseInt(query.get('limit') || '100', 10), 500);
    const offset = parseInt(query.get('offset') || '0', 10);

    const sliced = types.slice(offset, offset + limit);
    const result = sliced.map((name) => {
      const tpl = pipelineRegistry.resolve(name);
      return {
        name,
        description: tpl?.description || '',
        version: tpl?.version || '',
        levels: tpl?.levels?.length || 0,
      };
    });

    this._json(res, {
      count: result.length,
      total: types.length,
      offset,
      pipelines: result,
    });
  }

  _getPipeline(res, name) {
    const tpl = pipelineRegistry.resolve(name);
    if (!tpl) return this._error(res, `Pipeline "${name}" not found`, 404);

    // Also return raw YAML content if requested
    const yamlPath = join(PIPELINES_DIR, `${name}.yaml`);
    const raw = existsSync(yamlPath) ? readFileSync(yamlPath, 'utf-8') : null;

    this._json(res, { ...tpl, raw });
  }

  _listPlugins(res, query) {
    // List plugins from the staffforge plugins directory
    let plugins = [];
    try {
      const pluginsDir = join(ROOT, 'packages');
      if (existsSync(pluginsDir)) {
        plugins = readdirSync(pluginsDir)
          .filter((name) => name.startsWith('plugin-') || name.endsWith('-plugin'))
          .map((name) => ({ name, path: join(pluginsDir, name) }));
      }
    } catch {
      // plugins dir not available
    }

    this._json(res, { count: plugins.length, plugins });
  }

  async _handleSync(req, res) {
    // Collect body for push sync
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    let payload = {};
    try {
      payload = body ? JSON.parse(body) : {};
    } catch {
      return this._error(res, 'Invalid JSON body', 400);
    }

    this._json(res, {
      status: 'synced',
      timestamp: new Date().toISOString(),
      agentsReceived: payload.agents?.length || 0,
      pipelinesReceived: payload.pipelines?.length || 0,
    });
  }
}

export function createRegistryServer(options = {}) {
  return new RegistryServer(options);
}

export default createRegistryServer;
