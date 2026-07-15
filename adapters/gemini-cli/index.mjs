/**
 * Gemini CLI adapter — generates .gemini/<agent>.md and .gemini/<skill>.md files.
 *
 * Accepts skills as second parameter.
 */

export default function geminiCliAdapter(agents, skills = []) {
  const files = [];

  // Agent instruction files
  for (const agent of agents) {
    files.push({
      path: `.gemini/${agent.name}.md`,
      content: agent.body + '\n',
    });
  }

  // Skill instruction files (prefixed with skill- for clarity)
  for (const skill of skills) {
    files.push({
      path: `.gemini/${skill.name}.md`,
      content: `# ${skill.title}: ${skill.frontmatter.description}\n\n${skill.body}\n`,
    });
  }

  return files;
}
