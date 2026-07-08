import { getAgentRegistry } from './agent-registry.mjs';
import { getCapabilityEngine } from './capability-engine.mjs';
import { getTaskMapper } from './task-mapper.mjs';
import { getLogger } from './logger.mjs';
import pipelineRegistry from './pipeline-registry.mjs';

export class Router {
  constructor(agentRegistry = null, capabilityEngine = null, taskMapper = null) {
    this._registry = agentRegistry || getAgentRegistry();
    this._engine = capabilityEngine || getCapabilityEngine(this._registry);
    this._taskMapper = taskMapper || getTaskMapper();
    this._log = getLogger();
  }

  resolveTask(taskType, prompt = '') {
    const template = pipelineRegistry.resolve(taskType);
    if (!template) {
      return { taskType, agents: [], description: `Unknown task type: ${taskType}` };
    }

    const intent = this._engine.analyzeIntent(prompt);
    const modelProfile = this._taskMapper.mapTaskType(taskType, prompt);

    const pipeline = {
      taskType,
      modelProfile,
      description: template.description,
      agents: this._resolveAgentList(template, intent),
      levels: this._resolveLevels(template, intent),
    };

    return pipeline;
  }

  _resolveAgentList(template, intent) {
    const techAgents =
      intent.keywords.length > 0
        ? this._engine.findBestMatch(intent, {
            topN: 3,
            minScore: 5,
            mode: 'subagent',
          })
        : [];

    const result = [];
    const seen = new Set();

    // Get all agents from all levels
    const allTemplateAgents = template.levels?.flatMap((level) => level.agents) || [];

    for (const id of allTemplateAgents) {
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

  _resolveLevels(template, intent) {
    const levels = template.levels;
    if (!levels) return [];

    const techAgents =
      intent.keywords.length > 0
        ? this._engine.findBestMatch(intent, {
            topN: 3,
            minScore: 5,
            mode: 'subagent',
          })
        : [];

    const extraAgents = techAgents.map((s) => s.agent);

    return levels.map((level, i) => {
      const resolved = (level.agents || []).map((id) => this._registry.findById(id)).filter(Boolean);
      if (i === 0) {
        for (const agent of extraAgents) {
          if (!resolved.find((a) => a.id === agent.id)) {
            resolved.push(agent);
          }
        }
      }
      // Preserve YAML level structure
      return {
        name: level.name,
        parallel: level.parallel || false,
        agents: resolved,
      };
    });
  }

  buildPipeline(agentIds) {
    try {
      return this._registry.resolveDependencies(agentIds);
    } catch (err) {
      this._log.error(`${err.message}`);
      return agentIds;
    }
  }

  suggestAgents(prompt, { topN = 5 } = {}) {
    const intent = this._engine.analyzeIntent(prompt);
    const matches = this._engine.findBestMatch(intent, { topN, minScore: 1 });

    return {
      intent,
      suggestions: matches.map((m) => ({
        id: m.agent.id,
        name: m.agent.name,
        score: m.score,
        description: m.agent.frontmatter.description,
      })),
    };
  }
}

export function getRouter(registry = null, engine = null, taskMapper = null) {
  return new Router(registry, engine, taskMapper);
}

export default getRouter;
