import { AdapterRegistry } from '../../tools/lib/adapter-registry.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const reg = new AdapterRegistry();
const sampleAgent = {
  id: 'test-agent',
  name: 'Test Agent',
  file: 'test-agent.md',
  frontmatter: {
    description: 'Test agent for export validation.',
    mode: 'subagent',
    tools: { write: false, bash: false, edit: false },
    keywords: ['test', 'validate'],
    capabilities: ['testing'],
  },
  body: 'This is a test agent body.',
};

// Test: export to opencode
{
  const result = await reg.export([sampleAgent], 'opencode');
  assert(result.platform === 'opencode', 'export opencode platform');
}

// Test: export to claude-code
{
  const result = await reg.export([sampleAgent], 'claude-code');
  assert(result.platform === 'claude-code', 'export claude-code platform');
}

// Test: export to cursor
{
  const result = await reg.export([sampleAgent], 'cursor');
  assert(result.platform === 'cursor', 'export cursor platform');
}

// Test: export to copilot
{
  const result = await reg.export([sampleAgent], 'copilot');
  assert(result.platform === 'copilot', 'export copilot platform');
}

// Test: export to aider
{
  const result = await reg.export([sampleAgent], 'aider');
  assert(result.platform === 'aider', 'export aider platform');
}

// Test: export to gemini-cli
{
  const result = await reg.export([sampleAgent], 'gemini-cli');
  assert(result.platform === 'gemini-cli', 'export gemini-cli platform');
}

// Test: exportToAll with sample agent
{
  const results = await reg.exportToAll([sampleAgent]);
  assert(results.length >= 6, 'exportToAll all platforms');
  for (const r of results) {
    assert(r.fileCount >= 1, `${r.platform} exported at least 1 file`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
