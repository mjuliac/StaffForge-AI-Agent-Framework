/**
 * Claude Code adapter — generates CLAUDE.md + .claude/agents/<agent>.md subagents
 * + .claude/skills/<skill>.md for skills.
 *
 * Accepts skills as second parameter.
 */

export default function claudeCodeAdapter(agents, skills = []) {
  const files = [];

  const orchestratorAgent = agents.find(a => a.name.toLowerCase() === 'orchestrator');
  if (orchestratorAgent) {
    files.push({
      path: "CLAUDE.md",
      content: orchestratorAgent.body + "\n",
    });
  }

  for (const agent of agents.filter(a => a.name.toLowerCase() !== 'orchestrator')) {
    const tools = agent.frontmatter.tools || {};
    const toolList = ['read', 'write', 'bash', 'edit']
      .filter((t) => tools[t])
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(', ');
    const frontmatter = [
      '---',
      `name: ${agent.name}`,
      `description: ${agent.frontmatter.description}`,
      toolList ? `tools: ${toolList}` : null,
      '---',
    ].filter(Boolean).join('\n');

    files.push({
      path: `.claude/agents/${agent.name}.md`,
      content: `${frontmatter}\n\n${agent.body}\n`,
    });
  }

  // Write skills as .claude/skills/<name>.md
  for (const skill of skills) {
    files.push({
      path: `.claude/skills/${skill.name}.md`,
      content: `---
name: ${skill.name}
description: ${skill.frontmatter.description}
---
${skill.body}\n`,
    });
  }

  return files;
}
