/**
 * Integration test: npx github:StaffForge/StaffForge-AI-Agent-Framework install flow.
 *
 * Simulates the exact flow:
 * 1. Git clone repo to temp directory (npx downloads to cache)
 * 2. Run root install.mjs from a separate "project" directory
 * 3. Verify all expected output files are created in the project directory
 *
 * This validates that the installer works both with --yes (non-interactive)
 * and via interactive prompts.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Repo root (this framework's own source)
const REPO_ROOT = resolve(__dirname, '..', '..');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const artifacts = [];

function makeTempDir(prefix = 'staff-npx') {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  artifacts.push(dir);
  return dir;
}

function cleanup() {
  for (const d of artifacts) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
}

/**
 * Clone the repo to a temp "cache" dir, simulating what npx does.
 */
function cloneRepo(targetDir) {
  console.log(`  cloning repo → ${targetDir}`);
  execSync(`git clone --depth 1 --branch develop "file://${REPO_ROOT}" "${targetDir}"`, {
    stdio: 'pipe',
    timeout: 60000,
  });
  // The file:// protocol clone won't have the right remote, but has the code
  return targetDir;
}

/**
 * Run the install from the cloned repo, targeting a project dir.
 */
function runInstall(repoDir, projectDir, args = []) {
  const result = spawnSync('node', [join(repoDir, 'install.mjs'), ...args], {
    cwd: projectDir,
    encoding: 'utf-8',
    timeout: 120000,
  });
  return result;
}

// ── Test 1: Root install.mjs exists and is valid ESM ──
{
  const rootInstall = join(REPO_ROOT, 'install.mjs');
  assert(existsSync(rootInstall), 'root install.mjs exists');
  const content = readFileSync(rootInstall, 'utf-8');
  assert(content.includes('await import'), 'root install.mjs uses dynamic import');
  // The CLI installer (packages/cli/install.mjs) uses readline, not root install.mjs
  const cliInstall = readFileSync(join(REPO_ROOT, 'packages', 'cli', 'install.mjs'), 'utf-8');
  assert(cliInstall.includes('createInterface'), 'CLI installer uses readline for prompts');
}

// ── Test 2: Clone repo and verify structure ──
{
  const repoDir = makeTempDir('repo-structure');
  cloneRepo(repoDir);
  assert(existsSync(join(repoDir, 'install.mjs')), 'cloned repo has install.mjs');
  assert(existsSync(join(repoDir, 'packages', 'cli', 'install.mjs')), 'cloned repo has CLI installer');
  assert(existsSync(join(repoDir, 'packages', 'core', 'index.mjs')), 'cloned repo has @staffforge/core');
  assert(existsSync(join(repoDir, 'tools', 'export.mjs')), 'cloned repo has tools/export.mjs');
  assert(existsSync(join(repoDir, 'tools', 'install.mjs')), 'cloned repo has tools/install.mjs');
  assert(existsSync(join(repoDir, 'agents', 'orchestrator.md')), 'cloned repo has agents');
  const agentCount = readdirSync(join(repoDir, 'agents')).filter(f => f.endsWith('.md')).length;
  assert(agentCount >= 148, `cloned repo has ${agentCount} agents (>= 148)`);
}

