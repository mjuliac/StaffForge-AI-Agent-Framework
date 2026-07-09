import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const cli = join(root, 'packages', 'cli', 'install.mjs');
const platforms = ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'];
const agents = ['orchestrator', 'build', 'plan'];

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

// Test 1: --help exits 0 and shows all help elements
{
  const { stdout, status } = run(['--help']);
  assert(status === 0, '--help exits 0');
  assert(stdout.includes('StaffForge'), '--help shows title');
  assert(stdout.includes('--platform'), '--help shows --platform');
  assert(stdout.includes('--agent'), '--help shows --agent');
  assert(stdout.includes('--out'), '--help shows --out');
  assert(stdout.includes('--yes'), '--help shows --yes');
}

// Test 2: -h exits 0 and shows help text
{
  const { stdout, status } = run(['-h']);
  assert(status === 0, '-h exits 0');
  assert(stdout.includes('StaffForge'), '-h shows title');
}

// Test 3: Unknown flag exits 1 with error message
{
  const { stderr, status } = run(['--bogus']);
  assert(status === 1, 'unknown flag exits 1');
  assert(stderr.includes('Unknown'), 'unknown flag prints error');
}

// Test 4: Unknown flag alongside valid flags also errors
{
  const { stderr, status } = run(['--bogus', '--platform', 'opencode']);
  assert(status === 1, 'unknown + valid exits 1');
  assert(stderr.includes('Unknown'), 'unknown + valid prints error');
}

// Test 5: marketplace without subcommand shows search/install usage
{
  const { stdout, status } = run(['marketplace']);
  assert(status === 0, 'marketplace no sub exits 0');
  assert(stdout.includes('search'), 'marketplace usage shows search');
  assert(stdout.includes('install'), 'marketplace usage shows install');
}

// Test 6: marketplace with invalid subcommand shows usage
{
  const { stdout, status } = run(['marketplace', 'invalid-sub']);
  assert(status === 0, 'marketplace invalid sub exits 0');
  assert(stdout.includes('search') || stdout.includes('Usage'), 'invalid sub usage');
}

// Test 7: marketplace install without pipeline-id exits 1
{
  const { stderr, status } = run(['marketplace', 'install']);
  assert(status === 1, 'marketplace install no id exits 1');
  assert(stderr.includes('pipeline-id'), 'marketplace install error mentions pipeline-id');
}

// Test 8: All platforms appear in --help
{
  const { stdout } = run(['--help']);
  for (const p of platforms) {
    assert(stdout.includes(p), 'help lists ' + p);
  }
}

// Test 9: All agents appear in --help
{
  const { stdout } = run(['--help']);
  for (const a of agents) {
    assert(stdout.includes(a), 'help lists ' + a);
  }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
