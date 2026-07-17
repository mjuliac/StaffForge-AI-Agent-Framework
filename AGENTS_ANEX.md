# 1 - AGENTS Configuration Annex
**Version**: v1.0  
**Created**: 2026-07-17 10:51:07 UTC  
**Last Modified**: 2026-07-17 10:51:07 UTC  
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

- **Languages**: Node.js (JavaScript/TypeScript)
- **Web Framework**: Express.js
- **Database(s)**: Prisma
- **Architecture Pattern**: Monolith
- **Testing Framework**: Jest
- **DevOps & Deployment**: GitHub Actions

---

## Additional Code Conventions

- **Variable Naming**: camelCase - project convention
- **Class/Type Naming**: PascalCase - project convention
- **File Naming**: kebab-case - consistent file naming
- **Indentation**: 2 spaces - consistent across all files
- **Max Line Length**: 80 characters - enforced by formatter
- **Code Formatter**: Prettier + ESLint
- **Documentation Format**: JSDoc (JavaScript/TypeScript) with mandatory coverage for public APIs

---

## Supplementary Operational Rules


### Forbidden Operations (NEVER)
- Never run VCS outside orchestrator: documented project constraint
- Never commit secrets: documented project constraint

### Required Approvals
- PR review by maintainer: as defined by project process

### Performance Requirements
- None specified

### Security Constraints
- Never log secrets/tokens

### Data Handling Rules
- No PII in repo

### Deployment Rules
- Tagged releases only

---

## Extended Workflow Requirements


### Version Control Strategy
- **Branching Model**: Git Flow - project branching strategy
- **Commit Message Format**: Conventional Commits - standardized format
- **Versioning Scheme**: Semantic Versioning (SemVer)

### Code Review Process
- **Minimum Reviewers**: 1
- **Approval Requirements**: At least 1 approval(s)
- **Review Timeline**: Per project SLA
- **Automated Checks**: CI validation + tests required

### Issue & Task Management
- **Tool**: GitHub Issues
- **Issue Labeling**: feature / bug / refactor / security / docs
- **Task Assignment**: Assignee on issue

### Release & Deployment Workflow
- **Deployment Frequency**: Per release schedule
- **Release Process**: Hybrid (CI build + manual tag)
- **Rollback Procedure**: Manual revert of tagged commit
- **Canary/Staged Deployment**: Per project decision

### Decision Making & Communication
- **Decision Documentation**: ADRs / GitHub Discussions
- **Architecture Review**: Required for contract changes
- **Communication Channels**: GitHub Discussions

### Team Synchronization
- **Standup Cadence**: Per team
- **Team Review Meetings**: Per team

---

## Enhanced Documentation Standards


### Documentation Scope & Coverage
- **Architecture**: Required - Architecture + API
- **API Specifications**: Required - JSDoc / TypeScript (TSDoc)
- **Deployment Guides**: Required - README + per-platform docs
- **Operational Runbooks**: Optional
- **Module READMEs**: Required sections

### Documentation Tools & Format
- **Primary Format**: Markdown in repo
- **Location**: Repository
- **Version Control**: In-repo
- **Tool Stack**: Markdown + JSDoc / TypeScript (TSDoc)

### Documentation Standards
- **Code Comments**: Mandatory for public APIs
- **Change Logs**: Required - CHANGELOG.md
- **Deprecation Notice**: 1 release notice before removal
- **Migration Guides**: Required for breaking changes

### Documentation Review
- **Included in Code Review**: Yes
- **Separate Review Process**: No
- **Approval Required**: Yes (maintainer)

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
| v1.0 | 2026-07-17 10:51:07 UTC | Initial annex creation | AGENTS.md v1.0 |

---

*This annex extends the project configuration. Both AGENTS.md and AGENTS_ANEX.md must be consulted for complete project guidelines.*
