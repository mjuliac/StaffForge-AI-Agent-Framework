/**
 * Claude Code adapter — generates CLAUDE.md + .claude/agents/<agent>.md subagents.
 *
 * Claude Code loads subagents from `.claude/agents/*.md` (not `.claude/rules/`,
 * which is for always-on project rules). Each subagent file needs frontmatter
 * with name, description, and optional tools.
 */

export default function claudeCodeAdapter(agents) {
  const files = [];

  const orchestratorAgent = agents.find(a => a.name === 'orchestrator');
  if (orchestratorAgent) {
    files.push({
      path: "CLAUDE.md",
      content: orchestratorAgent.body + "\n",
    });
  }

  for (const agent of agents.filter(a => a.name !== 'orchestrator')) {
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

  return files;
}

