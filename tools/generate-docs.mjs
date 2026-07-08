import fs from 'node:fs';
import { getAgentRegistry } from './lib/agent-registry.mjs';
import { getAdapterRegistry } from './lib/adapter-registry.mjs';

export class DocumentationGenerator {
  constructor(agentRegistry = null, adapterRegistry = null) {
    this._registry = agentRegistry || getAgentRegistry();
    this._adapters = adapterRegistry || getAdapterRegistry();
  }

  generateAgentCatalog(agents = null) {
    const list = agents || this._registry.all();
    const lines = [];
    lines.push('# Agent Catalog');
    lines.push('');
    lines.push(`Total agents: **${list.length}**`);
    lines.push('');

    const byCategory = {};
    for (const a of list) {
      const cat = a.frontmatter.category || 'uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(a);
    }

    for (const [cat, agents] of Object.entries(byCategory).sort()) {
      lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${agents.length})`);
      lines.push('');
      lines.push('| Agent | Description | Mode |');
      lines.push('|-------|-------------|------|');
      for (const a of agents.sort((x, y) => x.id.localeCompare(y.id))) {
        const desc = (a.frontmatter.description || '').split('.')[0];
        lines.push(`| ${a.id} | ${desc} | ${a.frontmatter.mode || 'N/A'} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  generateCapabilityCatalog(agents = null) {
    const list = agents || this._registry.all();
    const lines = [];
    lines.push('# Capability Catalog');
    lines.push('');
    lines.push('Agents indexed by keyword and capability for routing.');
    lines.push('');

    const capMap = {};
    for (const a of list) {
      const caps = a.frontmatter.capabilities || [];
      const kws = a.frontmatter.keywords || [];
      for (const c of caps) {
        if (!capMap[c]) capMap[c] = [];
        capMap[c].push(a.id);
      }
      for (const kw of kws) {
        if (!capMap[kw]) capMap[kw] = [];
        if (!capMap[kw].includes(a.id)) capMap[kw].push(a.id);
      }
    }

    lines.push('| Capability/Keyword | Agents |');
    lines.push('|-------------------|--------|');
    for (const [cap, agentIds] of Object.entries(capMap).sort()) {
      lines.push(`| ${cap} | ${agentIds.join(', ')} |`);
    }
    lines.push('');

    return lines.join('\n');
  }

  generateDAGDiagram(pipelines = null) {
    const lines = [];
    lines.push('```mermaid');
    lines.push('graph TD');

    const taskPipelines = pipelines || {
      feature: ['Git', 'Planner', 'Requirements', 'Architect', 'Knowledge', 'Impact', 'Security', 'Testing', 'CodeReview', 'Documentation'],
      bugfix: ['Git', 'Planner', 'Knowledge', 'Impact', 'Debugging', 'Testing', 'CodeReview'],
      refactor: ['Git', 'Architect', 'Refactor', 'Performance', 'CodeReview'],
      security: ['Git', 'Security', 'Pentest', 'CodeReview'],
      deployment: ['Git', 'Docker', 'Kubernetes', 'Build', 'Release', 'Documentation'],
      hotfix: ['Git', 'Debugging', 'CodeReview'],
    };

    for (const [type, agents] of Object.entries(taskPipelines)) {
      lines.push('');
      lines.push(`  subgraph ${type.charAt(0).toUpperCase() + type.slice(1)}`);
      const safeId = (name) => name.replace(/[^a-zA-Z0-9]/g, '');
      for (let i = 0; i < agents.length - 1; i++) {
        lines.push(`    ${safeId(agents[i])} --> ${safeId(agents[i + 1])}`);
      }
      lines.push('  end');
    }

    lines.push('```');
    return lines.join('\n');
  }

  generatePlatformMatrix(agents = null) {
    const list = agents || this._registry.all();
    const platforms = this._adapters.listAdapters();

    const lines = [];
    lines.push('# Platform Compatibility Matrix');
    lines.push('');
    lines.push(`| Agent | ${platforms.join(' | ')} |`);
    lines.push(`|-------|${platforms.map(() => '------|').join('')}`);

    for (const a of list.sort((x, y) => x.id.localeCompare(y.id))) {
      const compat = a.frontmatter.compatible_platforms || platforms;
      const row = platforms.map(p => compat.includes(p) ? '✅' : '❌').join(' | ');
      lines.push(`| ${a.id} | ${row} |`);
    }

    return lines.join('\n');
  }

  generateArchitectureDiagram() {
    return `\`\`\`mermaid
graph TB
  subgraph Agents
    A[agents/*.md]
  end
  subgraph Registry
    AR[AgentRegistry]
    AD[AdapterRegistry]
  end
  subgraph Engine
    CE[CapabilityEngine]
    RT[Router]
  end
  subgraph Scheduling
    DG[DAG]
    SC[Scheduler]
  end
  subgraph Telemetry
    TC[TelemetryCollector]
    TS[TelemetryStorage]
    TR[TelemetryReporter]
  end
  subgraph Output
    V[validate.mjs]
    E[export.mjs]
  end

  A --> AR
  AR --> CE
  CE --> RT
  RT --> SC
  SC --> DG
  SC --> TC
  TC --> TS
  TC --> TR
  AR --> V
  AR --> AD
  AD --> E
\`\`\``;
  }

  generateAll() {
    return {
      catalog: this.generateAgentCatalog(),
      capabilities: this.generateCapabilityCatalog(),
      dag: this.generateDAGDiagram(),
      matrix: this.generatePlatformMatrix(),
      architecture: this.generateArchitectureDiagram(),
    };
  }

  saveTo(dir) {
    const docs = this.generateAll();
    for (const [name, content] of Object.entries(docs)) {
      const filePath = dir + '/' + name + '.md';
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Wrote ${filePath}`);
    }
  }
}

export function getDocGenerator(registry = null, adapters = null) {
  return new DocumentationGenerator(registry, adapters);
}

export default getDocGenerator;
