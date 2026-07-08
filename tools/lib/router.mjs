import { getAgentRegistry } from './agent-registry.mjs';
import { getCapabilityEngine } from './capability-engine.mjs';
import { getTaskMapper } from './task-mapper.mjs';

const PIPELINE_TEMPLATES = {
  feature: {
    agents: [
      'requirements', 'architect', 'knowledge', 'impact-analysis',
      'security', 'testing', 'code-review', 'documentation',
    ],
    description: 'Git → Planner → [Requirements+Architect] → Knowledge → Impact → [Language+Security+Testing] → [Code Review+Documentation] → Git merge',
  },
  bugfix: {
    agents: ['knowledge', 'impact-analysis', 'debugging', 'testing', 'code-review'],
    description: 'Git → Planner → [Knowledge+Impact] → Debugging → [Language+Testing] → Code Review → Git merge',
  },
  refactor: {
    agents: ['architect', 'refactor', 'performance', 'code-review'],
    description: 'Git → Architect → [Refactor+Performance] → Code Review → Git merge',
  },
  security: {
    agents: ['security', 'pentest', 'code-review'],
    description: 'Git → Security → Pentest → Code Review → Git merge',
  },
  deployment: {
    agents: ['docker', 'kubernetes', 'deployment', 'release', 'documentation'],
    description: 'Git → [Docker+Kubernetes] → [Build+Release] → Documentation → Git merge',
  },
  hotfix: {
    agents: ['debugging', 'code-review'],
    description: 'Git (from main) → Debugging → Code Review → Git merge',
  },
};

const PIPELINE_LEVELS = {
  feature: [
    ['requirements', 'architect'],
    ['knowledge'],
    ['impact-analysis'],
    ['security', 'testing'],
    ['code-review', 'documentation'],
  ],
  bugfix: [
    ['knowledge', 'impact-analysis'],
    ['debugging'],
    ['testing'],
    ['code-review'],
  ],
  refactor: [
    ['architect'],
    ['refactor', 'performance'],
    ['code-review'],
  ],
  security: [
    ['security'],
    ['pentest'],
    ['code-review'],
  ],
  deployment: [
    ['docker', 'kubernetes'],
    ['deployment', 'release'],
    ['documentation'],
  ],
  hotfix: [
    ['debugging'],
    ['code-review'],
  ],
};

export class Router {
  constructor(agentRegistry = null, capabilityEngine = null, taskMapper = null) {
    this._registry = agentRegistry || getAgentRegistry();
    this._engine = capabilityEngine || getCapabilityEngine(this._registry);
    this._taskMapper = taskMapper || getTaskMapper();
  }

  resolveTask(taskType, prompt = '') {
    const template = PIPELINE_TEMPLATES[taskType];
    if (!template) {
      return { taskType, agents: [], description: `Unknown task type: ${taskType}` };
    }

    const intent = this._engine.analyzeIntent(prompt);
    const modelProfile = this._taskMapper.mapTaskType(taskType);

    const pipeline = {
      taskType,
      modelProfile,
      description: template.description,
      agents: this._resolveAgentList(template.agents, intent),
      levels: this._resolveLevels(taskType, intent),
    };

    return pipeline;
  }

  _resolveAgentList(templateAgentIds, intent) {
    const techAgents = intent.keywords.length > 0
      ? this._engine.findBestMatch(intent, {
          topN: 3,
          minScore: 5,
          mode: 'subagent',
        })
      : [];

    const result = [];
    const seen = new Set();

    for (const id of templateAgentIds) {
      const agent = this._registry.findById(id);
      if (agent && !seen.has(agent.id)) {
        result.push(agent);
        seen.add(agent.id);
      }
    }

    for (const { agent } of techAgents) {
      if (!seen.has(agent.id)) {
        result.push(agent);
        seen.add(agent.id);
      }
    }

    return result;
  }

  _resolveLevels(taskType, intent) {
    const levels = PIPELINE_LEVELS[taskType];
    if (!levels) return [];

    const techAgents = intent.keywords.length > 0
      ? this._engine.findBestMatch(intent, {
          topN: 3,
          minScore: 5,
          mode: 'subagent',
        })
      : [];

    const extraAgents = techAgents.map(s => s.agent);

    return levels.map((level, i) => {
      const resolved = level.map(id => this._registry.findById(id)).filter(Boolean);
      if (i === 0) {
        for (const agent of extraAgents) {
          if (!resolved.find(a => a.id === agent.id)) {
            resolved.push(agent);
          }
        }
      }
      return resolved;
    });
  }

  buildPipeline(agentIds) {
    try {
      return this._registry.resolveDependencies(agentIds);
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
      return agentIds;
    }
  }

  suggestAgents(prompt, { topN = 5 } = {}) {
    const intent = this._engine.analyzeIntent(prompt);
    const matches = this._engine.findBestMatch(intent, { topN, minScore: 1 });

    return {
      intent,
      suggestions: matches.map(m => ({
        id: m.agent.id,
        name: m.agent.name,
        score: m.score,
        description: m.agent.frontmatter.description,
      })),
    };
  }
}

export function getRouter(registry = null, engine = null) {
  return new Router(registry, engine);
}

export default getRouter;
