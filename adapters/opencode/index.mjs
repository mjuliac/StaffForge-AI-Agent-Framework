/**
 * OpenCode adapter — generates opencode.json + .opencode/skills/<name>.md.
 * Accepts skills as second parameter.
 */

export default function opencodeAdapter(agents, skills = []) {
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
      prompt: a.body,
    };
  }

  const orchestrator = agents.find(a => a.id === "orchestrator");
  const defaultAgent = orchestrator?.name
    || agents.find(a => a.frontmatter.mode === "primary")?.name
    || "build";

  const opencodeJson = {
    $schema: "https://opencode.ai/config.json",
    default_agent: defaultAgent,
    agent: agentEntries,
  };

  // Add skills config if skills exist
  if (skills.length > 0) {
    opencodeJson.skills = {
      paths: [".opencode/skills"],
    };
  }

  const files = [
    {
      path: "opencode.json",
      content: JSON.stringify(opencodeJson, null, 2) + "\n",
    },
  ];

  // Write individual skill files
  for (const skill of skills) {
    const globsYaml = skill.frontmatter.globs?.length
      ? `globs: ${JSON.stringify(skill.frontmatter.globs)}\n`
      : "";
    files.push({
      path: `.opencode/skills/${skill.name}.md`,
      content: `---
name: ${skill.name}
description: ${skill.frontmatter.description}
${globsYaml}---
${skill.body}\n`,
    });
  }

  return files;
}
