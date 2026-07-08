import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const runner = join(root, 'tools', 'run-pipeline.mjs');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

function run(args) {
  const result = spawnSync('node', [runner, ...args], {
    cwd: root, encoding: 'utf-8',
  });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

// Test 1: --dry-run with feature task
{
  const { stdout, status } = run(['--task', 'feature', '--prompt', 'Add user auth', '--dry-run']);
  assert(status === 0, 'dry-run exits 0');
  assert(stdout.includes('Task:     feature'), 'shows task type');
  assert(stdout.includes('Profile:'), 'shows profile');
  assert(stdout.includes('Model:'), 'shows model');
  assert(stdout.includes('Agents:'), 'shows agent count');
}

// Test 2: --dry-run with security task
{
  const { stdout, status } = run(['--task', 'security', '--prompt', 'Audit tokens', '--dry-run']);
  assert(status === 0, 'security exits 0');
  assert(stdout.includes('security'), 'security task');
}

// Test 3: JSON output
{
  const { stdout, status } = run(['--task', 'bugfix', '--prompt', 'Fix login', '--json']);
  assert(status === 0, 'json exits 0');
  const parsed = JSON.parse(stdout);
  assert(parsed.taskType === 'bugfix', 'json taskType');
  assert(Array.isArray(parsed.agents), 'json agents array');
  assert(Array.isArray(parsed.levels), 'json levels array');
  assert(typeof parsed.modelProfile === 'string', 'json modelProfile');
}

// Test 4: --no-model skips model selection
{
  const { stdout, status } = run(['--task', 'feature', '--prompt', 'test', '--dry-run', '--no-model']);
  assert(status === 0, 'no-model exits 0');
  assert(!stdout.includes('Model:') || stdout.includes('Model:    null'), 'no model shown');
}

// Test 5: --telemetry flag
{
  const { stdout, status } = run(['--task', 'feature', '--prompt', 'test', '--dry-run', '--telemetry']);
  assert(status === 0, 'telemetry exits 0');
  assert(stdout.includes('Telemetry:'), 'telemetry shown');
  assert(stdout.includes('run_'), 'telemetry run id');
}

// Test 6: --help
{
  const { stdout, status } = run(['--help']);
  assert(status === 0, 'help exits 0');
  assert(stdout.includes('run-pipeline.mjs'), 'help text');
}

// Test 7: Missing --task errors
{
  const { stderr, status } = run(['--prompt', 'test']);
  assert(status !== 0, 'missing task exits non-zero');
  assert(stderr.includes('--task is required'), 'error message');
}

// Test 8: All 6 task types
{
  for (const task of ['feature', 'bugfix', 'refactor', 'security', 'deployment', 'hotfix']) {
    const { stdout, status } = run(['--task', task, '--prompt', 'test', '--dry-run']);
    assert(status === 0, `${task} exits 0`);
    assert(stdout.includes(`Task:     ${task}`), `${task} shown`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
