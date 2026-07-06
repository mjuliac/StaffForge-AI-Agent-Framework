/**
 * OpenCode adapter — generates opencode.json referencing AGENTS.md as instructions.
 */

export default function opencodeAdapter(agents) {
  const agentEntries = agents.map(a => ({
    name: a.name,
    description: a.frontmatter.description,
    mode: a.frontmatter.mode,
    tools: a.frontmatter.tools,
  }));

  const opencodeJson = {
    instructions: "AGENTS.md",
    agents: agentEntries,
  };

  return [
    {
      path: "opencode.json",
      content: JSON.stringify(opencodeJson, null, 2) + "\n",
    },
  ];
}
