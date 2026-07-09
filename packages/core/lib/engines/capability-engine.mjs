import { getAgentRegistry } from '../registries/agent-registry.mjs';

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'we',
  'you',
  'they',
  'them',
  'their',
  'my',
  'your',
  'our',
  'its',
  'from',
  'as',
  'by',
  'using',
  'use',
  'used',
  'via',
  'how',
  'what',
  'why',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'please',
  'need',
  'want',
  'help',
  'create',
  'add',
  'implement',
  'build',
  'make',
  'write',
  'fix',
  'change',
  'update',
  'remove',
  'delete',
  'new',
  'get',
  'set',
  'run',
  'show',
  'tell',
  'give',
]);

const CAPABILITY_ALIASES = {
  test: ['testing', 'unit-test', 'integration-test', 'e2e', 'assert', 'verify'],
  deploy: ['deployment', 'release', 'cd', 'publish', 'rollout'],
  audit: ['security', 'review', 'scan', 'inspect', 'check'],
  schema: ['model', 'entity', 'type', 'migration', 'ddd', 'domain'],
  frontend: ['ui', 'web', 'component', 'view', 'page'],
  backend: ['server', 'api', 'service', 'endpoint', 'route'],
  database: ['db', 'sql', 'nosql', 'query', 'migration', 'orm'],
  mobile: ['android', 'ios', 'react-native', 'flutter', 'app'],
  design: ['architecture', 'pattern', 'ddd', 'clean', 'solid'],
};

const TASK_TYPE_SIGNALS = {
  feature: ['add', 'implement', 'create', 'new', 'build', 'introduce', 'develop', 'support'],
  bugfix: ['bug', 'fix', 'error', 'crash', 'issue', 'wrong', 'broken', 'incorrect', 'fail'],
  refactor: ['refactor', 'restructure', 'cleanup', 'clean', 'reorganize', 'simplify'],
  security: ['security', 'vulnerability', 'audit', 'cve', 'owasp', 'pentest', 'threat'],
  deployment: ['deploy', 'release', 'build', 'publish', 'package', 'ship', 'version'],
  hotfix: ['hotfix', 'urgent', 'critical', 'production', 'emergency', 'asap'],
};

export class CapabilityEngine {
  constructor(agentRegistry = null) {
    this._registry = agentRegistry || getAgentRegistry();
  }

  analyzeIntent(text) {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

    const keywords = [...new Set(tokens)];

    const taskType = this._detectTaskType(keywords, text.toLowerCase());

    return { keywords, taskType };
  }

  _detectTaskType(keywords, rawText) {
    let best = { type: null, score: 0 };
    for (const [type, signals] of Object.entries(TASK_TYPE_SIGNALS)) {
      const score = signals.filter((s) => rawText.includes(s)).length;
      if (score > best.score) {
        best = { type, score };
      }
    }
    return best.type;
  }

  scoreAgent(agent, intent) {
    let score = 0;
    const { keywords } = intent;

    const desc = (agent.frontmatter.description || '').toLowerCase();
    const agentKw = (agent.frontmatter.keywords || []).map((k) => k.toLowerCase());
    const agentCaps = (agent.frontmatter.capabilities || []).map((c) => c.toLowerCase());
    const agentName = agent.name.toLowerCase();
    const agentId = agent.id.toLowerCase();

    for (const kw of keywords) {
      if (agentId === kw || agentName === kw) score += 10;
      else if (agentId.includes(kw) || agentName.includes(kw)) score += 5;

      if (agentKw.includes(kw)) score += 3;
      else if (agentKw.some((k) => k.includes(kw) || kw.includes(k))) score += 1;

      if (agentCaps.includes(kw)) score += 4;
      else if (agentCaps.some((c) => c.includes(kw) || kw.includes(c))) score += 1;

      if (desc.includes(kw)) score += 1;
    }

    for (const [cap, aliases] of Object.entries(CAPABILITY_ALIASES)) {
      const hasCap = agentCaps.includes(cap);
      const matchesAlias = aliases.some((a) => keywords.includes(a));
      if (hasCap && matchesAlias) score += 2;
    }

    const priority = agent.frontmatter.priority || 50;
    score += (priority - 50) / 10;

    return score;
  }

  findBestMatch(intent, { topN = 5, minScore = 0, mode = null } = {}) {
    const agents = mode ? this._registry.findByMode(mode) : this._registry.all();

    const scored = agents.map((a) => ({
      agent: a,
      score: this.scoreAgent(a, intent),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.filter((s) => s.score >= minScore).slice(0, topN);
  }

  expandCapabilities(text) {
    const q = text.toLowerCase();
    const found = [];
    for (const [cap, aliases] of Object.entries(CAPABILITY_ALIASES)) {
      if (cap.includes(q) || q.includes(cap)) found.push(cap, ...aliases);
      else if (aliases.some((a) => a.includes(q) || q.includes(a))) found.push(cap, ...aliases);
    }
    return [...new Set(found)];
  }

  findAgentsByKeywords(keywords, { topN = 10 } = {}) {
    const intent = this.analyzeIntent(keywords);
    return this.findBestMatch(intent, { topN });
  }
}

export function getCapabilityEngine(registry = null) {
  return new CapabilityEngine(registry);
}

export default getCapabilityEngine;
