/**
 * GitHub Copilot adapter — generates .github/copilot-instructions.md.
 */

export default function copilotAdapter(agents) {
  const lines = [];
  for (const agent of agents) {
    lines.push(agent.body);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return [
    {
      path: '.github/copilot-instructions.md',
      content: lines.join('\n'),
    },
  ];
}
