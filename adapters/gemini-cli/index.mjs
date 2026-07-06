/**
 * Gemini CLI adapter — generates gemini prompt instruction files.
 */

export default function geminiCliAdapter(agents) {
  return agents.map(agent => ({
    path: `.gemini/${agent.name}.md`,
    content: `You are a ${agent.frontmatter.description}.\n\n${agent.body}\n`,
  }));
}
