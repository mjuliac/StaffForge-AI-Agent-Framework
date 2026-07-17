#!/usr/bin/env node

/**
 * StaffForge AI Agent Framework — AGENTS configuration generator (the "system")
 *
 * Implements the AGENTS Configuration Framework specification:
 *   §2.1  File Management Strategy (Scenario A: AGENTS.md / Scenario B: AGENTS_ANEX.md)
 *   §3    Interactive Configuration Questionnaire (5 modules)
 *   §4.1  AGENTS.md template
 *   §5.1  AGENTS_ANEX.md template
 *   §6.1  Initialization Sequence
 *   §6.2  Validation Rules
 *
 * Zero external dependencies. Usable both as a standalone CLI
 * (`node tools/init-agents-config.mjs [--yes] [--out <dir>]`) and as an
 * imported function from packages/cli/install.mjs.
 *
 * Options:
 *   --out <dir>   Target project directory (default: CWD)
 *   --yes, -y     Non-interactive: use framework defaults for all 5 modules
 *   --help, -h    Show help
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { env, argv, exit, cwd } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CWD = cwd();
const ROOT = resolve(__dirname, '..');
const TEMPLATE_CONFIG = join(ROOT, 'templates', 'agents-config.md');
const TEMPLATE_ANEX = join(ROOT, 'templates', 'agents-anex.md');

// ── Help ──
function help() {
  console.log(`StaffForge — AGENTS configuration generator

USAGE
  node tools/init-agents-config.mjs [--out <dir>] [--yes] [--help]

OPTIONS
  --out <dir>   Project directory to configure (default: current directory)
  --yes, -y     Skip interactive prompts, use framework defaults
  --help, -h    Show this help

BEHAVIOR (spec §2.1)
  If AGENTS.md does not exist      → create AGENTS.md (Scenario A)
  If AGENTS.md already exists       → create AGENTS_ANEX.md (Scenario B)
`);
}

// ── Args ──
function parseArgs() {
  const a = argv.slice(2);
  const o = { out: cwd() };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--help' || a[i] === '-h') {
      help();
      exit(0);
    } else if (a[i] === '--out') {
      o.out = a[++i];
    } else if (a[i] === '--yes' || a[i] === '-y') {
      o.yes = true;
    }
  }
  return o;
}

// ── Readline (injectable) ──
// IMPORTANT: do NOT create a second readline over process.stdin when called from
// another CLI that already opened one (e.g. install.mjs). Passing `rl`/`ask` from
// the caller prevents duplicate-echo of typed characters (two readers on same TTY).
// When run standalone, we create our own (and close it on exit).
let _rl = null;
let _ownRl = false;
let ask = null;
let askLines = null;

function bindReadline(injected) {
  if (injected && injected.rl && injected.ask) {
    _rl = injected.rl;
    ask = injected.ask;
  } else {
    _rl = createInterface({ input: process.stdin, output: process.stdout });
    _ownRl = true;
    ask = (q, def = '') =>
      new Promise((r) => {
        const p = def ? `${q} [${def}]: ` : `${q}: `;
        _rl.question(p, (a) => r(a.trim() || def));
      });
  }
  askLines = async (intro, def = '') => {
    console.log(intro);
    const ans = await ask('  > (free text, one line; leave empty for default)', def);
    return ans;
  };
}
function closeReadlineIfOwn() {
  if (_ownRl && _rl) {
    _rl.close();
    _ownRl = false;
  }
}

// ── Timestamp ──
function nowStamp() {
  // spec §6.2 requires timestamp + version; ISO-ish, human readable
  return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

// ── Default answers (framework self-description, used by --yes) ──
const DEFAULTS = {
  projectName: 'StaffForge AI Agent Framework',
  stack: `## Technology Stack
- **Languages**: JavaScript (Node.js 20+, ESM), YAML (agent/skill config)
- **Web Framework**: None as app framework — CLI/tooling (Node.js scripts, platform adapters)
- **Database(s)**: None (file-based YAML/JSON configuration)
- **Architecture Pattern**: Modular monorepo with platform adapter exporters
- **Testing Framework**: Jest/Vitest (unit), custom test runner (tests/run-all.mjs)
- **DevOps & Deployment**: npm scripts, GitHub Actions (CI), multi-platform export (opencode/claude-code/cursor/copilot/aider/gemini-cli)`,
  conventions: `## Code Conventions & Standards
- **Variable Naming**: camelCase - JavaScript convention
- **Class/Type Naming**: PascalCase - consistent across files
- **File Naming**: kebab-case for files (e.g. init-agent.mjs), snake_case for modules
- **Indentation**: 2 spaces - consistent across all files
- **Max Line Length**: 100 characters - enforced by Prettier
- **Code Formatter**: Prettier (config: .prettierrc) + ESLint (config: .eslintrc.json)
- **Documentation Format**: JSDoc-style block comments with mandatory coverage for public APIs`,
  rules: `## Operational Rules & Constraints

### Forbidden Operations (NEVER)
- Modify AGENTS.md directly: PROJECT_RULES.md is the append-only addendum - base conventions must stay stable
- Run VCS commands outside the orchestrator: only @vcs/@git may manage branches/commits - prevents repo corruption
- Generate code without an initialized VCS branch: every task starts on a dedicated branch - ensures traceability

### Required Approvals
- Architecture changes: require @architect review before implementation
- Production deployment: require release manager + security sign-off

### Performance Requirements
- CLI startup: < 2s cold start for tool scripts
- Validation suite (npm run validate): completes under CI timeout

### Security Constraints
- Never log secrets or tokens: redact in all outputs
- All agent frontmatter permissions explicit: no implicit full-access grants

### Data Handling Rules
- No PII stored in repo: configuration is code-only
- Secrets via env vars: never committed

### Deployment Rules
- Only hotfix/* and release/* touch main: feature/bugfix merge to develop only
- Rollback: tag-based revert via @vcs`,
  workflow: `## Workflow & Process Definition

### Version Control Strategy
- **Branching Model**: Git Flow - feature/bugfix → develop; release/hotfix → main
- **Commit Message Format**: Conventional Commits - "feat:", "fix:", "refactor:", "docs:"
- **Versioning Scheme**: Semantic Versioning (MAJOR.MINOR.PATCH)

### Code Review Process
- **Minimum Reviewers**: 1
- **Approval Requirements**: At least 1 approval from a maintainer
- **Review Timeline**: Within 3 business days
- **Automated Checks**: npm run validate + npm test must pass in CI

### Issue & Task Management
- **Tool**: GitHub Issues
- **Issue Labeling**: feature / bug / refactor / security / docs
- **Task Assignment**: Assignee field on issue

### Release & Deployment Workflow
- **Deployment Frequency**: On-demand per release/*
- **Release Process**: Hybrid (CI build + manual tag)
- **Rollback Procedure**: Manual - git revert tagged commit
- **Canary/Staged Deployment**: No

### Decision Making & Communication
- **Decision Documentation**: ADRs in repo (docs/adr/)
- **Architecture Review**: Required for any cross-agent contract change
- **Communication Channels**: GitHub Discussions

### Team Synchronization
- **Standup Cadence**: Not mandated (OSS)
- **Team Review Meetings**: Weekly maintainer sync`,
  docs: `## Documentation Requirements

### Documentation Scope & Coverage
- **Architecture**: Required - ARCHITECTURE.md in repo
- **API Specifications**: Required for published packages - JSDoc
- **Deployment Guides**: Required - README.md + per-platform export docs
- **Operational Runbooks**: Optional
- **Module READMEs**: Required sections for packages/ (name, usage, API)

### Documentation Tools & Format
- **Primary Format**: Markdown in repo
- **Location**: Repository (docs/ + root .md files)
- **Version Control**: In-repo
- **Tool Stack**: Markdown + JSDoc (tools), OpenAPI where applicable

### Documentation Standards
- **Code Comments**: Mandatory for public APIs
- **Change Logs**: Required - CHANGELOG.md (Keep a Changelog format)
- **Deprecation Notice**: 1 minor release notice before removal
- **Migration Guides**: Required for breaking changes

### Documentation Review
- **Included in Code Review**: Yes
- **Separate Review Process**: No
- **Approval Required**: Yes (maintainer)
- **SLA for Review**: Same as code review`,
};

// ── Module questionnaires (spec §3) ──
// Each returns the populated body for its section.

async function moduleStack(yes) {
  if (yes) return DEFAULTS.stack;
  console.log('\n=== Module 1: Technology Stack ===');
  const languages = await askLines('Primary language(s)? e.g. Python, TypeScript, Go', 'JavaScript (Node.js)');
  const framework = await askLines('Web/app framework? e.g. FastAPI, React, None', 'None (CLI/tooling)');
  const db = await askLines('Database(s)/data stores? e.g. PostgreSQL, Redis, None', 'None (file-based)');
  const arch = await askLines('Architecture pattern? e.g. Microservices, Monolith', 'Modular monorepo');
  const testing = await askLines('Testing framework? e.g. pytest, Jest, Vitest', 'Jest/Vitest');
  const devops = await askLines('DevOps/deployment? e.g. Docker, K8s, CI', 'npm + GitHub Actions');
  return `## Technology Stack
- **Languages**: ${languages}
- **Web Framework**: ${framework}
- **Database(s)**: ${db}
- **Architecture Pattern**: ${arch}
- **Testing Framework**: ${testing}
- **DevOps & Deployment**: ${devops}`;
}

async function moduleConventions(yes) {
  if (yes) return DEFAULTS.conventions;
  console.log('\n=== Module 2: Code Conventions & Standards ===');
  const varN = await askLines('Variable/function naming? camelCase|snake_case|PascalCase', 'camelCase');
  const classN = await askLines('Class/type naming? PascalCase|CONSTANT_CASE', 'PascalCase');
  const fileN = await askLines('File naming? kebab-case|snake_case', 'kebab-case');
  const indent = await askLines('Indentation? 2 spaces|4 spaces|tabs', '2 spaces');
  const maxLine = await askLines('Max line length? 80|100|120', '100');
  const fmt = await askLines('Formatter/linter? ESLint, Prettier, Black, Ruff', 'Prettier + ESLint');
  const doc = await askLines('Documentation format? JSDoc|docstrings|comments', 'JSDoc');
  return `## Code Conventions & Standards
- **Variable Naming**: ${varN} - project convention
- **Class/Type Naming**: ${classN} - project convention
- **File Naming**: ${fileN} - consistent file naming
- **Indentation**: ${indent} - consistent across all files
- **Max Line Length**: ${maxLine} characters - enforced by linter
- **Code Formatter**: ${fmt}
- **Documentation Format**: ${doc} with mandatory coverage for public APIs`;
}

async function moduleRules(yes) {
  if (yes) return DEFAULTS.rules;
  console.log('\n=== Module 3: Operational Rules & Constraints ===');
  const forbidden = await askLines(
    'Forbidden operations (NEVER do X)? Separate with " | ". Give 1-3.',
    'Never run VCS outside orchestrator | Never commit secrets',
  );
  const approvals = await askLines('Required approvals? e.g. PR review, security review', 'PR review by maintainer');
  const perf = await askLines('Performance requirements? e.g. response SLA', 'None specified');
  const sec = await askLines('Security constraints? e.g. never log secrets', 'Never log secrets/tokens');
  const data = await askLines('Data handling rules? e.g. retention, privacy', 'No PII in repo');
  const deploy = await askLines('Deployment rules? e.g. prod restrictions, rollback', 'Tagged releases only');
  const forbiddenItems = forbidden
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((r) => `- ${r}: documented project constraint`)
    .join('\n');
  return `## Operational Rules & Constraints

### Forbidden Operations (NEVER)
${forbiddenItems || '- (none specified)'}

### Required Approvals
- ${approvals}: as defined by project process

### Performance Requirements
- ${perf}

### Security Constraints
- ${sec}

### Data Handling Rules
- ${data}

### Deployment Rules
- ${deploy}`;
}

async function moduleWorkflow(yes) {
  if (yes) return DEFAULTS.workflow;
  console.log('\n=== Module 4: Workflow & Process Definition ===');
  const branching = await askLines('Branching model? Git Flow|GitHub Flow|trunk-based', 'Git Flow');
  const commit = await askLines('Commit message format? Conventional Commits|custom', 'Conventional Commits');
  const versioning = await askLines('Versioning scheme? SemVer|CalVer', 'Semantic Versioning');
  const reviewers = await askLines('Minimum reviewers? number', '1');
  const issues = await askLines('Issue/task tool? Jira|GitHub Issues|Linear', 'GitHub Issues');
  const release = await askLines('Release/deploy workflow? automated|manual|hybrid', 'Hybrid');
  const comms = await askLines('Decision comms channel? Slack|GitHub Discussions|ADR', 'GitHub Discussions');
  return `## Workflow & Process Definition

### Version Control Strategy
- **Branching Model**: ${branching} - project branching strategy
- **Commit Message Format**: ${commit} - standardized format
- **Versioning Scheme**: ${versioning}

### Code Review Process
- **Minimum Reviewers**: ${reviewers}
- **Approval Requirements**: At least ${reviewers} approval(s)
- **Review Timeline**: Per project SLA
- **Automated Checks**: CI validation + tests required

### Issue & Task Management
- **Tool**: ${issues}
- **Issue Labeling**: feature / bug / refactor / security / docs
- **Task Assignment**: Assignee on issue

### Release & Deployment Workflow
- **Deployment Frequency**: Per release schedule
- **Release Process**: ${release}
- **Rollback Procedure**: Manual revert of tagged commit
- **Canary/Staged Deployment**: Per project decision

### Decision Making & Communication
- **Decision Documentation**: ADRs / ${comms}
- **Architecture Review**: Required for contract changes
- **Communication Channels**: ${comms}

### Team Synchronization
- **Standup Cadence**: Per team
- **Team Review Meetings**: Per team`;
}

async function moduleDocs(yes) {
  if (yes) return DEFAULTS.docs;
  console.log('\n=== Module 5: Documentation Requirements ===');
  const scope = await askLines('What must be documented? architecture, API, runbooks', 'Architecture + API');
  const fmt = await askLines('Documentation format/tools? Markdown|Confluence|OpenAPI', 'Markdown in repo');
  const review = await askLines('Documentation review? in code review|separate', 'In code review');
  const api = await askLines('API doc standard? OpenAPI|JSDoc|none', 'JSDoc');
  const readme = await askLines('Mandatory README per module? yes|no', 'yes');
  return `## Documentation Requirements

### Documentation Scope & Coverage
- **Architecture**: Required - ${scope}
- **API Specifications**: Required - ${api}
- **Deployment Guides**: Required - README + per-platform docs
- **Operational Runbooks**: Optional
- **Module READMEs**: ${readme === 'no' ? 'Optional' : 'Required sections'}

### Documentation Tools & Format
- **Primary Format**: ${fmt}
- **Location**: Repository
- **Version Control**: In-repo
- **Tool Stack**: Markdown + ${api}

### Documentation Standards
- **Code Comments**: Mandatory for public APIs
- **Change Logs**: Required - CHANGELOG.md
- **Deprecation Notice**: 1 release notice before removal
- **Migration Guides**: Required for breaking changes

### Documentation Review
- **Included in Code Review**: ${review.includes('separate') ? 'No' : 'Yes'}
- **Separate Review Process**: ${review.includes('separate') ? 'Yes' : 'No'}
- **Approval Required**: Yes (maintainer)`;
}

// ── Sanitization & Coherence Layer (spec §2, §3) ──
// Gatekeeper that runs AFTER the 5-module questionnaire and BEFORE rendering.
// Three stages (spec §3 pipeline):
//   1. Structural  — dedupe markdown headers, drop empty list items
//   2. Technical   — Python standards, framework mutex resolution
//   3. Syntax Guard— empty/placeholder cleanup, typo correction
// Returns { data, changes } where changes is a human-readable changelog.

// Keyword sets (spec §2.2)
const PY_FRAMEWORKS = ['fastapi', 'flask', 'django'];
const NODE_FRAMEWORKS = ['express', 'nestjs', 'fastify'];

function lowerList(s) {
  return String(s || '')
    .split(/[,\n|]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

// Stage 1: structural — remove duplicate "## " headers within a single section block
// and strip isolated "- " / ":" bullet lines that would render as empty.
function structuralPass(section) {
  let out = section;
  // Collapse repeated duplicate headers (case-insensitive) keeping the first.
  const seen = new Set();
  out = out
    .split('\n')
    .filter((line) => {
      const m = line.match(/^(#{2,6})\s+(.*\S)\s*$/);
      if (m) {
        const key = m[2].toLowerCase();
        if (seen.has(key)) return false; // drop duplicate header
        seen.add(key);
      }
      return true;
    })
    .join('\n');
  // Remove empty bullet lines ("- " or "-") and trailing isolated colons.
  out = out
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      if (t === '-' || t === '- ' || t === '*' || t === '* ') return false;
      return true;
    })
    .join('\n')
    .replace(/:\s*$/gm, (m) => (m.trim() === ':' ? '' : m)); // drop trailing lone colon
  return out;
}

// Stage 2: technical — Python + framework mutex
function technicalPass(data, changes) {
  const langs = lowerList(data.stack);
  const isPython = langs.some((l) => l.includes('python'));

  // §2.1 Python indentation override
  if (isPython) {
    const indentMatch = data.conventions.match(/\*\*Indentation\*\*:([^\n]*)/);
    if (indentMatch) {
      const cur = indentMatch[1].trim();
      if (!/4\s*spaces/.test(cur)) {
        data.conventions = data.conventions.replace(
          /\*\*Indentation\*\*:[^\n]*/,
          '**Indentation**: 4 spaces - PEP 8 (overridden from "' + cur + '")',
        );
        changes.push(`Indentation set to "4 spaces" (PEP 8) — Python detected, was "${cur}"`);
      }
    }
    // §2.1 Formatter coherence
    const fmtMatch = data.conventions.match(/\*\*Code Formatter\*\*:([^\n]*)/);
    if (fmtMatch) {
      const fmt = fmtMatch[1].toLowerCase();
      if (fmt.includes('prettier') && !fmt.includes('ruff') && !fmt.includes('black')) {
        data.conventions = data.conventions.replace(
          /\*\*Code Formatter\*\*:[^\n]*/,
          '**Code Formatter**: Ruff (with Black-compatible formatting) - Prettier lacks native Python support',
        );
        changes.push('Formatter changed to "Ruff/Black" — Prettier selected without Python plugin (Python detected)');
      }
    }
  }

  // §2.2 Framework mutex — detect competing frameworks in same runtime
  const fwText = (data.stack + ' ' + data.conventions).toLowerCase();
  const pyHits = PY_FRAMEWORKS.filter((f) => fwText.includes(f));
  const nodeHits = NODE_FRAMEWORKS.filter((f) => fwText.includes(f));

  if (pyHits.length > 1) {
    const promoted = 'FastAPI'; // modern async standard (spec §3.1)
    data.stack = data.stack.replace(
      /(Web Framework[^*]*:\s*)([^\n]*)/,
      `$1${promoted} (microservices) - mutex resolved: detected ${pyHits.join(' + ')}`,
    );
    changes.push(
      `Framework mutex resolved: ${pyHits.join(' + ')} → promoted "${promoted}" (spec §2.2). Clarify if they are separate microservices.`,
    );
  }
  if (nodeHits.length > 1) {
    const promoted = 'Express';
    data.stack = data.stack.replace(
      /(Web Framework[^*]*:\s*)([^\n]*)/,
      `$1${promoted} - mutex resolved: detected ${nodeHits.join(' + ')}`,
    );
    changes.push(
      `Framework mutex resolved: ${nodeHits.join(' + ')} → promoted "${promoted}" (spec §2.2). Clarify if they are separate services.`,
    );
  }
  return isPython;
}

