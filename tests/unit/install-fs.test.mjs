import { writeFileSync, readFileSync, copyFileSync, cpSync, mkdirSync, rmSync, existsSync, renameSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error('FAIL  ' + name); failed++; }
}

function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'install-fs-test-'));
  return d;
}

// ── findFrameworkDir logic ──
function findFrameworkDir(candidates) {
  for (const dir of candidates) {
    if (existsSync(join(dir, 'tools', 'export.mjs'))) return dir;
  }
  return null;
}

// Test 1: findFrameworkDir returns dir when tools/export.mjs exists
{
  const d = tmp();
  mkdirSync(join(d, 'tools'), { recursive: true });
  writeFileSync(join(d, 'tools', 'export.mjs'), '// test');
  const result = findFrameworkDir([d]);
  assert(result === d, 'findFrameworkDir finds dir with tools/export.mjs');
  rmSync(d, { recursive: true, force: true });
}

// Test 2: findFrameworkDir returns null when tools/export.mjs is missing
{
  const d = tmp();
  mkdirSync(join(d, 'tools'), { recursive: true });
  // create a different file instead of export.mjs
  writeFileSync(join(d, 'tools', 'other.mjs'), '// test');
  const result = findFrameworkDir([d]);
  assert(result === null, 'findFrameworkDir returns null when export.mjs missing');
  rmSync(d, { recursive: true, force: true });
}

// Test 3: findFrameworkDir returns null when dir doesn't exist
{
  const result = findFrameworkDir(['/nonexistent/path']);
  assert(result === null, 'findFrameworkDir returns null for nonexistent path');
}

// Test 4: findFrameworkDir checks multiple candidates in order
{
  const d1 = tmp();
  const d2 = tmp();
  mkdirSync(join(d2, 'tools'), { recursive: true });
  writeFileSync(join(d2, 'tools', 'export.mjs'), '// test');
  const result = findFrameworkDir([d1, d2]);
  assert(result === d2, 'findFrameworkDir finds second candidate');
  rmSync(d1, { recursive: true, force: true });
  rmSync(d2, { recursive: true, force: true });
}

// Test 5: findFrameworkDir returns first match
{
  const d1 = tmp();
  const d2 = tmp();
  mkdirSync(join(d1, 'tools'), { recursive: true });
  writeFileSync(join(d1, 'tools', 'export.mjs'), '// test');
  mkdirSync(join(d2, 'tools'), { recursive: true });
  writeFileSync(join(d2, 'tools', 'export.mjs'), '// test');
  const result = findFrameworkDir([d1, d2]);
  assert(result === d1, 'findFrameworkDir returns first match');
  rmSync(d1, { recursive: true, force: true });
  rmSync(d2, { recursive: true, force: true });
}

// ── copyResult logic (replicated from install.mjs) ──
function copyResult(platform, src, dest) {
  const cp = (f, d) => { copyFileSync(f, d); };
  const mv = (f, d) => {
    rmSync(d, { recursive: true, force: true });
    mkdirSync(dirname(d), { recursive: true });
    try {
      renameSync(f, d);
    } catch (err) {
      if (err.code === 'EXDEV') {
        cpSync(f, d, { recursive: true });
        rmSync(f, { recursive: true, force: true });
      } else {
        throw err;
      }
    }
  };
  switch (platform) {
    case 'opencode':
      cp(join(src, 'opencode.json'), join(dest, 'opencode.json'));
      break;
    case 'claude-code':
      if (existsSync(join(src, 'CLAUDE.md'))) cp(join(src, 'CLAUDE.md'), join(dest, 'CLAUDE.md'));
      if (existsSync(join(src, '.claude/agents'))) mv(join(src, '.claude/agents'), join(dest, '.claude/agents'));
      break;
    case 'cursor':
      if (existsSync(join(src, '.cursor/rules'))) mv(join(src, '.cursor/rules'), join(dest, '.cursor/rules'));
      break;
    case 'copilot':
      mkdirSync(join(dest, '.github'), { recursive: true });
      if (existsSync(join(src, '.github/copilot-instructions.md')))
        cp(join(src, '.github/copilot-instructions.md'), join(dest, '.github/copilot-instructions.md'));
      if (existsSync(join(src, '.github/agents')))
        cpSync(join(src, '.github/agents'), join(dest, '.github/agents'), { recursive: true });
      break;
    case 'aider':
      if (existsSync(join(src, '.aider.rules.md'))) cp(join(src, '.aider.rules.md'), join(dest, '.aider.rules.md'));
      break;
    case 'gemini-cli':
      if (existsSync(join(src, '.gemini'))) mv(join(src, '.gemini'), join(dest, '.gemini'));
      break;
  }
}

