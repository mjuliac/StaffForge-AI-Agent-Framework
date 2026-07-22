/**
 * GitHub Copilot adapter — generates:
 *   .github/copilot-instructions.md     (orchestrator as default — always active)
 *   .github/agents/<id>.agent.md         (all agents @mentionable, including orchestrator)
 *   .github/instructions/<skill>.instructions.md (skills as topic-specific instructions)
 *
 * Accepts skills as second parameter.
 *
 * Per GitHub Copilot conventions:
 * - copilot-instructions.md applies to EVERY conversation (default agent behavior)
 * - .github/agents/*.agent.md files create @mention-able custom agents
 * - .github/instructions/*.instructions.md files apply to matching file globs
 */

function mapTools(frontmatter) {
  const tools = frontmatter.tools || {};
  const allowed = [];
  if (tools.write || tools.edit) {
    allowed.push('read', 'edit');
  }
  if (tools.bash) {
    allowed.push('execute');
  }
  allowed.push('agent');
  return allowed.length > 0 ? allowed : undefined;
}

function buildAgentFrontmatter(agent) {
  const lines = ['---'];
  lines.push(`name: ${agent.name}`);
  const desc = agent.frontmatter.description || '';
  if (desc) lines.push(`description: ${desc}`);
  const tools = mapTools(agent.frontmatter);
  if (tools) {
    lines.push(`tools: [${tools.map((t) => `'${t}'`).join(', ')}]`);
  }
  lines.push('---');
  return lines.join('\n');
}

export default function copilotAdapter(agents, skills = []) {
  const files = [];

  // ── 1. copilot-instructions.md — orchestrator as default agent ─────────
  const orchestrator = agents.find((a) => a.name.toLowerCase() === 'orchestrator');
  if (orchestrator) {
    files.push({
      path: '.github/copilot-instructions.md',
      content: `---
applyTo: "**"
---

You are the default agent acting as orchestrator. All user requests arrive through you first.
${orchestrator.body}
`,
    });
  }

  // ── 2. .github/agents/<id>.agent.md — all agents @mentionable ────────────
  for (const agent of agents) {
    const frontmatter = buildAgentFrontmatter(agent);
    files.push({
      path: `.github/agents/${agent.id}.agent.md`,
      content: `${frontmatter}\n\n${agent.body}\n`,
    });
  }

  // ── 3. .github/instructions/<skill>.instructions.md — skills ─────────────
  for (const skill of skills) {
    const globs = skill.frontmatter.globs?.length ? skill.frontmatter.globs.join(', ') : '**';
    files.push({
      path: `.github/instructions/${skill.name}.instructions.md`,
      content: `---
applyTo: "${globs}"
---

${skill.body}\n`,
    });
  }

  return files;
}
