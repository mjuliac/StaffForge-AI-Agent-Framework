/**
 * OpenCode adapter — generates opencode.json referencing AGENTS.md as instructions.
 */

export default function opencodeAdapter(agents) {
  const mapPermission = (tools) => ({
    edit: tools.edit ? "allow" : "deny",
    bash: tools.bash ? "allow" : "deny",
  });

  const agentEntries = {};
  for (const a of agents) {
    agentEntries[a.name] = {
      description: a.frontmatter.description,
      mode: a.frontmatter.mode,
      permission: mapPermission(a.frontmatter.tools),
    };
  }

  const orchestrator = agents.find(a => a.name === "orchestrator");
  const defaultAgent = orchestrator?.name
    || agents.find(a => a.frontmatter.mode === "primary")?.name
    || "build";

  const opencodeJson = {
    $schema: "https://opencode.ai/config.json",
    default_agent: defaultAgent,
    instructions: ["AGENTS.md"],
    agent: agentEntries,
  };

  return [
    {
      path: "opencode.json",
      content: JSON.stringify(opencodeJson, null, 2) + "\n",
    },
  ];
}
