import { DAG } from './dag.mjs';
import { getAgentRegistry } from './registries/agent-registry.mjs';

export class Scheduler {
  constructor(agentRegistry = null) {
    this._registry = agentRegistry || getAgentRegistry();
  }

  fromDAG(dag) {
    const levels = dag.getLevels();
    return {
      type: 'dag',
      levels: levels.map((level) => ({
        parallel: level.map((id) => {
          const agent = dag.getNode(id);
          return { id, agent };
        }),
      })),
      totalLevels: levels.length,
      totalAgents: dag.nodeCount(),
    };
  }

  fromAgentIds(agentIds) {
    const dag = new DAG();
    for (const id of agentIds) {
      const agent = this._registry.findById(id);
      if (agent) {
        dag.addNode(id, agent);
      }
    }
    for (const id of agentIds) {
      const agent = this._registry.findById(id);
      if (!agent) continue;
      const prereqs = [...(agent.frontmatter.depends_on || []), ...(agent.frontmatter.after || [])];
      for (const dep of prereqs) {
        if (dag.hasNode(dep)) {
          dag.addEdge(dep, id);
        }
      }
    }
    return this.fromDAG(dag);
  }

  fromRouterPipeline(pipeline) {
    // Use YAML pipeline level structure if available
    if (pipeline.levels && pipeline.levels.length > 0) {
      const levels = pipeline.levels.map((level, i) => ({
        level: i + 1,
        parallel: (level.agents || [])
          .map((agent) => {
            const id = agent.id || agent;
            const a = this._registry.findById(id);
            return { id, name: a?.name || id, agent: a };
          })
          .filter((p) => p.agent),
      }));

      return {
        type: 'yaml',
        levels,
        totalLevels: levels.length,
        totalAgents: levels.reduce((sum, l) => sum + l.parallel.length, 0),
      };
    }

    // Fallback to flat agent list
    const allAgentIds = [];

    if (pipeline.agents) {
      for (const agent of pipeline.agents) {
        const id = agent.id || agent;
        if (!allAgentIds.includes(id)) allAgentIds.push(id);
      }
    }

    return this.fromAgentIds(allAgentIds);
  }

  buildPlan(taskType, agentIds, context = {}) {
    const execution = this.fromAgentIds(agentIds);

    return {
      taskType,
      context,
      totalLevels: execution.totalLevels,
      totalAgents: execution.totalAgents,
      levels: execution.levels.map((level, i) => ({
        level: i + 1,
        parallel: level.parallel.map((p) => ({
          id: p.id,
          name: p.agent?.name || p.id,
        })),
      })),
      summary: this._summarizeLevels(execution.levels),
    };
  }

  _summarizeLevels(levels) {
    return levels.map((level, i) => {
      const names = level.parallel.filter((p) => p.agent).map((p) => p.agent.name || p.id);
      return `Level ${i + 1}: [${names.join(', ')}]`;
    });
  }

  validatePipeline(agentIds) {
    const dag = DAG.fromAgents(agentIds.map((id) => this._registry.findById(id)).filter(Boolean));
    return dag.validate();
  }
}

export function getScheduler(registry = null) {
  return new Scheduler(registry);
}

export default getScheduler;
