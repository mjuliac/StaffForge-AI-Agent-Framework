/**
 * Claude Code adapter — generates CLAUDE.md + .claude/rules/<agent>.md.
 */

export default function claudeCodeAdapter(agents) {
  const files = [];

  const orchestratorAgent = agents.find((a) => a.name === 'orchestrator');
  if (orchestratorAgent) {
    files.push({
      path: 'CLAUDE.md',
      content: orchestratorAgent.body + '\n',
    });
  }

  const rules = agents.filter((a) => a.name !== 'orchestrator');
  for (const agent of rules) {
    files.push({
      path: `.claude/rules/${agent.name}.md`,
      content: `---\n${Object.entries(agent.frontmatter)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n')}\n---\n\n${agent.body}\n`,
    });
  }

  return files;
}