// Stage 3: syntax guard — empty/placeholder → N/A, typo correction
function syntaxPass(data, changes) {
  const EMPTY = ['', '-', ':', 'n/a', 'na', '.'];
  // Typo map (spec §4)
  const TYPOS = [
    [/Convetional\s+commits/gi, 'Conventional Commits'],
    [/Conventional\s+commit\b/gi, 'Conventional Commits'],
    [/git\s*flow\b/gi, 'Git Flow'],
  ];

  for (const key of ['stack', 'conventions', 'rules', 'workflow', 'docs']) {
    let txt = data[key];
    // typo correction
    for (const [re, rep] of TYPOS) {
      if (re.test(txt)) {
        txt = txt.replace(re, rep);
        changes.push(`Typo corrected in ${key} → "${rep}"`);
      }
    }
    // Empty sub-bullets / placeholder values
    const lines = txt.split('\n').map((l) => {
      // bullet with empty/placeholder content
      const bm = l.match(/^(\s*[-*]\s+)(.*)$/);
      if (bm && EMPTY.includes(bm[2].trim().toLowerCase())) {
        return l.replace(/[-*]\s+.*$/, `- N/A (Not Applicable yet)`);
      }
      // "**Key**:" with empty value
      const km = l.match(/^(\*\*[^*]+\*\*:\s*)(.*)$/);
      if (km && EMPTY.includes(km[2].trim().toLowerCase())) {
        return l.replace(/:\s*.*$/, ': N/A (Not Applicable yet)');
      }
      return l;
    });
    data[key] = lines.join('\n');
  }
}

