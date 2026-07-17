/**
 * Integration test: every installation type documented in README.md.
 *
 * README install paths covered:
 *   1. `npx github:StaffForge/StaffForge-AI-Agent-Framework` — interactive
 *   2. same npx command — non-interactive flags (--platform/--agent)
 *   3. same npx command — re-run / "update to latest" (detects previous config)
 *   4. Clone repo + npm install + `npm run setup` (interactive installer)
 *   5. Export to other platforms (`npm run export:<platform>`)
 *   6. Interactive installer with --platform all
 *
 * Core requirement (user): create a folder, install via npx, verify the agents
 * are downloaded into the project folder, and that `npm run setup` prompts for
 * platform, default agent, localization (Location) and VCS.
 *
 * The CLI installer (`packages/cli/install.mjs`) locates the framework via
 * `findFrameworkDir()` — it resolves the already-checked-out, dependency-installed
 * REPO_ROOT as a *local* framework, so no network download or `npm install` is
 * needed here (the same code path npx would use once it has fetched the repo).
 * This mirrors how `install-cli.test.mjs` / `install-agents.test.mjs` run.
 *
 * NOTE: the installer uses Node readline. Feeding a fixed buffer then closing
 * stdin makes readline see EOF mid-prompt and abort. The robust approach (and
 * what `yes 1 | node cli` does) is to keep stdin open with a continuous feeder,
 * which we simulate by piping `yes 1` into the installer's stdin.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CLI = join(REPO_ROOT, 'packages', 'cli', 'install.mjs');
const EXPORT = join(REPO_ROOT, 'tools', 'export.mjs');

const PLATFORMS = ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'];
const MIN_AGENTS = 140;

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) passed++;
  else {
    console.error('FAIL  ' + name);
    failed++;
  }
}

// Temp dirs tracked for cleanup.
const artifacts = [];
function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `${prefix}-`));
  artifacts.push(d);
  return d;
}
function cleanup() {
  for (const d of artifacts) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {}
  }
}
// Pipe `yes 1` into the child's stdin so readline never sees EOF mid-prompt.
function pipeYes(child) {
  const feeder = spawn('yes', ['1'], { stdio: ['ignore', 'pipe', 'ignore'] });
  // Swallow EPIPE: when the installer exits it closes stdin, and `yes` may
  // still be writing — that's expected, not an error.
  feeder.stdout.on('error', () => {});
  child.stdin.on('error', () => {});
  feeder.stdout.pipe(child.stdin);
  return feeder;
}
/**
 * Run the CLI installer. `feed`=true pipes `yes 1` into stdin (interactive
 * paths); `feed`=false leaves stdin open but idle (non-interactive flags).
 */
function runCli(cwd, args = [], feed = true) {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI, ...args], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const feeder = feed ? pipeYes(child) : null;
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      if (feeder) feeder.kill();
      resolve({ status: code, stdout, stderr });
    });
  });
}
function runExport(platform, outDir) {
  return spawnSync('node', [EXPORT, '--platform', platform, '--out', outDir], {
    encoding: 'utf-8',
    timeout: 120000,
  });
}
function agentCount(dir) {
  try {
    return readdirSync(join(dir, 'agents')).filter((f) => f.endsWith('.md')).length;
  } catch {
    return -1;
  }
}
function verifyProjectOutputs(dir, label) {
  assert(existsSync(join(dir, 'opencode.json')), `${label}: opencode.json in project`);
  assert(existsSync(join(dir, 'agents')), `${label}: agents/ in project`);
  const n = agentCount(dir);
  assert(n >= MIN_AGENTS, `${label}: agents/ has ${n} files (>= ${MIN_AGENTS})`);
  assert(existsSync(join(dir, '.staffforge-vcs.json')), `${label}: .staffforge-vcs.json`);
  assert(existsSync(join(dir, '.git')), `${label}: git repo initialized`);
  const vcs = JSON.parse(readFileSync(join(dir, '.staffforge-vcs.json'), 'utf-8'));
  assert(vcs.provider === 'git', `${label}: vcs provider=git`);
  assert(vcs.workflow === 'git-flow', `${label}: vcs workflow=git-flow`);
}

