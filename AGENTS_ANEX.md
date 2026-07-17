# 1 - AGENTS Configuration Annex
**Version**: v2.0  
**Created**: 2026-07-17 11:11:07 UTC  
**Last Modified**: 2026-07-17 12:00:00 UTC  
**Extends**: AGENTS.md (v1.0)  
**Status**: Active

---

## Important Notice

This document extends and enhances the base AGENTS.md configuration for the StaffForge AI Agent Framework. When both files exist:

1. **Base rules** from AGENTS.md remain in effect
2. **New rules** defined in this annex are additive
3. **Override rules** specified herein supersede AGENTS.md for specific sections
4. **Clarifications** provided here refine base interpretations
5. **Load order**: Agents must load AGENTS.md first, then apply AGENTS_ANEX.md modifications
6. **Embedded agents** (in packages) load this annex automatically via `@staffforge/core` bootstrap

---

## Table of Contents
1. [Extension Scope](#extension-scope)
2. [Enhanced Technology Stack](#enhanced-technology-stack)
3. [Additional Code Conventions](#additional-code-conventions)
4. [Supplementary Operational Rules](#supplementary-operational-rules)
5. [Extended Workflow Requirements](#extended-workflow-requirements)
6. [Enhanced Documentation Standards](#enhanced-documentation-standards)
7. [Pipeline & Guardrails Extension](#pipeline--guardrails-extension)
8. [Integration Notes](#integration-notes)

---

## Extension Scope

**Rationale**: StaffForge-specific enhancements that reflect the framework's own architecture, tooling, and operational model beyond the generic agent template in AGENTS.md.

**Specific Areas of Enhancement**:
- **Guardrails System** (three-layer: Input/Runtime/Output) — enforces prompt injection detection, secret leakage prevention, hallucination cross-checking, and schema validation across all agent interactions
- **Capability-Based Routing** — uses `CapabilityEngine` + `TaskMapper` to match technology agents to prompt intent, not hardcoded routing
- **Monorepo Package Architecture** — 6 packages (`@staffforge/cli`, `@staffforge/core`, `@staffforge/sdk`, `@staffforge/plugin-sdk`, `@staffforge/dashboard`, `@staffforge/enterprise`) with internal dependency graph
- **VCS Provider Abstraction** — supports git, svn, hg, tfvc, perforce via `@staffforge/vcs` interface with provider-specific agents
- **Platform Adapter Export System** — write agents once, deploy to 6 platforms (opencode, claude-code, cursor, copilot, aider, gemini-cli)
- **CI/CD Watchdog** — `@ci` agent with zero-tolerance protocol: any CI failure triggers immediate delegation, iterates until green

---

## Enhanced Technology Stack

| Layer | Technology | Version / Config |
|-------|-----------|-----------------|
| **Runtime** | Node.js ESM | `"type": "module"`, engines `>=22` (CI: 22, 24) |
| **Languages** | JavaScript (ES2022) | `.mjs` for CLI/tools, `.mjs` for packages |
| **Agent Format** | YAML frontmatter + Markdown | 150 agents across 5 categories |
| **Validation** | AJV JSON Schema | 4 schemas: agent, model, skill (v0/v1) |
| **Formatting** | Prettier v3 | `semi`, `singleQuote`, `trailingComma: "all"`, `printWidth: 120`, `tabWidth: 2` |
| **Linting** | ESLint v8 | `ecmaVersion: 2022`, `sourceType: "module"`, rules: `no-undef`, `prefer-const`, `no-var`, `no-unused-vars` |
| **Testing** | Custom test runner (`tests/run-all.mjs`) | 848+ tests across unit, integration, e2e |
| **CI** | GitHub Actions | Ubuntu latest, Node 22+24 matrix, `npm audit --audit-level=high` |
| **Publishing** | npm | Tag-driven via `publish.yml` on `v*` tags |
| **VCS** | Git (default) | Configurable via `.staffforge-vcs.json` |
| **Workflow** | Git Flow | Configured in `.staffforge-vcs.json` |
| **Dependencies** | Zero runtime deps | CLI installer is self-contained |

---

## Additional Code Conventions

- **Variable Naming**: camelCase (JS/TS consistent)
- **Class/Type Naming**: PascalCase (classes, schemas, registries)
- **File Naming**: kebab-case (agents, templates) / camelCase (packages) — `.mjs` extension for all ESM modules
- **Indentation**: 2 spaces — enforced by Prettier
- **Max Line Length**: 120 characters (`printWidth: 120`)
- **Code Formatter**: Prettier (run `npm run format:fix`)
- **Linter**: ESLint (run `npm run lint`)
- **Documentation Format**: JSDoc with `@param`, `@returns`, `@throws` for all exported/public APIs
- **Agent Frontmatter**: Always include `description`, `mode`, `tools` (write/bash/edit). Base agents add `input_schema`, `output_schema`, `guardrails`.
- **Skill Frontmatter**: Always include `name`, `description`, `keywords`, `globs`, `compatible_platforms`
- **Import Style**: Named imports with `import { ... } from 'node:*'` for Node built-ins, relative paths for internal modules
- **Error Handling**: Throw `Error` with descriptive messages — no silent failures. Catch at boundaries (CLI main, router, pipeline).
- **Async**: `async/await` preferred. Top-level await used in ESM scripts where appropriate.
- **Logging**: Structured via `@staffforge/core/logger.mjs` with levels: `debug`, `info`, `warn`, `error`

---

## Supplementary Operational Rules

### Forbidden Operations (NEVER)
- Never run VCS commands directly — only `@vcs` (or `@git` for backward compat) executes VCS operations
- Never commit secrets, API keys, tokens, or credentials — `output-dlp.mjs` scans for 14 secret patterns
- Never bypass Guardrails — all agent output passes through `GuardrailManager` three-layer check
- Never hardcode model provider keys — use `models/*.yaml` profiles resolved by `ModelSelector`
- Never write agents without frontmatter — agent definitions are invalid without valid YAML frontmatter
- Never modify `package-lock.json` manually — use `npm install <pkg>` only
- Never force-push to `develop`, `main`, or `release/*` branches
- Never create platform-specific agent files — always edit canonical `agents/*.md` and re-export
- Never skip CI — all merges require passing CI checks (zero-tolerance, enforced by `@ci`)

### Required Approvals
- PRs to `develop`: minimum 1 approval + passing CI
- PRs to `main` (via release/hotfix): minimum 1 approval + all CI checks green
- Architecture review: required for any change to agent schema, routing, or pipeline definitions

### Performance Requirements
- Agent cold-start: <200ms from prompt to first output
- Pipeline execution: feature pipeline under 30s total agent time
- Guardrail checks: <50ms per agent output for full three-layer scan
- Route resolution: <10ms per `resolveTask()` call
- Model selector: <20ms to select optimal model for task

### Security Constraints
- **Input Guardrails**: 18 injection patterns across 5 categories (critical/high/medium) — `input-sanitizer.mjs`
- **Output Guardrails**: 14 secret patterns scanned + redacted — `output-dlp.mjs` (default mode: redact)
- **Hallucination Guardrails**: file path verification + cross-reference between agent outputs — `hallucination-check.mjs`
- **Schema Guardrails**: runtime AJV validation against `output_schema` — `schema-validator.mjs`
- Never log prompt content or agent output at `info` level or above
- Never echo secrets in CI logs (GitHub Actions secrets masked by default)
- `npm audit --audit-level=high` runs as part of CI — all high/critical CVEs must be resolved before merge

### Data Handling Rules
- No PII, credentials, or tokens in repository files (source, config, or documentation)
- `.env` files excluded via `.gitignore` — use environment variables documented in CI secrets
- `.staffforge-*.json` config files may contain VCS provider settings only — no secrets
- Audit trail captured in `GuardrailManager._audit[]` and emitted via EventBus — never persisted to disk by default

### Deployment Rules
- Tagged releases only — `v*` tags trigger `publish.yml` workflow
- All 6 platform exports regenerated on every release via `npm run export`
- CLI package published to npm (`@staffforge/cli`), core package (`@staffforge/core`, `@staffforge/sdk`)
- Release branches (`release/*`) are the only path to `main` (except hotfixes)
- Each release increments version across all 6 packages (managed manually or via release agent)

---

## Extended Workflow Requirements

### Version Control Strategy
- **Branching Model**: Git Flow — `main` (production) → `develop` (integration) → `feature/*`, `bugfix/*`, `release/*`, `hotfix/*`
- **Commit Message Format**: Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`, `security:`
- **Versioning Scheme**: Semantic Versioning (SemVer) — breaking changes bump major, features bump minor, fixes bump patch
- **VCS Config**: `.staffforge-vcs.json` declares provider + workflow — used by `@vcs` to route to provider-specific agent
- **Branch Lifecycle**: All feature/bugfix branches merge to `develop` only. `release/*` merges to `main` + back to `develop`. Hotfixes branch from `main`, merge to `main` + `develop`.

### Code Review Process
- **Minimum Reviewers**: 1 (2 for `release/*` to `main`)
- **Approval Requirements**: At least 1 approval + all CI checks passing (test matrix: Node 22 + 24)
- **Review Timeline**: Within 24 hours for standard PRs, ASAP for hotfixes
- **Automated Checks**: `npm run validate` (schema validation), `npm run lint` (ESLint), `npm run format` (Prettier), `npm test` (848+ tests), `npm audit` (high-severity only)
- **Review Scope**: Agent frontmatter validity, schema compliance, pipeline correctness, Guardrails configuration, test coverage for new agents

### Issue & Task Management
- **Tool**: GitHub Issues with project boards
- **Issue Labeling**: `feature` / `bug` / `refactor` / `security` / `docs` / `ci` / `release` / `hotfix`
- **Task Assignment**: Assignee required on all issues
- **Pipeline Mapping**: Issue labels map directly to task types in `ORCHESTRATOR_MATRIX.md`:
  - `feature` → Feature pipeline (VCS → Planner → ...)
  - `bug` → Bug Fix pipeline
  - `refactor` → Refactor pipeline
  - `security` → Security pipeline
  - `hotfix` → Hotfix pipeline (from `main`)
  - `release` → Deployment pipeline

### Release & Deployment Workflow
- **Deployment Frequency**: On-demand (per feature completion cycle)
- **Release Process**: `release/<version>` branch → validate → export all platforms → tag `v<version>` → publish.yml (CI → validate → test → export → npm publish)
- **Rollback Procedure**: `git revert <tag>` on `main`, then cherry-pick the revert commit into `develop`
- **Canary/Staged Deployment**: Not applicable (npm package distribution — use `@` version pinning)
- **Packages Published**: `@staffforge/cli`, `@staffforge/core`, `@staffforge/sdk`, `@staffforge/plugin-sdk`
- **Platform Exports**: All 6 adapters regenerated on every release — `npm run export` generates platform-specific outputs

### Decision Making & Communication
- **Decision Documentation**: ADRs in `docs/adr/` for architecture decisions, GitHub Discussions for proposals
- **Architecture Review**: Required for: agent schema changes, pipeline definition changes, new adapters, package API changes, Guardrails configuration changes
- **Communication Channels**: GitHub Issues (task tracking), GitHub Discussions (RFCs/proposals), GitHub PRs (code review)
- **Breaking Changes**: Must be announced with migration guide 1 release in advance (`docs/migrations/v<next>.md`)

---

## Enhanced Documentation Standards

### Documentation Scope & Coverage

| Document | Required? | Location | Maintained By |
|----------|-----------|----------|---------------|
| AGENTS.md | ✅ Mandatory | Root | Framework maintainer |
| AGENTS_ANEX.md | ✅ Mandatory | Root | Project owner |
| ORCHESTRATOR_MATRIX.md | ✅ Mandatory | Root | Framework maintainer |
| PROJECT_RULES.md | ✅ Conditional | Root | Generated by `@project-rules` |
| Agent definitions (`agents/*.md`) | ✅ Mandatory | `agents/` | Agent creator |
| Skill definitions (`skills/*.md`) | ✅ Mandatory | `skills/` | Skill creator |
| JSON Schemas (`schemas/*.json`) | ✅ Mandatory | `schemas/` | Framework maintainer |
| CLI --help output | ✅ Mandatory | Built-in | Package maintainer |
| JSDoc on public APIs | ✅ Mandatory | Source code | Module author |
| CHANGELOG.md | ✅ Mandatory | Root | Release manager |
| Migration guides | ✅ For breaking changes | `docs/migrations/` | Release manager |
| Platform READMEs | ✅ Mandatory | Per adapter | Adapter author |
| Architecture docs | ✅ Mandatory | `docs/architecture/` | Framework maintainer |
| Operational runbooks | Optional | `docs/ops/` | SRE team |

### Documentation Tools & Format
- **Primary Format**: Markdown (GFM) — all documents in-repo
- **API Documentation**: JSDoc annotations in source (used by `generate-docs.mjs`)
- **Version Control**: All docs tracked in repo — documentation PRs follow same review process as code
- **Tool Stack**: Markdown (docs), JSDoc (API reference), JSON Schema (agent/model/skill validation), ADR (architecture decisions)

### Documentation Standards
- **Code Comments**: Mandatory for all public APIs (JSDoc: `@param`, `@returns`, `@throws`). Internal functions: optional but encouraged for non-obvious logic.
- **Change Logs**: Required — `CHANGELOG.md` with `[Unreleased]` header and versioned sections per Keep a Changelog
- **Deprecation Notice**: Minimum 1 release cycle notice before removal — documented in CHANGELOG and migration guide
- **Migration Guides**: Required for all breaking changes — include before/after code examples and upgrade script if applicable
- **Agent Documentation**: Every agent must have `description` in frontmatter. Clear, one-line role summary. No prose beyond what's needed for the role.
- **Frontmatter Versioning**: When agent schema evolves, increment `schemas/agent.schema.json` version and support backward compat via `agent.schema.v0.json`

### Documentation Review
- **Included in Code Review**: Yes — all PRs must include relevant documentation changes
- **Separate Review Process**: No — documentation is reviewed alongside code in the same PR
- **Approval Required**: Yes (maintainer) — automated schema validation for frontmatter correctness

---

## Pipeline & Guardrails Extension

### Task Pipeline Routing
AGENTS.md provides the base pipeline table. This annex codifies the full pipeline behaviour:

1. **VCS Init**: Every pipeline starts with `@vcs` branch creation — type determines branch pattern
2. **Input Sanitization**: `Router.resolveTask()` runs `sanitizeInput()` on every user prompt (18 injection patterns, mode: warn)
3. **Level Execution**: Pipeline executes in DAG order per `pipeline-registry.mjs` — parallel within levels, sequential between levels
4. **Runtime Guardrails**: `GuardrailManager.checkRuntimeGuardrails()` enforces `max_iterations: 10`, `token_budget: 32000`, session token budget: 128000
5. **Output Validation**: Every subagent output validated against its `output_schema` (if defined) via AJV
6. **Hallucination Cross-Check**: Knowledge → Impact → Code Review outputs checked for file reference validity and factual consistency
7. **Secret Scanning**: All outputs scanned for 14 secret patterns (`output-dlp.mjs` mode: redact)
8. **CI Gate**: Pipeline aborts if CI fails — `@ci` watchdog must resolve before merge
9. **VCS Finalize**: Pipeline ends with `@vcs` merge/tag per type-specific template

### Agent Categories (Extended)
| Category | Count | Role |
|----------|-------|------|
| `core` | 9 | Pipeline orchestrators, governance, CI/CD watchdog |
| `vcs` | 5 | VCS provider agents (git, svn, hg, tfvc, perforce) |
| `technology` | 99 | Languages, frameworks, databases, tools |
| `domain` | 23 | Discipline specialists (database, ML, networking) |
| `utility` | 14 | Cross-cutting concerns (debugging, refactor, security audit) |

### Capability Engine Integration
Agent selection does NOT use hardcoded routing. The `CapabilityEngine`:
1. Analyzes prompt intent via keyword extraction
2. Scores agents against intent using their `description`, `category`, and keyword matching
3. Returns top-N agents ranked by relevance score
4. Router assembles the pipeline from scored agents + pipeline template

This means `AGENTS_ANEX.md` does NOT need to list explicit agent-to-task mappings — the engine handles it dynamically.

---

## Integration Notes

### Conflict Resolution
If AGENTS.md and AGENTS_ANEX.md specify conflicting rules:
- This document (AGENTS_ANEX.md) takes precedence for explicitly stated rules
- Base conventions from AGENTS.md remain valid for unstated areas
- Escalate ambiguities to project leadership
- `PROJECT_RULES.md` (if present) takes precedence over both for project-specific settings

### Load Order for Agents
```
1. Initialize with AGENTS.md as foundation
2. Apply all AGENTS_ANEX.md modifications and overrides
3. Merge PROJECT_RULES.md (if exists) — project-specific overrides
4. Merge agent-specific frontmatter into operational context
5. Load skills matching prompt keywords (skill-loader.mjs)
6. Run Router.resolveTask() with sanitization → capability engine → pipeline assembly
7. Execute pipeline with Guardrails at every level
```

---

## Related Base Configuration
**Primary Document**: AGENTS.md  
**Supersedes Sections**: 
- §Technology Detection (Orchestrator) — annex adds full technology stack table with versions
- §Token Optimization Standards (Orchestrator) — annex adds concrete performance thresholds
- §Pipeline Execution (Orchestrator) — annex extends with Guardrails integration details

**Extends Sections**:
- §Conventions (AGENTS.md) — annex adds 10 additional Forbidden Operations and Security Constraints
- §Agent frontmatter (AGENTS.md) — annex adds category field reference and Guardrails frontmatter rules
- §Skills (AGENTS.md) — annex adds skill review and documentation requirements
- §Routing (AGENTS.md) — annex adds full capability engine description and agent category breakdown

---

## Change Log

| Version | Date | Changes | Extends |
|---------|------|---------|---------|
| v2.0 | 2026-07-17 12:00:00 UTC | Professionalized: replaced all placeholders with StaffForge-specific content added Guardrails extension, capability engine, package architecture, real tooling configs, extended forbidden operations, performance thresholds, release workflow, documentation matrix | AGENTS.md v1.0 |
| v1.0 | 2026-07-17 11:11:07 UTC | Initial annex creation | AGENTS.md v1.0 |

---

*This annex extends the project configuration. Both AGENTS.md and AGENTS_ANEX.md must be consulted for complete project guidelines.*
