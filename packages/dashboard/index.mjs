import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, 'public');
const CORE_DIR = join(__dirname, '..', 'core', 'lib');

let _agentRegistry = null;
let _pipelineRegistry = null;
let _modelRegistry = null;

async function ensureRegistries() {
  if (!_agentRegistry) {
    const agentMod = await import(join(CORE_DIR, 'registries', 'agent-registry.mjs'));
    _agentRegistry = agentMod.getAgentRegistry();
  }
  if (!_pipelineRegistry) {
    const pipeMod = await import(join(CORE_DIR, 'registries', 'pipeline-registry.mjs'));
    _pipelineRegistry = pipeMod.pipelineRegistry || pipeMod.default;
  }
  if (!_modelRegistry) {
    try {
      const modelMod = await import(join(CORE_DIR, 'registries', 'model-registry.mjs'));
      _modelRegistry = modelMod.getModelRegistry().all ? modelMod.getModelRegistry() : null;
    } catch {
      _modelRegistry = null;
    }
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export class DashboardServer {
  constructor(options = {}) {
    this._port = options.port || 3000;
    this._host = options.host || '127.0.0.1';
    this._registryUrl = options.registryUrl || null;
    this._server = null;
  }

  async start() {
    await ensureRegistries();
    return new Promise((resolve) => {
      this._server = createServer((req, res) => this._handle(req, res));
      this._server.listen(this._port, this._host, () => {
        console.log(`Dashboard: http://${this._host}:${this._port}`);
        if (this._registryUrl) console.log(`Registry API: ${this._registryUrl}`);
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this._server) this._server.close(() => resolve());
      else resolve();
    });
  }

  _json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  _serveStatic(res, path) {
    const fullPath = join(PUBLIC, path === '/' ? 'index.html' : path);
    if (!existsSync(fullPath) || !fullPath.startsWith(PUBLIC)) {
      return this._serveStatic(res, '/index.html');
    }
    const ext = extname(fullPath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const content = readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  }

  async _handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = new URL(req.url, `http://${this._host}:${this._port}`);
    const path = url.pathname;

    try {
      if (path === '/api/stats') return await this._getStats(res);
      if (path === '/api/agents') return await this._listAgents(res, url);
      if (path.startsWith('/api/agents/')) return await this._getAgent(res, path.slice(12));
      if (path === '/api/pipelines') return await this._listPipelines(res, url);
      if (path.startsWith('/api/pipelines/')) return await this._getPipeline(res, path.slice(15));
      if (path === '/api/models') return await this._listModels(res, url);
    } catch (err) {
      this._json(res, { error: err.message }, 500);
      return;
    }

    this._serveStatic(res, path);
  }

  async _listAgents(res, url) {
    const agents = _agentRegistry.all();
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const mode = url.searchParams.get('mode') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let filtered = agents;
    if (q)
      filtered = filtered.filter(
        (a) =>
          a.id.includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.frontmatter?.description || '').toLowerCase().includes(q),
      );
    if (mode) filtered = filtered.filter((a) => a.frontmatter?.mode === mode);

    const sliced = filtered.slice(offset, offset + limit);
    const result = sliced.map((a) => ({
      id: a.id,
      name: a.name,
      mode: a.frontmatter?.mode || '',
      category: a.frontmatter?.category || '',
      description: a.frontmatter?.description || '',
    }));

    this._json(res, { count: result.length, total: agents.length, filtered: filtered.length, agents: result });
  }

  async _getAgent(res, id) {
    const agent = _agentRegistry.findById(id);
    if (!agent) return this._json(res, { error: 'not found' }, 404);
    this._json(res, agent);
  }

  async _listPipelines(res, _url) {
    const types = _pipelineRegistry.listTaskTypes();
    const result = types.map((name) => {
      const tpl = _pipelineRegistry.resolve(name);
      return {
        name,
        description: tpl?.description || '',
        version: tpl?.version || '',
        levels: (tpl?.levels || []).map((l) => ({ name: l.name, agents: l.agents, parallel: !!l.parallel })),
      };
    });
    this._json(res, { count: result.length, pipelines: result });
  }

  async _getPipeline(res, name) {
    const tpl = _pipelineRegistry.resolve(name);
    if (!tpl) return this._json(res, { error: 'not found' }, 404);
    this._json(res, tpl);
  }

  async _getStats(res) {
    const agents = _agentRegistry.all();
    const modes = {};
    const categories = {};
    for (const a of agents) {
      const m = a.frontmatter?.mode || 'unknown';
      const c = a.frontmatter?.category || 'unknown';
      modes[m] = (modes[m] || 0) + 1;
      categories[c] = (categories[c] || 0) + 1;
    }
    this._json(res, {
      totalAgents: agents.length,
      totalPipelines: _pipelineRegistry.listTaskTypes().length,
      modes,
      categories,
    });
  }

  async _listModels(res, _url) {
    if (!_modelRegistry) return this._json(res, { count: 0, models: [] });
    const all = _modelRegistry.all ? _modelRegistry.all() : [];
    const result = all.map((m) => ({
      id: m.id,
      name: m.name || m.id,
      provider: m.provider || '',
      context: m.context || 0,
    }));
    this._json(res, { count: result.length, models: result });
  }
}

export function createDashboard(options = {}) {
  return new DashboardServer(options);
}

export default createDashboard;