async function main() {
  // ── Type 1: npx interactive install (platform → agent → location → VCS → workflow) ──
  {
    console.log('\n[Type 1] npx interactive install');
    const project = tmp('proj-interactive');
    const r = await runCli(project, [], true);

    assert(r.status === 0, `interactive install exits 0 (got ${r.status})`);
    // Verify the installer actually asks for each item the user enumerated
    assert(r.stdout.includes('Platform:'), 'prompt: Platform');
    assert(r.stdout.includes('Default agent:'), 'prompt: Default agent');
    assert(r.stdout.includes('Location:'), 'prompt: Location (localization)');
    assert(r.stdout.includes('Version Control System:'), 'prompt: VCS');
    assert(r.stdout.includes('Workflow:'), 'prompt: Workflow');

    verifyProjectOutputs(project, 'interactive');
    assert(existsSync(join(project, '.staffforge-install.json')), 'interactive: .staffforge-install.json saved');
    const cfg = JSON.parse(readFileSync(join(project, '.staffforge-install.json'), 'utf-8'));
    assert(cfg.platform === 'opencode', 'interactive: saved platform=opencode');
    assert(cfg.defaultAgent === 'orchestrator', 'interactive: saved agent=orchestrator');
    // project-local location → ./staffforge temp dir is cleaned up
    assert(!existsSync(join(project, 'staffforge')), 'interactive: ./staffforge cleaned up');
  }

  // ── Type 2: npx non-interactive with flags ──
  {
    console.log('\n[Type 2] npx non-interactive flags (--platform opencode --agent orchestrator)');
    const project = tmp('proj-flags');
    const r = await runCli(project, ['--yes', '--platform', 'opencode', '--agent', 'orchestrator'], false);
    assert(r.status === 0, `flags install exits 0 (got ${r.status})`);
    verifyProjectOutputs(project, 'flags');
    const opencode = JSON.parse(readFileSync(join(project, 'opencode.json'), 'utf-8'));
    const names = Object.keys(opencode.agent || {});
    assert(names.length >= MIN_AGENTS, `flags: opencode.json has ${names.length} agents`);
    assert(opencode.agent.Orchestrator, 'flags: opencode.json has Orchestrator');
  }

  // ── Type 3: npx re-run / "update to latest" — detects previous config ──
  {
    console.log('\n[Type 3] npx re-run (detect previous settings)');
    const project = tmp('proj-reinstall');
    const first = await runCli(project, ['--yes', '--platform', 'opencode', '--agent', 'orchestrator'], false);
    assert(first.status === 0, 'first run exits 0');
    assert(existsSync(join(project, '.staffforge-install.json')), 'first run wrote config');

    // Re-run with no args/flags → should detect previous and offer reinstall
    const second = await runCli(project, [], true);
    assert(second.status === 0, `re-run exits 0 (got ${second.status})`);
    assert(second.stdout.includes('Previous:'), 're-run detects previous config');
    assert(second.stdout.includes('Reinstall?'), 're-run shows reinstall prompt');
    // Outputs still present after reinstall
    assert(existsSync(join(project, 'opencode.json')), 're-run: opencode.json present');
    assert(agentCount(project) >= MIN_AGENTS, 're-run: agents/ preserved');
  }

  // ── Type 4: Clone repo + npm install + `npm run setup` (interactive) ──
  // The framework is already checked out & deps installed at REPO_ROOT, so we
  // run `npm run setup` (= node install.mjs) from REPO_ROOT — the same command
  // a user runs after `cd`-ing into the cloned repo. A freshly cloned repo has
  // no prior config, so we temporarily move any existing .staffforge-install.json
  // aside to force the full prompt flow (platform/agent/location/VCS/workflow),
  // then restore it afterwards.
  {
    console.log('\n[Type 4] clone + npm install + npm run setup (interactive)');
    const configFiles = ['.staffforge-install.json', '.staffforge-vcs.json'];
    const saved = {};
    for (const f of configFiles) {
      const p = join(REPO_ROOT, f);
      if (existsSync(p)) {
        saved[f] = readFileSync(p, 'utf-8');
        rmSync(p, { force: true });
      }
    }
    const r = await new Promise((resolve) => {
      const child = spawn('npm', ['run', 'setup'], { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
      const feeder = pipeYes(child);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('close', (code) => {
        feeder.kill();
        resolve({ status: code, stdout, stderr });
      });
    });
    assert(r.status === 0, `npm run setup exits 0 (got ${r.status})`);
    assert(r.stdout.includes('Platform:'), 'setup prompt: Platform');
    assert(r.stdout.includes('Default agent:'), 'setup prompt: Default agent');
    assert(r.stdout.includes('Location:'), 'setup prompt: Location');
    assert(r.stdout.includes('Version Control System:'), 'setup prompt: VCS');
    assert(existsSync(join(REPO_ROOT, 'opencode.json')), 'clone setup: opencode.json in project');
    assert(agentCount(REPO_ROOT) >= MIN_AGENTS, 'clone setup: agents/ downloaded into project');
    assert(existsSync(join(REPO_ROOT, '.staffforge-vcs.json')), 'clone setup: .staffforge-vcs.json');
    // Clean generated config / restore pre-existing config so the tree stays tidy
    for (const f of configFiles) {
      try {
        rmSync(join(REPO_ROOT, f), { force: true });
      } catch {}
      if (saved[f] !== undefined) {
        writeFileSync(join(REPO_ROOT, f), saved[f]);
      }
    }
    try {
      rmSync(join(REPO_ROOT, 'opencode.json'), { force: true });
    } catch {}
  }

  // ── Type 5: Export to other platforms (npm run export:<platform>) ──
  // README uses short script names: export:opencode, export:claude,
  // export:cursor, export:copilot, export:aider, export:gemini.
  {
    console.log('\n[Type 5] export to other platforms (npm run export:<platform>)');
    const EXPORT_SCRIPTS = {
      opencode: 'export:opencode',
      'claude-code': 'export:claude',
      cursor: 'export:cursor',
      copilot: 'export:copilot',
      aider: 'export:aider',
      'gemini-cli': 'export:gemini',
    };
    for (const p of PLATFORMS) {
      const r = spawnSync('npm', ['run', EXPORT_SCRIPTS[p]], {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        timeout: 120000,
      });
      assert(r.status === 0, `${p}: npm run ${EXPORT_SCRIPTS[p]} exits 0 (got ${r.status})`);
      const outDir = join(REPO_ROOT, 'adapters', p, 'output');
      assert(existsSync(outDir), `${p}: adapters/${p}/output generated`);
      switch (p) {
        case 'opencode':
          assert(existsSync(join(outDir, 'opencode.json')), `${p}: opencode.json`);
          break;
        case 'claude-code':
          assert(existsSync(join(outDir, 'CLAUDE.md')), `${p}: CLAUDE.md`);
          assert(existsSync(join(outDir, '.claude', 'agents')), `${p}: .claude/agents/`);
          break;
        case 'cursor':
          assert(existsSync(join(outDir, '.cursor', 'rules')), `${p}: .cursor/rules/`);
          break;
        case 'copilot':
          assert(existsSync(join(outDir, '.github', 'copilot-instructions.md')), `${p}: copilot-instructions.md`);
          break;
        case 'aider':
          assert(existsSync(join(outDir, '.aider.rules.md')), `${p}: .aider.rules.md`);
          break;
        case 'gemini-cli':
          assert(existsSync(join(outDir, '.gemini')), `${p}: .gemini/`);
          break;
      }
      // Clean up generated output so the repo stays clean
      try {
        rmSync(outDir, { recursive: true, force: true });
      } catch {}
    }
  }

  // ── Type 6: Interactive installer with --platform all ──
  // With --platform all, every platform's output is written into the single
  // staffforge/ directory (opencode.json, CLAUDE.md, .cursor/, .github/,
  // .aider.rules.md, .gemini/) rather than per-platform subdirs.
  {
    console.log('\n[Type 6] installer --platform all');
    const project = tmp('proj-all');
    const outDir = tmp('proj-all-out'); // outside CWD so cleanup doesn't delete it
    const r = await runCli(project, ['--yes', '--platform', 'all', '--agent', 'orchestrator', '--out', outDir], false);
    assert(r.status === 0, `all platforms exits 0 (got ${r.status})`);
    assert(r.stdout.includes('All platforms'), 'all platforms summary printed');
    const out = outDir;
    assert(existsSync(out), 'all: output dir present');
    assert(existsSync(join(out, 'opencode.json')), 'all: opencode.json');
    assert(existsSync(join(out, 'CLAUDE.md')), 'all: CLAUDE.md (claude-code)');
    assert(existsSync(join(out, '.cursor', 'rules')), 'all: .cursor/rules/ (cursor)');
    assert(existsSync(join(out, '.github', 'copilot-instructions.md')), 'all: copilot-instructions.md (copilot)');
    assert(existsSync(join(out, '.aider.rules.md')), 'all: .aider.rules.md (aider)');
    assert(existsSync(join(out, '.gemini')), 'all: .gemini/ (gemini-cli)');
    assert(agentCount(project) >= MIN_AGENTS, 'all: agents/ copied to project');
    assert(existsSync(join(project, '.staffforge-vcs.json')), 'all: .staffforge-vcs.json');
    // --platform all skips saving the single-platform config
    assert(!existsSync(join(project, '.staffforge-install.json')), 'all: no .staffforge-install.json');
  }

  // ── Cleanup ──
  cleanup();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
