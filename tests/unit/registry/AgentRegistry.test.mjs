import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { AgentRegistry } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

function tmpAgentDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-registry-test-'));
  const agents = {
    'architect.md': `---
id: architect
name: Architect
mode: primary
category: core
description: Protects architecture.
tools:
  write: true
  bash: false
  edit: true
keywords: [architecture, design, pattern]
capabilities: [design, review]
---
Body text
`,
    'python.md': `---
id: python
name: Python
mode: subagent
category: technology
description: Python Staff Engineer.
tools:
  write: false
  bash: true
  edit: false
keywords: [python, flask, django]
capabilities: [coding, backend]
---
Body text
`,
    'testing.md': `---
id: testing
name: Testing
mode: subagent
category: core
description: Testing strategy specialist.
tools:
  write: false
  bash: false
  edit: false
---
Body text
`,
  };
  for (const [f, content] of Object.entries(agents)) {
    fs.writeFileSync(path.join(dir, f), content, 'utf-8');
  }
  return dir;
}

// Test 1: constructor and load
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  reg.load();
  assert(reg.count() === 3, 'load count');
  fs.rmSync(dir, { recursive: true });
}

// Test 2: all() returns agents
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const agents = reg.all();
  assert(agents.length === 3, 'all length');
  assert(agents[0].id === 'architect', 'all first id');
  fs.rmSync(dir, { recursive: true });
}

// Test 3: findById
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const agent = reg.findById('python');
  assert(agent !== null, 'findById found');
  assert(agent.name === 'Python', 'findById name');
  assert(reg.findById('nonexistent') === null, 'findById not found');
  fs.rmSync(dir, { recursive: true });
}

// Test 4: findByName
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const agent = reg.findByName('Architect');
  assert(agent !== null, 'findByName found');
  assert(agent.id === 'architect', 'findByName id');
  fs.rmSync(dir, { recursive: true });
}

// Test 5: findByMode
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const subagents = reg.findByMode('subagent');
  assert(subagents.length === 2, 'findByMode subagent');
  const primaries = reg.findByMode('primary');
  assert(primaries.length === 1, 'findByMode primary');
  fs.rmSync(dir, { recursive: true });
}

// Test 6: findByCategory
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const core = reg.findByCategory('core');
  assert(core.length === 2, 'findByCategory core');
  const tech = reg.findByCategory('technology');
  assert(tech.length === 1, 'findByCategory technology');
  fs.rmSync(dir, { recursive: true });
}

// Test 7: search by id
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const results = reg.search('python');
  assert(results.length >= 1, 'search python');
  fs.rmSync(dir, { recursive: true });
}

// Test 8: search by keyword
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const results = reg.search('flask');
  assert(results.length >= 1, 'search keyword');
  fs.rmSync(dir, { recursive: true });
}

// Test 9: search by capability
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const results = reg.search('review');
  assert(results.length >= 1, 'search capability');
  fs.rmSync(dir, { recursive: true });
}

// Test 10: getCategories
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const cats = reg.getCategories();
  assert(cats.includes('core'), 'getCategories core');
  assert(cats.includes('technology'), 'getCategories technology');
  fs.rmSync(dir, { recursive: true });
}

// Test 11: getModes
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const modes = reg.getModes();
  assert(modes.includes('primary'), 'getModes primary');
  assert(modes.includes('subagent'), 'getModes subagent');
  fs.rmSync(dir, { recursive: true });
}

// Test 12: resolveDependencies
{
  const dir = tmpAgentDir();
  // Add agent with depends_on
  const a2 = `---
id: backend
name: Backend
mode: subagent
category: domain
description: Backend specialist.
tools:
  write: false
  bash: false
  edit: false
depends_on: [architect]
---
`;
  fs.writeFileSync(path.join(dir, 'backend.md'), a2, 'utf-8');
  const reg = new AgentRegistry(dir);
  const order = reg.resolveDependencies(['backend']);
  assert(order[0] === 'architect', 'resolveDeps order first');
  assert(order[1] === 'backend', 'resolveDeps order second');
  fs.rmSync(dir, { recursive: true });
}

// Test 13: toJSON
{
  const dir = tmpAgentDir();
  const reg = new AgentRegistry(dir);
  const json = reg.toJSON();
  assert(json.length === 3, 'toJSON length');
  assert(json[0].id === 'architect', 'toJSON id');
  assert(json[0].body === 'Body text', 'toJSON body');
  fs.rmSync(dir, { recursive: true });
}

// Test 14: lazy loading (no load before all)
{
  const reg = new AgentRegistry('/nonexistent');
  assert(reg._agents === null, 'lazy load null before all');
}

// Test 15: singleton getAgentRegistry
{
  const { getAgentRegistry } = await import('@staffforge/core');
  const reg1 = getAgentRegistry();
  const reg2 = getAgentRegistry();
  assert(reg1 === reg2, 'singleton same instance');
}

