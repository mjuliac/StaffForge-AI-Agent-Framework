/**
 * GitHub Copilot adapter — generates .github/copilot-instructions.md
 * with agent instructions and skill instructions.
 *
 * Accepts skills as second parameter.
 */

export default function copilotAdapter(agents, skills = []) {
  const lines = [];

  // Agent instructions
  for (const agent of agents) {
    lines.push(agent.body);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Skill instructions (separated by type)
  if (skills.length > 0) {
    lines.push('# Skills');
    lines.push('');
    for (const skill of skills) {
      lines.push(`## ${skill.title}: ${skill.frontmatter.description}`);
      lines.push('');
      lines.push(skill.body);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return [
    {
      path: ".github/copilot-instructions.md",
      content: lines.join('\n'),
    },
  ];
}
