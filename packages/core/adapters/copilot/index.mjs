/**
 * GitHub Copilot adapter — generates:
 *   .github/copilot-instructions.md              (neutral project context — does NOT override @ask/@plan)
 *   .github/agents/*.agent.md                    (ALL agents @mention-able, including orchestrator)
 *   .github/instructions/<skill>.instructions.md  (skills as topic-specific instructions)
 *
 * Accepts skills as second parameter.
 *
 * IMPORTANT: copilot-instructions.md MUST remain NEUTRAL — it has applyTo: "**" which
 * applies to ALL Copilot conversations. If it says "you are the orchestrator", it
 * overrides @ask (default chat), @plan, and every other built-in agent.
 * The orchestrator (and all other agents) exist ONLY as .agent.md files in
 * .github/agents/ — they are @mention-able alongside @ask, @plan, and @workspace.
 *
 * Per GitHub Copilot conventions:
 * - copilot-instructions.md applies to EVERY conversation — keep it generic
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

  // ── 1. copilot-instructions.md — NEUTRAL project context ───────────────
  // CRITICAL: This file has applyTo: "**" which applies to EVERY Copilot
  // conversation. If we put "you are the orchestrator" here, it overrides
  // @ask (default chat), @plan, and ALL built-in agents.
  // This file MUST remain neutral — just project-level context.
  files.push({
    path: '.github/copilot-instructions.md',
    content: `---
applyTo: "**"
---

StaffForge AI Agent Framework — Multi-provider agent system.
Use @orchestrator for multi-agent pipeline execution.
Technology agents (@python, @typescript, @react, etc.) are available via @mention.
`,
  });

  // ── 2. .github/agents/<name>.agent.md — ALL agents @mention-able ──────
  // Every agent gets its own .agent.md so it can be @mentioned directly.
  // Built-in Copilot agents (@ask, @plan, @workspace) remain available
  // because we do NOT override copilot-instructions.md with agent identity.
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
