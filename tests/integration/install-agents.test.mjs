import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const cli = join(root, 'packages', 'cli', 'install.mjs');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
  } else {
    console.error('FAIL  ' + name);
    failed++;
  }
}

// Run an install inside a fresh temp "project" directory so CWD !== fw
// (mirrors real usage: npx into a user project, not the framework repo).
function runInstallInProject(platform) {
  const project = mkdtempSync(join(tmpdir(), 'staff-proj-'));
  const result = spawnSync(
    'node',
    [cli, '--yes', '--platform', platform, '--agent', 'orchestrator'],
    { cwd: project, encoding: 'utf-8' }
  );
  return { project, result };
}

// ── Test 1: opencode.json includes each agent's body (prompt field) ──
{
  const { project, result } = runInstallInProject('opencode');
  assert(result.status === 0, 'opencode install exits 0');

  const json = JSON.parse(readFileSync(join(project, 'opencode.json'), 'utf-8'));
  assert(json.agent && typeof json.agent === 'object', 'opencode.json has agent map');

  const a11y = json.agent.a11y;
  assert(a11y && a11y.prompt, 'opencode a11y agent has prompt field');
  assert(a11y.prompt.includes('# Accessibility'), 'opencode a11y prompt contains agent body (Mission)');
  assert(a11y.prompt.includes('## Mandatory Rules'), 'opencode a11y prompt contains rules');

  const orchestrator = json.agent.orchestrator;
  assert(orchestrator && orchestrator.prompt, 'opencode orchestrator has prompt');
  assert(orchestrator.prompt.length > 100, 'opencode Orchestrator prompt is non-trivial');

  // No broken instructions reference to a missing AGENTS.md
  assert(!json.instructions || !json.instructions.includes('AGENTS.md'), 'opencode no broken AGENTS.md reference');

  // agents/ folder copied into the project
  assert(existsSync(join(project, 'agents')), 'agents/ copied into project');
  if (existsSync(join(project, 'agents'))) {
    const mdFiles = readdirSync(join(project, 'agents')).filter((f) => f.endsWith('.md'));
    assert(mdFiles.length >= 140, 'agents/ has ~141 .md files (' + mdFiles.length + ')');
  }
  rmSync(project, { recursive: true, force: true });
}

// ── Test 2: claude-code uses .claude/agents/ (not .claude/rules/) ──
{
  const { project, result } = runInstallInProject('claude-code');
  assert(result.status === 0, 'claude-code install exits 0');

  const agentsDir = join(project, '.claude', 'agents');
  assert(existsSync(agentsDir), 'claude-code creates .claude/agents/');

  if (existsSync(agentsDir)) {
    const files = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
    assert(files.length >= 140, 'claude-code .claude/agents/ has ~141 agent files (' + files.length + ')');
    assert(files.includes('A11y.md'), 'claude-code has A11y.md');

    const a11y = readFileSync(join(agentsDir, 'A11y.md'), 'utf-8');
    assert(a11y.startsWith('---'), 'claude-code A11y.md has frontmatter');
    assert(a11y.includes('name: A11y'), 'claude-code A11y.md frontmatter has name');
    assert(a11y.includes('# Accessibility'), 'claude-code A11y.md contains agent body');
    assert(a11y.includes('## Mandatory Rules'), 'claude-code A11y.md contains rules');
  }

  // Must NOT dump agents into .claude/rules/ (that's for always-on rules)
  const rulesDir = join(project, '.claude', 'rules');
  if (existsSync(rulesDir)) {
    const ruleFiles = readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
    assert(ruleFiles.length === 0, 'claude-code does NOT dump agents into .claude/rules/');
  }

  // agents/ folder also present
  assert(existsSync(join(project, 'agents')), 'claude-code also copies agents/ folder');
  rmSync(project, { recursive: true, force: true });
}

// ── Test 3: cursor includes agent body in .cursor/rules/*.mdc ──
{
  const { project, result } = runInstallInProject('cursor');
  assert(result.status === 0, 'cursor install exits 0');

  const rulesDir = join(project, '.cursor', 'rules');
  assert(existsSync(rulesDir), 'cursor creates .cursor/rules/');
  if (existsSync(rulesDir)) {
    const a11y = readFileSync(join(rulesDir, 'A11y.mdc'), 'utf-8');
    assert(a11y.includes('# Accessibility'), 'cursor A11y.mdc contains agent body');
    assert(a11y.includes('## Mandatory Rules'), 'cursor A11y.mdc contains rules');
  }
  rmSync(project, { recursive: true, force: true });
}

