/**
 * E2E test: installation as an **unauthenticated GitHub user**.
 *
 * Mirrors exactly what `npx github:StaffForge/StaffForge-AI-Agent-Framework`
 * does for a user who is NOT logged in to GitHub:
 *   1. The CLI's `download()` clones the PUBLIC repo over HTTPS with no token.
 *   2. Dependencies are installed.
 *   3. The installer runs interactively and downloads the agents into the
 *      user's project folder, prompting for platform / default agent /
 *      localization (Location) / VCS.
 *
 * To PROVE the flow needs no credentials, the clone runs with any GitHub token
 * stripped from the environment and `GIT_TERMINAL_PROMPT=0` (fail fast rather
 * than prompt for a password). A public repo must clone anonymously.
 *
 * If the environment has no network access to GitHub, the test SKIPs (exits 0)
 * instead of failing, so offline CI is not broken.
 */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const GH_REPO = 'https://github.com/StaffForge/StaffForge-AI-Agent-Framework.git';
const GH_BRANCH = 'develop';

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

// Environment with GitHub credentials removed — proves anonymous access.
function anonEnv() {
  const e = { ...process.env };
  for (const k of ['GITHUB_TOKEN', 'GH_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GIT_ASKPASS']) delete e[k];
  e.GIT_TERMINAL_PROMPT = '0';
  return e;
}

function pipeYes(child) {
  const feeder = spawn('yes', ['1'], { stdio: ['ignore', 'pipe', 'ignore'] });
  feeder.stdout.on('error', () => {});
  child.stdin.on('error', () => {});
  feeder.stdout.pipe(child.stdin);
  return feeder;
}
function runCli(frameworkDir, projectDir, args = [], feed = true) {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      [join(frameworkDir, 'packages', 'cli', 'install.mjs'), ...args],
      { cwd: projectDir, stdio: ['pipe', 'pipe', 'pipe'] },
    );
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
function agentCount(dir) {
  try {
    return readdirSync(join(dir, 'agents')).filter((f) => f.endsWith('.md')).length;
  } catch {
    return -1;
  }
}

async function main() {
  const project = tmp('e2e-proj');

  // ── Step 1: anonymous clone (the unauthenticated GitHub download) ──
  console.log('\n[E2E] anonymous git clone of public repo');
  const cache = tmp('e2e-cache');
  let cloneStatus = 0;
  let cloneErr = '';
  try {
    execSync(`git clone --depth 1 --branch ${GH_BRANCH} "${GH_REPO}" "${cache}"`, {
      stdio: 'pipe',
      timeout: 180000,
      env: anonEnv(),
    });
  } catch (e) {
    cloneStatus = e.status || 1;
    cloneErr = (e.stderr || '').toString() + (e.stdout || '').toString();
  }

  // Network/credentials unavailable → skip rather than fail.
  const networkIssue = /could not resolve|timed out|connection|name or service|network is unreachable/i.test(
    cloneErr,
  );
  const authIssue = /authentication failed|403|401|permission denied|remote: Not Found/i.test(cloneErr);
  if (cloneStatus !== 0) {
    if (networkIssue) {
      console.log(`SKIP: cannot reach GitHub in this environment (${cloneErr.split('\n')[0]})`);
      console.log('0 passed, 0 failed');
      process.exit(0);
    }
    // Public repo should be cloneable anonymously — a 403/auth error is a real failure.
    assert(false, `anonymous clone of public repo (status ${cloneStatus})`);
    if (authIssue) console.error('  → repo required authentication; public repos must allow anonymous clone');
    cleanup();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
  assert(true, 'anonymous clone of public repo succeeded (no token required)');
  assert(existsSync(join(cache, 'tools', 'export.mjs')), 'cloned repo has framework tooling');
  assert(existsSync(join(cache, 'agents')), 'cloned repo has agents/');

  // ── Step 2: install dependencies in the cloned framework ──
  console.log('\n[E2E] npm install in cloned framework');
  try {
    execSync('npm install --loglevel=warn --install-strategy=hoisted', {
      cwd: cache,
      stdio: 'pipe',
      timeout: 300000,
      env: anonEnv(),
    });
    assert(true, 'npm install in cloned framework succeeded');
  } catch (e) {
    assert(false, `npm install in cloned framework (${e.status || 'err'})`);
    cleanup();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // ── Step 3: run the installer into the project (interactive) ──
  console.log('\n[E2E] install agents into project (interactive)');
  const r = await runCli(cache, project, [], true);
  assert(r.status === 0, `installer exits 0 (got ${r.status})`);
  assert(r.stdout.includes('Platform:'), 'prompt: Platform');
  assert(r.stdout.includes('Default agent'), 'prompt: Default agent');
  assert(r.stdout.includes('Location:'), 'prompt: Location (localization)');
  assert(r.stdout.includes('Version Control System:'), 'prompt: VCS');

  // ── Step 4: verify agents landed in the project folder ──
  assert(existsSync(join(project, 'opencode.json')), 'project: opencode.json downloaded');
  assert(existsSync(join(project, 'agents')), 'project: agents/ downloaded');
  const n = agentCount(project);
  assert(n >= MIN_AGENTS, `project: agents/ has ${n} files (>= ${MIN_AGENTS})`);
  assert(existsSync(join(project, '.staffforge-vcs.json')), 'project: .staffforge-vcs.json created');
  assert(existsSync(join(project, '.git')), 'project: git repo initialized');
  const vcs = JSON.parse(readFileSync(join(project, '.staffforge-vcs.json'), 'utf-8'));
  assert(vcs.provider === 'git', 'project: vcs provider=git');
  assert(vcs.workflow === 'git-flow', 'project: vcs workflow=git-flow');
  assert(!existsSync(join(project, 'staffforge')), 'project: ./staffforge temp dir cleaned up');

  cleanup();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
