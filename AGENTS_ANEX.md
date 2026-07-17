# StaffForge AI Agent Framework - AGENTS Configuration Annex
**Version**: v1.0  
**Created**: 2026-07-17 10:25:16 UTC  
**Last Modified**: 2026-07-17 10:25:16 UTC  
**Extends**: AGENTS.md (v1.0)  
**Status**: Active

---

## Important Notice

This document extends and enhances the base AGENTS.md configuration. When both files exist:

1. **Base rules** from AGENTS.md remain in effect
2. **New rules** defined in this annex are additive
3. **Override rules** specified herein supersede AGENTS.md for specific sections
4. **Clarifications** provided here refine base interpretations
5. **Load order**: Agents must load AGENTS.md first, then apply AGENTS_ANEX.md modifications

---

## Table of Contents
1. [Extension Scope](#extension-scope)
2. [Enhanced Technology Stack](#enhanced-technology-stack)
3. [Additional Code Conventions](#additional-code-conventions)
4. [Supplementary Operational Rules](#supplementary-operational-rules)
5. [Extended Workflow Requirements](#extended-workflow-requirements)
6. [Enhanced Documentation Standards](#enhanced-documentation-standards)
7. [Integration Notes](#integration-notes)

---

## Extension Scope

**Rationale for Annex Creation**: Project-specific enhancements to base AGENTS.md

**Specific Areas of Enhancement**:
- [Area 1]
- [Area 2]
- [Area 3]

---

## Enhanced Technology Stack

- **Languages**: JavaScript (Node.js 20+, ESM), YAML (agent/skill config)
- **Web Framework**: None as app framework — CLI/tooling (Node.js scripts, platform adapters)
- **Database(s)**: None (file-based YAML/JSON configuration)
- **Architecture Pattern**: Modular monorepo with platform adapter exporters
- **Testing Framework**: Jest/Vitest (unit), custom test runner (tests/run-all.mjs)
- **DevOps & Deployment**: npm scripts, GitHub Actions (CI), multi-platform export (opencode/claude-code/cursor/copilot/aider/gemini-cli)

---

## Additional Code Conventions

- **Variable Naming**: camelCase - JavaScript convention
- **Class/Type Naming**: PascalCase - consistent across files
- **File Naming**: kebab-case for files (e.g. init-agent.mjs), snake_case for modules
- **Indentation**: 2 spaces - consistent across all files
- **Max Line Length**: 100 characters - enforced by Prettier
- **Code Formatter**: Prettier (config: .prettierrc) + ESLint (config: .eslintrc.json)
- **Documentation Format**: JSDoc-style block comments with mandatory coverage for public APIs

---

## Supplementary Operational Rules


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
- Rollback: tag-based revert via @vcs

---

## Extended Workflow Requirements


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
- **Team Review Meetings**: Weekly maintainer sync

---

## Enhanced Documentation Standards


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
- **SLA for Review**: Same as code review

---

## Integration Notes

### Conflict Resolution
If AGENTS.md and AGENTS_ANEX.md specify conflicting rules:
- This document (AGENTS_ANEX.md) takes precedence for explicitly stated rules
- Base conventions from AGENTS.md remain valid for unstated areas
- Escalate ambiguities to project leadership

### Load Order for Agents
```
1. Initialize with AGENTS.md as foundation
2. Apply all AGENTS_ANEX.md modifications and overrides
3. Merge resulting configuration into operational context
4. Log all applied modifications for auditability
```

---

## Related Base Configuration
**Primary Document**: AGENTS.md  
**Supersedes Sections**: [List which AGENTS.md sections this annex overrides]  
**Extends Sections**: [List which AGENTS.md sections this annex enhances]

---

## Change Log

| Version | Date | Changes | Extends |
|---------|------|---------|---------|
| v1.0 | 2026-07-17 10:25:16 UTC | Initial annex creation | AGENTS.md v1.0 |

---

*This annex extends the project configuration. Both AGENTS.md and AGENTS_ANEX.md must be consulted for complete project guidelines.*
