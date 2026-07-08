import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { getLogger } from './logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

function toTitle(id) {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function parseAgent(file, content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${file}: no valid frontmatter`);
  }

  const frontmatter = yaml.load(match[1]) || {};
  const body = (match[2] || '').trim();

  const id = frontmatter.id || file.replace(/\.md$/, '');
  const name = frontmatter.name || toTitle(id);

  return {
    id,
    name,
    file,
    frontmatter,
    body,
  };
}

export class AgentRegistry {
  constructor(agentDir = null) {
    this._agentDir = agentDir || join(root, 'agents');
    this._agents = null;
    this._log = getLogger();
  }

  load() {
    if (this._agents) return this;
    const files = readdirSync(this._agentDir).filter(f => f.endsWith('.md'));
    this._agents = [];
    for (const file of files.sort()) {
      const content = readFileSync(join(this._agentDir, file), 'utf-8');
      try {
        this._agents.push(parseAgent(file, content));
      } catch (err) {
        this._log.warn(`${file}: ${err.message}`);
      }
    }
    this._resolveExtends();
    return this;
  }

  _resolveExtends() {
    const agentMap = {};
    for (const a of this._agents) {
      agentMap[a.id] = a;
    }

    for (const a of this._agents) {
      const parentId = a.frontmatter.extends;
      if (!parentId) continue;

      const parent = agentMap[parentId];
      if (!parent) {
        this._log.warn(`${a.file}: extends "${parentId}" not found`);
        continue;
      }

      if (parent.frontmatter.extends) {
        this._log.warn(`${a.file}: multi-level extends not supported (${parentId} has extends itself)`);
        continue;
      }

      a.body = a.body + '\n\n' + parent.body;
      delete a.frontmatter.extends;
    }
  }

  all() {
    this.load();
    return this._agents;
  }

  count() {
    this.load();
    return this._agents.length;
  }

  findById(id) {
    this.load();
    return this._agents.find(a => a.id === id) || null;
  }

  findByName(name) {
    this.load();
    return this._agents.find(a => a.name === name) || null;
  }

  findByMode(mode) {
    this.load();
    return this._agents.filter(a => a.frontmatter.mode === mode);
  }

  findByCategory(category) {
    this.load();
    return this._agents.filter(a => a.frontmatter.category === category);
  }

  search(query) {
    this.load();
    const q = query.toLowerCase();
    return this._agents.filter(a => {
      if (a.id.includes(q) || a.name.toLowerCase().includes(q)) return true;
      if ((a.frontmatter.description || '').toLowerCase().includes(q)) return true;
      const keywords = a.frontmatter.keywords || [];
      if (keywords.some(k => k.toLowerCase().includes(q))) return true;
      const capabilities = a.frontmatter.capabilities || [];
      if (capabilities.some(c => c.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  getCategories() {
    this.load();
    const cats = new Set(this._agents.map(a => a.frontmatter.category).filter(Boolean));
    return [...cats].sort();
  }

  getModes() {
    this.load();
    const modes = new Set(this._agents.map(a => a.frontmatter.mode).filter(Boolean));
    return [...modes].sort();
  }

  resolveDependencies(agentIds) {
    this.load();
    const agentMap = {};
    for (const a of this._agents) {
      agentMap[a.id] = a;
    }

    const visited = new Set();
    const inStack = new Set();
    const order = [];

    const visit = (id) => {
      if (inStack.has(id)) {
        throw new Error(`Cycle detected involving "${id}"`);
      }
      if (visited.has(id)) return;
      const agent = agentMap[id];
      if (!agent) {
        this._log.warn(`resolveDependencies: agent "${id}" not found, skipping`);
        visited.add(id);
        return;
      }
      inStack.add(id);

      const prereqs = [
        ...(agent.frontmatter.depends_on || []),
        ...(agent.frontmatter.after || []),
      ];
      for (const depId of prereqs) {
        visit(depId);
      }

      visited.add(id);
      inStack.delete(id);
      order.push(id);
    };

    for (const id of agentIds) {
      visit(id);
    }

    return order;
  }

  toJSON() {
    this.load();
    return this._agents.map(a => ({
      id: a.id,
      name: a.name,
      file: a.file,
      frontmatter: a.frontmatter,
      body: a.body,
    }));
  }
}

let _defaultInstance = null;
export function getAgentRegistry() {
  if (!_defaultInstance) {
    _defaultInstance = new AgentRegistry();
  }
  return _defaultInstance;
}

export default getAgentRegistry;