// Orchestrator entry
export function sanitize(data) {
  const changes = [];
  // Stage 1 — structural dedupe on every section
  for (const key of ['stack', 'conventions', 'rules', 'workflow', 'docs']) {
    data[key] = structuralPass(data[key]);
  }
  // Stage 2 — technical
  const isPython = technicalPass(data, changes);
  // Stage 3 — syntax guard
  syntaxPass(data, changes);
  return { data, changes, isPython };
}

// ── Render ──
// Each data section carries its own "## Header" (from the questionnaire modules).
// The template ALSO declares that header, so we strip the leading "## X" from each
// section block to avoid duplicate headers in the final document (spec §3 stage 1).
export function stripLeadingHeader(section) {
  return section.replace(/^\s*##\s+.*\n/, '');
}

function renderConfig(tpl, data) {
  return tpl
    .replace(/\{project_name\}/g, data.projectName)
    .replace(/\{version\}/g, data.version)
    .replace(/\{created\}/g, data.created)
    .replace(/\{stack\}/g, stripLeadingHeader(data.stack))
    .replace(/\{conventions\}/g, stripLeadingHeader(data.conventions))
    .replace(/\{rules\}/g, stripLeadingHeader(data.rules))
    .replace(/\{workflow\}/g, stripLeadingHeader(data.workflow))
    .replace(/\{docs\}/g, stripLeadingHeader(data.docs));
}

function renderAnex(tpl, data) {
  return tpl
    .replace(/\{project_name\}/g, data.projectName)
    .replace(/\{version\}/g, data.version)
    .replace(/\{created\}/g, data.created)
    .replace(/\{base_version\}/g, data.baseVersion)
    .replace(/\{ext_scope\}/g, data.extScope)
    .replace(/\{stack\}/g, stripLeadingHeader(data.stack))
    .replace(/\{conventions\}/g, stripLeadingHeader(data.conventions))
    .replace(/\{rules\}/g, stripLeadingHeader(data.rules))
    .replace(/\{workflow\}/g, stripLeadingHeader(data.workflow))
    .replace(/\{docs\}/g, stripLeadingHeader(data.docs));
}

// ── Validation (spec §6.2 + §5 checklist) ─
function validateConfig(content, which, data = {}) {
  const errors = [];
  if (which === 'config') {
    const required = [
      '## Technology Stack',
      '## Code Conventions & Standards',
      '## Operational Rules & Constraints',
      '## Workflow & Process Definition',
      '## Documentation Requirements',
      '## Agent Responsibilities',
    ];
    for (const r of required) if (!content.includes(r)) errors.push(`Missing section: ${r}`);
    if (!/Version\*\*:\s*v?\d+\.\d+/.test(content)) errors.push('Missing version information');
    if (!/Created\*\*:\s*\S+/.test(content)) errors.push('Missing creation timestamp');

    // §5 Structural — no duplicate "## " headers (each must appear once)
    const headers = (content.match(/^##\s+(.+)$/gm) || []).map((h) => h.toLowerCase().trim());
    const uniqueHeaders = new Set(headers);
    if (headers.length !== uniqueHeaders.size) {
      errors.push(`Duplicate "## " headers detected (found ${headers.length}, unique ${uniqueHeaders.size})`);
    }

    // §5 Indent alignment — if Python, indentation must be 4 spaces
    const langs = lowerList(data.stack || '');
    const isPython = langs.some((l) => l.includes('python'));
    if (isPython && !/Indentation\*\*:\s*4 spaces/.test(data.conventions || '')) {
      errors.push('Python detected but indentation is not "4 spaces" (spec §2.1)');
    }

    // §5 Conflict resolution — no competing frameworks in same runtime
    const fwText = ((data.stack || '') + ' ' + (data.conventions || '')).toLowerCase();
    const pyHits = PY_FRAMEWORKS.filter((f) => fwText.includes(f));
    const nodeHits = NODE_FRAMEWORKS.filter((f) => fwText.includes(f));
    if (pyHits.length > 1) errors.push(`Competing Python frameworks unresolved: ${pyHits.join(', ')}`);
    if (nodeHits.length > 1) errors.push(`Competing Node frameworks unresolved: ${nodeHits.join(', ')}`);

    // §5 No placeholders — zero empty "- " or ":" lines
    if (/^\s*[-*]\s*$/m.test(content) || /^\s*:\s*$/m.test(content)) {
      errors.push('Empty bullet/colon placeholder found (spec §2.3)');
    }
  } else {
    if (!/\*\*Extends\*\*:\s*AGENTS\.md \(v/.test(content)) errors.push('Missing reference to base AGENTS.md version');
    if (!/Load Order for Agents/.test(content)) errors.push('Missing load order instructions');
    if (!/Conflict Resolution/.test(content)) errors.push('Missing conflict resolution guidelines');
  }
  return errors;
}

// ── Main generator (importable) ──
export async function generateAgentsConfig({ outDir = cwd(), yes = false, rl = null, ask: askFn = null } = {}) {
  bindReadline(rl && askFn ? { rl, ask: askFn } : null);
  const target = resolve(outDir);
  mkdirSync(target, { recursive: true });

  const agentsMd = join(target, 'AGENTS.md');
  const exists = existsSync(agentsMd);

  // §2.1 Scenario A vs B
  const created = nowStamp();
  const data = {
    projectName: 'Project',
    version: 'v1.0',
    created,
    baseVersion: '1.0',
    extScope: 'Project-specific enhancements to base AGENTS.md',
    stack: '',
    conventions: '',
    rules: '',
    workflow: '',
    docs: '',
  };

  // Gather project name once
  if (!yes) {
    console.log('\n=== AGENTS Configuration Framework ===');
    console.log(
      exists
        ? 'AGENTS.md found → will generate AGENTS_ANEX.md (Scenario B, spec §2.1).'
        : 'No AGENTS.md → will generate AGENTS.md (Scenario A, spec §2.1).',
    );
    data.projectName = await ask('Project name?', 'Project');
  } else {
    data.projectName = DEFAULTS.projectName;
  }

  // §3 — five modules (parallel-free; sequential by design in spec)
  data.stack = await moduleStack(yes);
  data.conventions = await moduleConventions(yes);
  data.rules = await moduleRules(yes);
  data.workflow = await moduleWorkflow(yes);
  data.docs = await moduleDocs(yes);

  // ── Sanitization & Coherence Layer (spec §2, §3) ──
  const { changes } = sanitize(data);
  if (changes.length) {
    console.log('\n→ Sanitization applied (coherence layer):');
    for (const c of changes) console.log('  • ' + c);
  }

  let content;
  let outFile;
  let which;

  if (!exists) {
    const tpl = readFileSync(TEMPLATE_CONFIG, 'utf-8');
    content = renderConfig(tpl, data);
    outFile = agentsMd;
    which = 'config';
  } else {
    const tpl = readFileSync(TEMPLATE_ANEX, 'utf-8');
    // Best-effort base version detection
    const base = readFileSync(agentsMd, 'utf-8');
    const m = base.match(/\*\*Version\*\*:\s*v?(\d+\.\d+)/);
    data.baseVersion = m ? m[1] : '1.0';
    content = renderAnex(tpl, data);
    outFile = join(target, 'AGENTS_ANEX.md');
    which = 'anex';
  }

  // §6.2 validation + §5 checklist
  const errors = validateConfig(content, which, data);
  if (errors.length) {
    console.error('\n✖ Validation failed:');
    for (const e of errors) console.error('  - ' + e);
    throw new Error('AGENTS config validation failed');
  }

  writeFileSync(outFile, content, 'utf-8');
  // Print a portable path — never leak absolute host paths.
  // Prefer relative-to-CWD; if outside CWD, fall back to the file basename.
  const rel = outFile === CWD ? '.' : relative(CWD, outFile);
  const portable = rel && !rel.startsWith('..') ? rel.replace(/^\//, '') : basename(outFile);
  console.log(`\n✓ ${which === 'config' ? 'AGENTS.md' : 'AGENTS_ANEX.md'} generated at ${portable}`);
  return outFile;
}

// ── CLI entry ──
async function main() {
  const o = parseArgs();
  bindReadline(null); // standalone → create own readline
  try {
    await generateAgentsConfig({ outDir: o.out, yes: o.yes });
    closeReadlineIfOwn();
  } catch (e) {
    closeReadlineIfOwn();
    console.error('\n✖ Generation failed:', e.message);
    exit(1);
  }
}

// Run only when invoked directly
if (env.STAFFFORGE_DIRECT !== 'import' && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