// Helper for copyResult tests
function setupPlatformSrc(platform) {
  const src = tmp();
  const dest = tmp();
  switch (platform) {
    case 'opencode':
      writeFileSync(join(src, 'opencode.json'), JSON.stringify({ version: '2.0' }));
      break;
    case 'claude-code':
      writeFileSync(join(src, 'CLAUDE.md'), '# Claude');
      mkdirSync(join(src, '.claude', 'agents'), { recursive: true });
      writeFileSync(join(src, '.claude', 'agents', 'core.md'), '# core');
      break;
    case 'cursor':
      mkdirSync(join(src, '.cursor', 'rules'), { recursive: true });
      writeFileSync(join(src, '.cursor', 'rules', 'core.md'), '# core');
      break;
    case 'copilot':
      mkdirSync(join(src, '.github', 'agents'), { recursive: true });
      writeFileSync(join(src, '.github', 'copilot-instructions.md'), '# instructions');
      writeFileSync(join(src, '.github', 'agents', 'a11y.agent.md'), '---\nname: A11y\ndescription: A11y expert\n---\n# Accessibility');
      break;
    case 'aider':
      writeFileSync(join(src, '.aider.rules.md'), '# rules');
      break;
    case 'gemini-cli':
      mkdirSync(join(src, '.gemini'), { recursive: true });
      writeFileSync(join(src, '.gemini', 'prompt'), 'prompt');
      break;
  }
  return { src, dest };
}

function cleanupPlatform({ src, dest }) {
  rmSync(src, { recursive: true, force: true });
  rmSync(dest, { recursive: true, force: true });
}

// Test 6: copyResult opencode copies opencode.json
{
  const { src, dest } = setupPlatformSrc('opencode');
  copyResult('opencode', src, dest);
  assert(existsSync(join(dest, 'opencode.json')), 'opencode: file exists');
  const content = JSON.parse(readFileSync(join(dest, 'opencode.json'), 'utf-8'));
  assert(content.version === '2.0', 'opencode: content preserved');
  cleanupPlatform({ src, dest });
}

// Test 7: copyResult claude-code copies CLAUDE.md and moves .claude/agents
{
  const { src, dest } = setupPlatformSrc('claude-code');
  copyResult('claude-code', src, dest);
  assert(existsSync(join(dest, 'CLAUDE.md')), 'claude-code: CLAUDE.md exists');
  assert(existsSync(join(dest, '.claude', 'agents', 'core.md')), 'claude-code: agents exist');
  assert(!existsSync(join(src, '.claude', 'agents')), 'claude-code: agents moved from src');
  cleanupPlatform({ src, dest });
}

// Test 8: copyResult cursor moves .cursor/rules
{
  const { src, dest } = setupPlatformSrc('cursor');
  copyResult('cursor', src, dest);
  assert(existsSync(join(dest, '.cursor', 'rules', 'core.md')), 'cursor: rules exist');
  assert(!existsSync(join(src, '.cursor', 'rules')), 'cursor: rules moved from src');
  cleanupPlatform({ src, dest });
}

// Test 9: copyResult copilot copies .github/copilot-instructions.md + .github/agents/
{
  const { src, dest } = setupPlatformSrc('copilot');
  copyResult('copilot', src, dest);
  assert(existsSync(join(dest, '.github', 'copilot-instructions.md')), 'copilot: copilot-instructions.md exists');
  assert(existsSync(join(dest, '.github', 'agents', 'a11y.agent.md')), 'copilot: agents/a11y.agent.md exists');
  cleanupPlatform({ src, dest });
}

// Test 10: copyResult aider copies .aider.rules.md
{
  const { src, dest } = setupPlatformSrc('aider');
  copyResult('aider', src, dest);
  assert(existsSync(join(dest, '.aider.rules.md')), 'aider: file exists');
  cleanupPlatform({ src, dest });
}

// Test 11: copyResult gemini-cli moves .gemini/
{
  const { src, dest } = setupPlatformSrc('gemini-cli');
  copyResult('gemini-cli', src, dest);
  assert(existsSync(join(dest, '.gemini', 'prompt')), 'gemini-cli: dir exists');
  assert(!existsSync(join(src, '.gemini')), 'gemini-cli: dir moved from src');
  cleanupPlatform({ src, dest });
}