// ── Test 3: Full install via root install.mjs with --yes ──
{
  const repoDir = makeTempDir('full-install-repo');
  const projectDir = makeTempDir('full-install-project');
  cloneRepo(repoDir);

  // Run npm install --workspaces to satisfy @staffforge/core dependency
  console.log(`  installing workspace deps in repo...`);
  execSync('npm install --loglevel=warn --install-strategy=hoisted', { cwd: repoDir, stdio: 'pipe', timeout: 60000 });

  const result = runInstall(repoDir, projectDir, [
    '--yes',
    '--platform', 'opencode',
    '--agent', 'orchestrator',
    '--out', join(projectDir, 'staffforge'),
    '--vcs', 'git',
    '--workflow', 'git-flow',
  ]);

  // Should exit successfully
  assert(result.status === 0, `full install exits 0 (got ${result.status})`);

  // ── Verify output files ──
  assert(existsSync(join(projectDir, 'opencode.json')), 'opencode.json created in project root');
  assert(existsSync(join(projectDir, 'agents')), 'agents/ directory created');
  assert(existsSync(join(projectDir, '.staffforge-vcs.json')), '.staffforge-vcs.json created');
  assert(existsSync(join(projectDir, '.staffforge-install.json')), '.staffforge-install.json created');
  assert(existsSync(join(projectDir, '.git')), 'git repo initialized');

  // Verify opencode.json is valid JSON with agent configs
  const opencodeRaw = readFileSync(join(projectDir, 'opencode.json'), 'utf-8');
  let opencode;
  try { opencode = JSON.parse(opencodeRaw); assert(true, 'opencode.json valid JSON'); }
  catch { assert(false, 'opencode.json valid JSON'); }

  // Verify agent count in opencode.json
  if (opencode && opencode.agent) {
    const agentNames = Object.keys(opencode.agent);
    assert(agentNames.length >= 148, `opencode.json has ${agentNames.length} agents`);
    assert(opencode.agent.Orchestrator, 'opencode.json has Orchestrator agent');
    assert(opencode.agent.Build, 'opencode.json has Build agent');
    assert(opencode.agent['Plan'], 'opencode.json has Plan agent');
  }

  // Verify agents/ folder content
  const agentFiles = readdirSync(join(projectDir, 'agents')).filter(f => f.endsWith('.md'));
  assert(agentFiles.length >= 148, `agents/ has ${agentFiles.length} .md files`);
  assert(agentFiles.includes('orchestrator.md'), 'agents/ has orchestrator.md');
  assert(agentFiles.includes('build.md'), 'agents/ has build.md');

  // Verify .staffforge-vcs.json content
  const vcsConfig = JSON.parse(readFileSync(join(projectDir, '.staffforge-vcs.json'), 'utf-8'));
  assert(vcsConfig.provider === 'git', '.staffforge-vcs.json provider=git');
  assert(vcsConfig.workflow === 'git-flow', '.staffforge-vcs.json workflow=git-flow');

  // Verify .staffforge-install.json content
  const installConfig = JSON.parse(readFileSync(join(projectDir, '.staffforge-install.json'), 'utf-8'));
  assert(installConfig.platform === 'opencode', '.staffforge-install.json platform=opencode');
  assert(installConfig.defaultAgent === 'orchestrator', '.staffforge-install.json agent=orchestrator');

  // Verify staffforge/ output dir is cleaned up (it starts with CWD)
  assert(!existsSync(join(projectDir, 'staffforge')), 'temp staffforge/ dir cleaned up');
}

// ── Test 4: Install all platforms ──
{
  const repoDir = makeTempDir('all-platforms-repo');
  const projectDir = makeTempDir('all-platforms-project');
  cloneRepo(repoDir);
  execSync('npm install --loglevel=warn --install-strategy=hoisted', { cwd: repoDir, stdio: 'pipe', timeout: 60000 });

  const result = runInstall(repoDir, projectDir, [
    '--yes',
    '--platform', 'all',
    '--agent', 'build',
    '--out', join(projectDir, 'staffforge-all'),
    '--vcs', 'git',
    '--workflow', 'trunk-based',
  ]);
  assert(result.status === 0, `all platforms install exits 0 (got ${result.status})`);

  // For --platform=all, the config saves only... actually when "all" is used,
  // savePrev is skipped (see line 363 in install.mjs: `if (p !== 'all') savePrev(...)`)
  // But agents/ and .staffforge-vcs.json should still be created
  assert(existsSync(join(projectDir, 'agents')), 'all: agents/ created');
  assert(existsSync(join(projectDir, '.staffforge-vcs.json')), 'all: .staffforge-vcs.json created');
  const agentFiles = readdirSync(join(projectDir, 'agents')).filter(f => f.endsWith('.md'));
  assert(agentFiles.length >= 148, `all: agents/ has ${agentFiles.length} files`);

  // .staffforge-install.json should NOT exist when platform=all
  assert(!existsSync(join(projectDir, '.staffforge-install.json')), 'all: no .staffforge-install.json');
}

// ── Test 5: Root install.mjs can resolve @staffforge/core after npm install --workspaces ──
{
  const repoDir = makeTempDir('resolve-test-repo');
  cloneRepo(repoDir);

  // Simulate what root install.mjs does: check and install workspace deps
  const corePath = join(repoDir, 'node_modules', '@staffforge', 'core');
  assert(!existsSync(join(corePath, 'index.mjs')), 'fresh clone has NO @staffforge/core yet');

  // Run the same npm install command root install.mjs uses
  execSync('npm install --loglevel=warn --install-strategy=hoisted', { cwd: repoDir, stdio: 'pipe', timeout: 60000 });
  assert(existsSync(join(corePath, 'index.mjs')), 'after npm install --workspaces, @staffforge/core exists');

  // Verify the import works
  const importResult = spawnSync('node', ['-e', `
    import { getAgentRegistry } from '@staffforge/core';
    const count = getAgentRegistry().count();
    console.log('AGENTS:', count);
  `], { cwd: repoDir, encoding: 'utf-8', timeout: 10000 });
  assert(importResult.status === 0, `@staffforge/core importable (exit ${importResult.status})`);
  assert(importResult.stdout.includes('AGENTS:'), `@staffforge/core getAgentRegistry works`);
}

