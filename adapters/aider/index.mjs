/**
 * Aider adapter — generates .aider.rules.md with agent and skill rules.
 *
 * Accepts skills as second parameter.
 */

export default function aiderAdapter(agents, skills = []) {
  const rules = agents.map(a => a.body);

  if (skills.length > 0) {
    rules.push('# Skills');
    rules.push('');
    rules.push(...skills.map(s => s.body));
  }

  return [
    {
      path: ".aider.rules.md",
      content: rules.join('\n\n---\n\n'),
    },
  ];
}
