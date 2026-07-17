# 1 - AGENTS Configuration Annex
**Version**: v1.0  
**Created**: 2026-07-17 06:02:30 UTC  
**Last Modified**: 2026-07-17 06:02:30 UTC  
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

- **Languages**: 1
- **Web Framework**: 1
- **Database(s)**: 1
- **Architecture Pattern**: 1
- **Testing Framework**: 1
- **DevOps & Deployment**: 1

---

## Additional Code Conventions

- **Variable Naming**: 1 - project convention
- **Class/Type Naming**: 1 - project convention
- **File Naming**: 1 - consistent file naming
- **Indentation**: 1 - consistent across all files
- **Max Line Length**: 1 characters - enforced by linter
- **Code Formatter**: 1
- **Documentation Format**: 1 with mandatory coverage for public APIs

---

## Supplementary Operational Rules


### Forbidden Operations (NEVER)
- 1: documented project constraint

### Required Approvals
- 1: as defined by project process

### Performance Requirements
- 1

### Security Constraints
- 1

### Data Handling Rules
- 1

### Deployment Rules
- 1

---

## Extended Workflow Requirements


### Version Control Strategy
- **Branching Model**: 1 - project branching strategy
- **Commit Message Format**: 1 - standardized format
- **Versioning Scheme**: 1

### Code Review Process
- **Minimum Reviewers**: 1
- **Approval Requirements**: At least 1 approval(s)
- **Review Timeline**: Per project SLA
- **Automated Checks**: CI validation + tests required

### Issue & Task Management
- **Tool**: 1
- **Issue Labeling**: feature / bug / refactor / security / docs
- **Task Assignment**: Assignee on issue

### Release & Deployment Workflow
- **Deployment Frequency**: Per release schedule
- **Release Process**: 1
- **Rollback Procedure**: Manual revert of tagged commit
- **Canary/Staged Deployment**: Per project decision

### Decision Making & Communication
- **Decision Documentation**: ADRs / 1
- **Architecture Review**: Required for contract changes
- **Communication Channels**: 1

### Team Synchronization
- **Standup Cadence**: Per team
- **Team Review Meetings**: Per team

---

## Enhanced Documentation Standards


### Documentation Scope & Coverage
- **Architecture**: Required - 1
- **API Specifications**: Required - 1
- **Deployment Guides**: Required - README + per-platform docs
- **Operational Runbooks**: Optional
- **Module READMEs**: Required sections

### Documentation Tools & Format
- **Primary Format**: 1
- **Location**: Repository
- **Version Control**: In-repo
- **Tool Stack**: Markdown + 1

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
| v1.0 | 2026-07-17 06:02:30 UTC | Initial annex creation | AGENTS.md v1.0 |

---

*This annex extends the project configuration. Both AGENTS.md and AGENTS_ANEX.md must be consulted for complete project guidelines.*
