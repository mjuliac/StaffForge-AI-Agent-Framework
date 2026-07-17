/**
 * OpenCode adapter — generates opencode.json referencing AGENTS.md as instructions.
 *
 * CRITICAL: Must NOT override OpenCode built-in agents. Agents whose
 * lowercased name matches an OpenCode built-in are excluded from the
 * agent entries (they still exist for other platforms).
 */

const OPENCODE_BUILTINS = new Set([
  'build', 'plan', 'general', 'explore',
  'title', 'summary', 'compaction',
]);

export default function opencodeAdapter(agents) {
  const mapPermission = (tools) => ({
    edit: tools.edit ? 'allow' : 'deny',
    bash: tools.bash ? 'allow' : 'deny',
  });

  const agentEntries = {};
  for (const a of agents) {
    const key = a.name.toLowerCase();
    // MUST skip OpenCode built-in agents to avoid breaking /build, /plan, /compact, etc.
    if (OPENCODE_BUILTINS.has(key)) continue;
    agentEntries[key] = {
      description: a.frontmatter.description,
      mode: a.frontmatter.mode,
      permission: mapPermission(a.frontmatter.tools),
    };
  }

  const orchestrator = agents.find((a) => a.name === 'orchestrator');
  const defaultAgent = (
    orchestrator?.name ||
    agents.find((a) => a.frontmatter.mode === 'primary')?.name ||
    'build'
  ).toLowerCase();

  const opencodeJson = {
    $schema: 'https://opencode.ai/config.json',
    default_agent: defaultAgent,
    instructions: ['AGENTS.md'],
    agent: agentEntries,
  };

  return [
    {
      path: 'opencode.json',
      content: JSON.stringify(opencodeJson, null, 2) + '\n',
    },
  ];
}
