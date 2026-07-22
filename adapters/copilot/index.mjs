/**
 * GitHub Copilot adapter — generates:
 *   .github/copilot-instructions.md              (Orchestrator as default — always active)
 *   .github/agents/orchestrator.agent.md          (Orchestrator @mention-able)
 *   .github/instructions/<skill>.instructions.md  (Skills as topic-specific instructions)
 *
 * Accepts skills as second parameter.
 *
 * IMPORTANT: Only orchestrator gets an .agent.md file. We do NOT generate
 * .agent.md for every framework agent (150+) because that would OVERRIDE
 * Copilot's native agents (@ask, @plan, @workspace) and make them disappear.
 *
 * Per GitHub Copilot conventions:
 * - copilot-instructions.md applies to EVERY conversation (default agent behavior)
 * - .github/agents/*.agent.md files create @mention-able custom agents
 * - .github/instructions/*.instructions.md files apply to matching file globs
 */

function mapTools(frontmatter) {
  const tools = frontmatter.tools || {};
  const allowed = [];

  // read/search are baseline — include when agent has any write/edit capability
  if (tools.write || tools.edit) {
    allowed.push('read', 'edit');
  }
  if (tools.bash) {
    allowed.push('execute');
  }
  // agent tool allows invoking other custom agents
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

  // ── 1. copilot-instructions.md — Orchestrator as default agent ─────────
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

  // ── 2. .github/agents/orchestrator.agent.md — ONLY the orchestrator ────
  // We intentionally do NOT generate .agent.md for all 150+ agents because
  // that would override Copilot's native agents (@ask, @plan, @workspace).
  if (orchestrator) {
    const frontmatter = buildAgentFrontmatter(orchestrator);
    files.push({
      path: `.github/agents/${orchestrator.id}.agent.md`,
      content: `${frontmatter}\n\n${orchestrator.body}\n`,
    });
  }

  // ── 3. .github/instructions/<skill>.instructions.md — Skills ───────────
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
