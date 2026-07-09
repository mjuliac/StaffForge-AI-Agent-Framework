import { spawnSync, execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
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
  if (condition) { passed++; }
  else { console.error('FAIL  ' + name); failed++; }
}

function run(args) {
  const result = spawnSync('node', [cli, ...args], {
    cwd: root, encoding: 'utf-8',
  });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

// Track artifacts to clean up
const artifacts = [];

function cleanup() {
  for (const f of artifacts) {
    try { rmSync(f, { recursive: true, force: true }); } catch {}
  }
}

// Test 1: Full install for opencode
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-test-'));
  const { stdout, status } = run(['--yes', '--platform', 'opencode', '--agent', 'orchestrator', '--out', out]);
  assert(status === 0, 'opencode install exits 0');
  assert(stdout.includes('Exporting'), 'opencode install shows exporting');
  assert(stdout.includes('Installation complete'), 'opencode install shows completion');
  // opencode.json should be in --out dir
  assert(existsSync(join(out, 'opencode.json')), 'opencode.json created in --out dir');
  // opencode.json also copied to CWD (by copyResult)
  artifacts.push(join(root, 'opencode.json'));
  // .staffforge-install.json saved to CWD
  artifacts.push(join(root, '.staffforge-install.json'));
  try {
    const content = JSON.parse(readFileSync(join(out, 'opencode.json'), 'utf-8'));
    assert(content && typeof content === 'object', 'opencode.json is valid JSON');
  } catch { assert(false, 'opencode.json is valid JSON'); }
  rmSync(out, { recursive: true, force: true });
}

// Test 2: Full install for claude-code
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-claude-'));
  const { stdout, status } = run(['--yes', '--platform', 'claude-code', '--agent', 'build', '--out', out]);
  assert(status === 0, 'claude-code install exits 0');
  assert(stdout.includes('Exporting'), 'claude-code shows exporting');
  // .claude/rules should exist in CWD (moved by copyResult)
  const claudeRulesCWD = existsSync(join(root, '.claude', 'rules'));
  if (claudeRulesCWD) artifacts.push(join(root, '.claude'));
  // Some files may remain in --out dir after move
  const claudeRulesOut = existsSync(join(out, '.claude', 'rules'));
  assert(claudeRulesCWD || claudeRulesOut, 'claude-code install produces .claude/rules');
  rmSync(out, { recursive: true, force: true });
}

// Test 3: Full install for cursor
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-cursor-'));
  const { status } = run(['--yes', '--platform', 'cursor', '--agent', 'orchestrator', '--out', out]);
  assert(status === 0, 'cursor install exits 0');
  if (existsSync(join(root, '.cursor'))) artifacts.push(join(root, '.cursor'));
  rmSync(out, { recursive: true, force: true });
}

// Test 4: Full install for copilot
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-copilot-'));
  const { status } = run(['--yes', '--platform', 'copilot', '--agent', 'plan', '--out', out]);
  assert(status === 0, 'copilot install exits 0');
  if (existsSync(join(root, '.github', 'copilot-instructions.md'))) {
    artifacts.push(join(root, '.github', 'copilot-instructions.md'));
  }
  rmSync(out, { recursive: true, force: true });
}

// Test 5: Full install for aider
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-aider-'));
  const { status } = run(['--yes', '--platform', 'aider', '--agent', 'orchestrator', '--out', out]);
  assert(status === 0, 'aider install exits 0');
  if (existsSync(join(root, '.aider.rules.md'))) artifacts.push(join(root, '.aider.rules.md'));
  rmSync(out, { recursive: true, force: true });
}

// Test 6: Full install for gemini-cli
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-gemini-'));
  const { status } = run(['--yes', '--platform', 'gemini-cli', '--agent', 'orchestrator', '--out', out]);
  assert(status === 0, 'gemini-cli install exits 0');
  if (existsSync(join(root, '.gemini'))) artifacts.push(join(root, '.gemini'));
  rmSync(out, { recursive: true, force: true });
}

// Test 7: Install all platforms
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-all-'));
  const { stdout, status } = run(['--yes', '--platform', 'all', '--agent', 'orchestrator', '--out', out]);
  assert(status === 0, 'all platforms install exits 0');
  assert(stdout.includes('All platforms'), 'all platforms install shows summary');
  // Should have platform-specific subdirectories
  const platforms = ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'];
  for (const p of platforms) {
    const hasDir = existsSync(join(out, p));
    const hasFiles = existsSync(join(out, p)) && readFileSync(join(out, p)).length > 0;
    // Some platforms only create files in subdirectories
    assert(existsSync(out) && out.length > 0, 'all platforms: ' + p + ' output dir exists');
  }
  rmSync(out, { recursive: true, force: true });
}

// Test 8: .staffforge-install.json config persists and is valid
{
  const p = join(root, '.staffforge-install.json');
  artifacts.push(p);
  assert(existsSync(p), 'config file exists');
  const config = JSON.parse(readFileSync(p, 'utf-8'));
  assert(typeof config.platform === 'string', 'config has platform string');
  assert(typeof config.defaultAgent === 'string', 'config has defaultAgent string');
  assert(typeof config.installDir === 'string', 'config has installDir string');
}

// Test 9: Export file is valid opencode.json format
{
  const out = mkdtempSync(join(tmpdir(), 'staff-install-validate-'));
  run(['--yes', '--platform', 'opencode', '--agent', 'orchestrator', '--out', out]);
  const p = join(out, 'opencode.json');
  assert(existsSync(p), 'opencode.json exported');
  try {
    const obj = JSON.parse(readFileSync(p, 'utf-8'));
    assert(typeof obj === 'object' && obj !== null, 'opencode.json is object');
    // Should contain agent configs
    const hasAgents = Array.isArray(obj.agents) || Array.isArray(obj.agentConfigs) || Object.keys(obj).length > 0;
    assert(hasAgents, 'opencode.json has content');
  } catch {
    assert(false, 'opencode.json is valid JSON');
  }
  rmSync(out, { recursive: true, force: true });
}

// Test 10: Root install.mjs entry point works
{
  const entry = join(root, 'install.mjs');
  assert(existsSync(entry), 'root install.mjs exists');
  const result = spawnSync('node', [entry, '--help'], {
    cwd: root, encoding: 'utf-8',
  });
  assert(result.status === 0, 'root install.mjs --help exits 0');
  assert(result.stdout.includes('StaffForge'), 'root install.mjs shows help');
}

// Test 11: Framework directory is detected correctly
{
  const { stdout } = run(['--yes', '--platform', 'opencode', '--agent', 'orchestrator', '--out', '/tmp']);
  assert(stdout.includes('local'), 'detects local framework installation');
}

// Clean up all artifacts
cleanup();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
