/**
 * Aider adapter — generates .aider.rules.md and .aider.conf.yml.
 */

export default function aiderAdapter(agents) {
  const orchestrator = agents.find(a => a.name === 'orchestrator');
  const others = agents.filter(a => a.name !== 'orchestrator');

  const rules = [];

  if (orchestrator) {
    rules.push(`# Orchestrator\n${orchestrator.body}\n`);
  }

  for (const agent of others) {
    rules.push(`## ${agent.name}\n${agent.frontmatter.description}\n${agent.body}\n`);
  }

  return [
    {
      path: ".aider.rules.md",
      content: rules.join('\n---\n\n'),
    },
  ];
}
