/**
 * Cursor adapter — generates .cursor/rules/<agent>.mdc files.
 */

export default function cursorAdapter(agents) {
  return agents.map(agent => ({
    path: `.cursor/rules/${agent.name}.mdc`,
    content: `---
description: ${agent.frontmatter.description}
globs: 
---
${agent.body}\n`,
  }));
}