// ── Test 4: copilot generates correct structure ──
//   .github/copilot-instructions.md  (orchestrator body — always active)
//   .github/agents/*.agent.md         (individual sub-agents)
//   .github/instructions/             (skills as instructions)
{
  const { project, result } = runInstallInProject('copilot');
  assert(result.status === 0, 'copilot install exits 0');

  // copilot-instructions.md contains ONLY orchestrator body (default agent)
  const inst = join(project, '.github', 'copilot-instructions.md');
  assert(existsSync(inst), 'copilot creates .github/copilot-instructions.md');
  if (existsSync(inst)) {
    const content = readFileSync(inst, 'utf-8');
    assert(content.includes('# Orchestrator'), 'copilot-instructions.md has orchestrator body');
    assert(content.includes('## Mandatory Rules'), 'copilot-instructions.md has orchestrator rules');
    // Must NOT dump all agent bodies — those go in .github/agents/
    assert(!content.includes('# Accessibility'), 'copilot-instructions.md does NOT include non-orchestrator bodies');
  }

  // .github/agents/ directory with ONLY orchestrator.agent.md
  // (NOT all 150+ agents — that would override Copilot's native @ask, @plan, @workspace)
  const agentsDir = join(project, '.github', 'agents');
  assert(existsSync(agentsDir), 'copilot creates .github/agents/');
  if (existsSync(agentsDir)) {
    const agentFiles = readdirSync(agentsDir).filter((f) => f.endsWith('.agent.md'));
    assert(agentFiles.length === 1, '.github/agents/ has exactly 1 .agent.md (orchestrator only), got ' + agentFiles.length);
    assert(agentFiles.includes('orchestrator.agent.md'), 'orchestrator IS in .github/agents/ as @mentionable');

    // Verify orchestrator.agent.md has proper YAML frontmatter + body
    const orchFile = readFileSync(join(agentsDir, 'orchestrator.agent.md'), 'utf-8');
    assert(orchFile.startsWith('---'), 'orchestrator.agent.md starts with frontmatter');
    assert(orchFile.includes('name: Orchestrator'), 'orchestrator.agent.md frontmatter has name');
    assert(orchFile.includes('description: '), 'orchestrator.agent.md frontmatter has description');
    assert(orchFile.includes('# Orchestrator'), 'orchestrator.agent.md contains orchestrator body');
    assert(orchFile.includes('## Mandatory Rules'), 'orchestrator.agent.md contains rules');
  }

  rmSync(project, { recursive: true, force: true });
}

// ── Test 5: aider rules include agent bodies ──
{
  const { project, result } = runInstallInProject('aider');
  assert(result.status === 0, 'aider install exits 0');

  const aider = join(project, '.aider.rules.md');
  assert(existsSync(aider), 'aider creates .aider.rules.md');
  if (existsSync(aider)) {
    const content = readFileSync(aider, 'utf-8');
    assert(content.includes('# Accessibility'), 'aider rules include A11y body');
  }
  rmSync(project, { recursive: true, force: true });
}

// ── Test 6: gemini-cli creates .gemini/<agent>.md with bodies ──
{
  const { project, result } = runInstallInProject('gemini-cli');
  assert(result.status === 0, 'gemini-cli install exits 0');

  const geminiDir = join(project, '.gemini');
  assert(existsSync(geminiDir), 'gemini-cli creates .gemini/');
  if (existsSync(geminiDir)) {
    const a11y = readFileSync(join(geminiDir, 'A11y.md'), 'utf-8');
    assert(a11y.includes('# Accessibility'), 'gemini A11y.md contains agent body');
  }
  rmSync(project, { recursive: true, force: true });
}

// ── Test 7: canonical agents/ folder copied to every install target ──
{
  const { project, result } = runInstallInProject('opencode');
  assert(result.status === 0, 'install exits 0 for agents/ copy test');

  const outAgents = join(project, 'agents');
  assert(existsSync(outAgents), 'agents/ copied into project');
  if (existsSync(outAgents)) {
    const mdFiles = readdirSync(outAgents).filter((f) => f.endsWith('.md'));
    assert(mdFiles.length >= 140, 'agents/ contains ~141 .md files (' + mdFiles.length + ')');
    assert(mdFiles.includes('a11y.md'), 'agents/ has a11y.md');
    const a11y = readFileSync(join(outAgents, 'a11y.md'), 'utf-8');
    assert(a11y.includes('# Accessibility'), 'agents/a11y.md has body');
    assert(a11y.includes('## Mandatory Rules'), 'agents/a11y.md has rules');
  }
  rmSync(project, { recursive: true, force: true });
}

// ── Test 8: every agent in the repo source has a non-empty body ──
{
  const agentsDir = join(root, 'agents');
  const mdFiles = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  assert(mdFiles.length >= 140, 'repo has ~141 agent source files');

  let bodiesOk = 0;
  for (const f of mdFiles) {
    const content = readFileSync(join(agentsDir, f), 'utf-8');
    const body = content.split('---')[2] || '';
    if (body.trim().length > 20) bodiesOk++;
  }
  assert(bodiesOk === mdFiles.length, 'every agent source file has a non-empty body');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
