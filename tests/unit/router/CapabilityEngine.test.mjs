import { getCapabilityEngine } from '../../../tools/lib/capability-engine.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

const engine = getCapabilityEngine();

// Test 1: analyzeIntent extracts keywords
{
  const intent = engine.analyzeIntent('implement user authentication with postgres');
  assert(intent.keywords.includes('authentication'), 'analyzeIntent keyword');
  assert(intent.keywords.includes('postgres'), 'analyzeIntent postgres');
  assert(!intent.keywords.includes('with'), 'analyzeIntent removes stop words');
  assert(!intent.keywords.includes('implement'), 'analyzeIntent filters task verbs');
}

// Test 2: analyzeIntent detects task type
{
  const feat = engine.analyzeIntent('add new login page');
  assert(feat.taskType === 'feature', 'analyzeIntent feature');
  const bug = engine.analyzeIntent('fix login error');
  assert(bug.taskType === 'bugfix', 'analyzeIntent bugfix');
  const ref = engine.analyzeIntent('refactor user service');
  assert(ref.taskType === 'refactor', 'analyzeIntent refactor');
  const sec = engine.analyzeIntent('security vulnerability in auth');
  assert(sec.taskType === 'security', 'analyzeIntent security');
  const dep = engine.analyzeIntent('deploy to production');
  assert(dep.taskType === 'deployment', 'analyzeIntent deployment');
}

// Test 3: analyzeIntent returns null for unknown task
{
  const intent = engine.analyzeIntent('hello world');
  assert(intent.taskType === null, 'analyzeIntent null task');
}

// Test 4: scoreAgent with direct match
{
  const intent = engine.analyzeIntent('python');
  const agent = {
    id: 'python',
    name: 'Python',
    frontmatter: {
      description: 'Python Staff Engineer.',
      keywords: ['python', 'flask', 'django'],
      capabilities: ['coding', 'backend'],
      priority: 80,
    },
  };
  const score = engine.scoreAgent(agent, intent);
  assert(score > 0, 'scoreAgent positive for match');
}

// Test 5: scoreAgent with no match
{
  const intent = engine.analyzeIntent('kubernetes');
  const agent = {
    id: 'python',
    name: 'Python',
    frontmatter: {
      description: 'Python Staff Engineer.',
      keywords: ['python', 'flask'],
      capabilities: ['coding'],
      priority: 50,
    },
  };
  const score = engine.scoreAgent(agent, intent);
  assert(score < 5, 'scoreAgent low for no match');
}

// Test 6: findBestMatch returns top results
{
  const intent = engine.analyzeIntent('python flask web development');
  const results = engine.findBestMatch(intent, { topN: 3, minScore: 0 });
  assert(results.length <= 3, 'findBestMatch topN');
  assert(results[0].score >= results[1].score, 'findBestMatch sorted');
}

// Test 7: findBestMatch filters by mode
{
  const intent = engine.analyzeIntent('python');
  const primaries = engine.findBestMatch(intent, { topN: 5, minScore: 0, mode: 'primary' });
  for (const r of primaries) {
    assert(r.agent.frontmatter.mode === 'primary', 'findBestMatch mode filter');
  }
}

// Test 8: expandCapabilities
{
  const expanded = engine.expandCapabilities('test');
  assert(expanded.includes('testing'), 'expandCapabilities testing');
  assert(expanded.includes('unit-test'), 'expandCapabilities unit-test');
}

// Test 9: expandCapabilities no match
{
  const expanded = engine.expandCapabilities('xyzunknown');
  assert(expanded.length === 0, 'expandCapabilities no match');
}

// Test 10: findAgentsByKeywords
{
  const results = engine.findAgentsByKeywords('deploy docker kubernetes', { topN: 3 });
  assert(results.length > 0, 'findAgentsByKeywords results');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
