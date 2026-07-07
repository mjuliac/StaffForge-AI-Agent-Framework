/**
 * Aider adapter — generates .aider.rules.md
 */

export default function aiderAdapter(agents) {
  const rules = agents.map(a => a.body);

  return [
    {
      path: ".aider.rules.md",
      content: rules.join('\n\n---\n\n'),
    },
  ];
}
