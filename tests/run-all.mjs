import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = new URL('.', import.meta.url).pathname;
const filter = process.argv[2] || '';

function findTests(dir) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findTests(full));
      } else if (entry.name.endsWith('.test.mjs')) {
        if (!filter || full.includes(path.sep + filter + path.sep) || full.includes('/' + filter + '/')) {
          results.push(full);
        }
      }
    }
  } catch {
    // directory doesn't exist
  }
  return results.sort();
}

const root = path.resolve(__dirname, '..');
const files = findTests(path.join(root, 'tests'));
let totalPassed = 0;
let totalFailed = 0;
let totalTests = 0;
let exitCode = 0;

console.log(`Test runner: ${files.length} file(s) matched\n`);

for (const file of files) {
  const result = spawnSync('node', [file], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    cwd: root,
  });

  const lines = result.stdout.split('\n').filter(Boolean);
  const lastLine = lines[lines.length - 1] || '';
  const match = lastLine.match(/(\d+) passed, (\d+) failed/);

  if (match) {
    totalPassed += parseInt(match[1]);
    totalFailed += parseInt(match[2]);
    totalTests++;
    const status = match[2] === '0' ? '✅' : '❌';
    const short = path.relative(root, file);
    console.log(`  ${status} ${short} — ${match[1]} passed, ${match[2]} failed`);
    if (match[2] !== '0') exitCode = 1;
  } else {
    const short = path.relative(root, file);
    console.log(`  ❓ ${short} — no test summary`);
    console.log(result.stdout);
    if (result.status !== 0) exitCode = 1;
  }
}

console.log(`\n${totalTests} suite(s), ${totalPassed} passed, ${totalFailed} failed`);
process.exit(exitCode);