// Test 12: copyResult opencode preserves existing dest opencode.json
{
  const { src, dest } = setupPlatformSrc('opencode');
  writeFileSync(join(dest, 'opencode.json'), JSON.stringify({ old: true }));
  copyResult('opencode', src, dest);
  const content = JSON.parse(readFileSync(join(dest, 'opencode.json'), 'utf-8'));
  assert(content.version === '2.0', 'opencode: overwrites existing file');
  cleanupPlatform({ src, dest });
}

// Test 13: copyResult with missing source files (no crash for guarded platforms)
{
  const src = tmp();
  const dest = tmp();
  copyResult('claude-code', src, dest);
  assert(!existsSync(join(dest, 'CLAUDE.md')), 'missing CLAUDE.md: no error');
  copyResult('cursor', src, dest);
  assert(!existsSync(join(dest, '.cursor', 'rules')), 'missing .cursor/rules: no error');
  copyResult('copilot', src, dest);
  assert(!existsSync(join(dest, '.github', 'copilot-instructions.md')), 'missing copilot-instructions: no error');
  copyResult('aider', src, dest);
  assert(!existsSync(join(dest, '.aider.rules.md')), 'missing .aider.rules.md: no error');
  copyResult('gemini-cli', src, dest);
  assert(!existsSync(join(dest, '.gemini')), 'missing .gemini: no error');
  rmSync(src, { recursive: true, force: true });
  rmSync(dest, { recursive: true, force: true });
}

// ── savePrev / loadPrev logic ──
// Replicated from install.mjs
function savePrev(config, path) {
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

function loadPrev(path) {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : null;
  } catch {
    return null;
  }
}

// Test 14: savePrev writes JSON file
{
  const d = tmp();
  const p = join(d, '.test-config.json');
  savePrev({ platform: 'opencode', defaultAgent: 'orchestrator', installDir: '/tmp' }, p);
  assert(existsSync(p), 'savePrev: file created');
  const content = readFileSync(p, 'utf-8');
  assert(content.includes('opencode'), 'savePrev: platform in content');
  rmSync(d, { recursive: true, force: true });
}

// Test 15: loadPrev reads back saved config
{
  const d = tmp();
  const p = join(d, '.test-config.json');
  const config = { platform: 'claude-code', defaultAgent: 'build', installDir: '/home/test' };
  savePrev(config, p);
  const loaded = loadPrev(p);
  assert(loaded !== null, 'loadPrev: returns parsed object');
  assert(loaded.platform === 'claude-code', 'loadPrev: platform matches');
  assert(loaded.defaultAgent === 'build', 'loadPrev: agent matches');
  assert(loaded.installDir === '/home/test', 'loadPrev: dir matches');
  rmSync(d, { recursive: true, force: true });
}

// Test 16: loadPrev returns null when file doesn't exist
{
  const loaded = loadPrev('/nonexistent/config.json');
  assert(loaded === null, 'loadPrev: null for missing file');
}

// Test 17: loadPrev returns null on corrupted JSON
{
  const d = tmp();
  const p = join(d, 'corrupt.json');
  writeFileSync(p, '{invalid json');
  const loaded = loadPrev(p);
  assert(loaded === null, 'loadPrev: null for corrupt JSON');
  rmSync(d, { recursive: true, force: true });
}

// Test 18: savePrev uses pretty JSON with newline
{
  const d = tmp();
  const p = join(d, 'pretty.json');
  savePrev({ a: 1 }, p);
  const content = readFileSync(p, 'utf-8');
  assert(content.endsWith('\n'), 'savePrev: trailing newline');
  assert(content.includes('\n  '), 'savePrev: pretty-printed');
  rmSync(d, { recursive: true, force: true });
}

// ── isTracked logic (git check) ──
function isTracked(cwd, f) {
  try {
    execSync('git ls-files --error-unmatch "' + f + '"', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Test 19: isTracked returns true for tracked file
{
  const result = isTracked(root, 'package.json');
  assert(result === true, 'isTracked: package.json is tracked in repo');
}

// Test 20: isTracked returns false for untracked file
{
  const d = tmp();
  writeFileSync(join(d, 'untracked.txt'), 'test');
  const result = isTracked(d, 'untracked.txt');
  assert(result === false, 'isTracked: non-repo file returns false');
  rmSync(d, { recursive: true, force: true });
}

// Test 21: isTracked returns false for nonexistent file
{
  const result = isTracked(root, '/nonexistent-file-12345.xyz');
  assert(result === false, 'isTracked: nonexistent file returns false');
}

// Test 22: findFrameworkDir with multiple candidates including real root
{
  const result = findFrameworkDir(['/tmp', root]);
  assert(result === root, 'findFrameworkDir finds real framework root');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