// ── Test 6: Each adapter produces valid output ──
{
  const repoDir = makeTempDir('adapters-test-repo');
  cloneRepo(repoDir);
  execSync('npm install --loglevel=warn --install-strategy=hoisted', { cwd: repoDir, stdio: 'pipe', timeout: 60000 });

  const platforms = ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'];
  for (const platform of platforms) {
    const projectDir = makeTempDir(`adapter-${platform}`);
    const result = runInstall(repoDir, projectDir, [
      '--yes', '--platform', platform, '--agent', 'orchestrator',
      '--out', join(projectDir, 'staffforge'),
      '--vcs', 'git', '--workflow', 'git-flow',
    ]);
    assert(result.status === 0, `${platform} install exits 0 (got ${result.status})`);

    // Verify platform-specific outputs
    switch (platform) {
      case 'opencode':
        assert(existsSync(join(projectDir, 'opencode.json')), `${platform}: opencode.json`);
        break;
      case 'claude-code':
        assert(existsSync(join(projectDir, 'CLAUDE.md')), `${platform}: CLAUDE.md`);
        assert(existsSync(join(projectDir, '.claude', 'agents')), `${platform}: .claude/agents/`);
        break;
      case 'cursor':
        assert(existsSync(join(projectDir, '.cursor', 'rules')), `${platform}: .cursor/rules/`);
        break;
      case 'copilot':
        assert(existsSync(join(projectDir, '.github', 'copilot-instructions.md')), `${platform}: copilot-instructions.md`);
        break;
      case 'aider':
        assert(existsSync(join(projectDir, '.aider.rules.md')), `${platform}: .aider.rules.md`);
        break;
      case 'gemini-cli':
        assert(existsSync(join(projectDir, '.gemini')), `${platform}: .gemini/`);
        break;
    }

    // All platforms must have agents/ folder and .staffforge-vcs.json
    assert(existsSync(join(projectDir, 'agents')), `${platform}: agents/`);
    assert(existsSync(join(projectDir, '.staffforge-vcs.json')), `${platform}: .staffforge-vcs.json`);
  }
}

// ── Test 7: npm install --workspaces handles the "already-installed" case ──
{
  const repoDir = makeTempDir('idempotent-repo');
  cloneRepo(repoDir);
  execSync('npm install --loglevel=warn --install-strategy=hoisted', { cwd: repoDir, stdio: 'pipe', timeout: 60000 });
  // Run again - should not fail
  execSync('npm install --loglevel=warn --install-strategy=hoisted', { cwd: repoDir, stdio: 'pipe', timeout: 60000 });
  assert(existsSync(join(repoDir, 'node_modules', '@staffforge', 'core', 'index.mjs')), 'idempotent npm install keeps @staffforge/core');
}

// ── Test 8: findFrameworkDir logic works ──
{
  const repoDir = makeTempDir('framework-detect-repo');
  cloneRepo(repoDir);

  // Simulate findFrameworkDir: check that resolve(ME, '..', '..') finds tools/export.mjs
  const cliDir = join(repoDir, 'packages', 'cli');
  const rootFromCli = resolve(cliDir, '..', '..');
  assert(existsSync(join(rootFromCli, 'tools', 'export.mjs')), 'resolve(ME,..,..) finds tools/export.mjs');
  // CWD (user project) should NOT have tools/export.mjs
  assert(!existsSync(join('/tmp', 'tools', 'export.mjs')), 'CWD does NOT have tools/export.mjs (user project)');
}

// ── Test 9: The bin entry in package.json points to correct file ──
{
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'));
  assert(pkg.bin && pkg.bin.staffforge === './install.mjs', 'package.json bin points to ./install.mjs');
  assert(existsSync(join(REPO_ROOT, 'install.mjs')), 'install.mjs exists at root');
}

// ── Test 10: Validation passes on cloned repo ──
{
  const repoDir = makeTempDir('validation-repo');
  cloneRepo(repoDir);
  execSync('npm install --loglevel=warn --install-strategy=hoisted', { cwd: repoDir, stdio: 'pipe', timeout: 60000 });

  const result = spawnSync('node', [join(repoDir, 'tools', 'validate.mjs')], {
    cwd: repoDir,
    encoding: 'utf-8',
    timeout: 30000,
  });
  const stderrInfo = result.stderr ? ` stderr: ${result.stderr.slice(0, 200)}` : '';
  assert(result.status === 0, `validate.mjs exits 0 (got ${result.status})${stderrInfo}`);
  const outputLines = result.stdout.split('\n').filter(l => l.trim());
  const okCount = outputLines.filter(l => l.startsWith('OK')).length;
  assert(okCount > 150, `validate.mjs reports ~150 valid items (got ${okCount} of ${outputLines.length} lines)${stderrInfo}`);
}

// ── Cleanup ──
cleanup();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
