/**
 * Cursor adapter — generates .cursor/rules/<agent>.mdc files
 * + .cursor/rules/<skill>.mdc for skills with globs.
 *
 * Accepts skills as second parameter.
 */

export default function cursorAdapter(agents, skills = []) {
  const files = [];

  // Agents as rules
  for (const agent of agents) {
    files.push({
      path: `.cursor/rules/${agent.name}.mdc`,
      content: `---
description: ${agent.frontmatter.description}
globs: 
---
${agent.body}\n`,
    });
  }

  // Skills as rules with globs
  for (const skill of skills) {
    const globsList = skill.frontmatter.globs?.length
      ? skill.frontmatter.globs.join(', ')
      : '';
    files.push({
      path: `.cursor/rules/${skill.name}.mdc`,
      content: `---
description: ${skill.frontmatter.description}
globs: ${globsList}
---
${skill.body}\n`,
    });
  }

  return files;
}