// Test 16: extends merges parent body
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-registry-test-'));
  fs.writeFileSync(path.join(dir, 'base.md'), `---
id: base
name: Base
mode: subagent
category: core
description: Base agent.
tools:
  write: false
  bash: false
  edit: false
---
## Shared
- rule 1
- rule 2
`, 'utf-8');
  fs.writeFileSync(path.join(dir, 'child.md'), `---
id: child
name: Child
mode: subagent
category: technology
description: Child agent.
tools:
  write: false
  bash: false
  edit: false
keywords: [test]
extends: base
---
# Child

## Mission
Child agent.
`, 'utf-8');
  const reg = new AgentRegistry(dir);
  const child = reg.findById('child');
  assert(child.body.includes('## Shared'), 'extends inherits parent body');
  assert(child.body.includes('## Mission'), 'extends keeps child body');
  assert(child.body.startsWith('# Child'), 'extends child body comes first');
  assert(!child.frontmatter.extends, 'extends field removed from frontmatter');
  fs.rmSync(dir, { recursive: true });
}

// Test 17: extends with missing parent loads own body
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-registry-test-'));
  fs.writeFileSync(path.join(dir, 'orphan.md'), `---
id: orphan
name: Orphan
mode: subagent
category: technology
description: Orphan agent.
tools:
  write: false
  bash: false
  edit: false
extends: nonexistent
---
# Orphan
`, 'utf-8');
  const reg = new AgentRegistry(dir);
  const orphan = reg.findById('orphan');
  assert(orphan !== null, 'extends missing parent still loads');
  assert(orphan.body === '# Orphan', 'extends missing parent keeps own body');
  fs.rmSync(dir, { recursive: true });
}

// Test 18: multi-level extends (child → parent → grandparent)
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-registry-test-'));
  fs.writeFileSync(path.join(dir, 'grandpa.md'), `---
id: grandpa
name: Grandpa
mode: subagent
category: core
description: Grandparent agent.
tools:
  write: false
  bash: false
  edit: false
---
## Shared
- base rule
`, 'utf-8');
  fs.writeFileSync(path.join(dir, 'parent.md'), `---
id: parent
name: Parent
mode: subagent
category: core
description: Parent agent.
tools:
  write: false
  bash: false
  edit: false
extends: grandpa
---
## Parent Rules
- parent specific
`, 'utf-8');
  fs.writeFileSync(path.join(dir, 'child.md'), `---
id: child
name: Child
mode: subagent
category: technology
description: Child agent.
tools:
  write: false
  bash: false
  edit: false
extends: parent
---
# Child
`, 'utf-8');
  const reg = new AgentRegistry(dir);
  const child = reg.findById('child');
  assert(child.body.includes('# Child'), 'multi-level child body');
  assert(child.body.includes('## Parent Rules'), 'multi-level parent body');
  assert(child.body.includes('## Shared'), 'multi-level grandparent body');
  assert(child.body.startsWith('# Child'), 'multi-level child comes first');
  assert(!child.frontmatter.extends, 'multi-level extends removed');
  const parent = reg.findById('parent');
  assert(!parent.frontmatter.extends, 'multi-level intermediate extends removed');
  fs.rmSync(dir, { recursive: true });
}

// Test 19: circular extends detected
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-registry-test-'));
  fs.writeFileSync(path.join(dir, 'a.md'), `---
id: a
name: A
mode: subagent
category: core
description: Agent A.
tools:
  write: false
  bash: false
  edit: false
extends: b
---
# A
`, 'utf-8');
  fs.writeFileSync(path.join(dir, 'b.md'), `---
id: b
name: B
mode: subagent
category: core
description: Agent B.
tools:
  write: false
  bash: false
  edit: false
extends: a
---
# B
`, 'utf-8');
  const reg = new AgentRegistry(dir);
  const a = reg.findById('a');
  const b = reg.findById('b');
  assert(a.body === '# A', 'circular a keeps own body');
  assert(b.body === '# B', 'circular b keeps own body');
  assert(!a.frontmatter.extends, 'circular a extends removed');
  assert(!b.frontmatter.extends, 'circular b extends removed');
  fs.rmSync(dir, { recursive: true });
}
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-registry-test-'));
  fs.writeFileSync(path.join(dir, 'orphan.md'), `---
id: orphan
name: Orphan
mode: subagent
category: technology
description: Orphan agent.
tools:
  write: false
  bash: false
  edit: false
extends: nonexistent
---
# Orphan
`, 'utf-8');
  const reg = new AgentRegistry(dir);
  const orphan = reg.findById('orphan');
  assert(orphan !== null, 'extends missing parent still loads');
  assert(orphan.body === '# Orphan', 'extends missing parent keeps own body');
  fs.rmSync(dir, { recursive: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
