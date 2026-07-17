
# Routing Matrix

> **Notation:** `+` between agents means they run in **parallel** at the same level.
> Sequential `→` means the previous step must complete before the next begins.
>
> **Agent categories:** See `agents/*.md` frontmatter `category` field.
> - `core` (10): Pipeline orchestrators, governance, CI/CD watchdog
> - `vcs` (5): VCS provider agents (git, svn, hg, tfvc, perforce)
> - `technology` (99): Languages, frameworks, databases, tools
> - `domain` (23): Discipline specialists (database, ML, networking, etc.)
> - `utility` (11): Cross-cutting concerns (debugging, refactor, security audit)
>
> The Router uses `CapabilityEngine` to match technology agents to prompt intent.
> See `tools/lib/capability-engine.mjs` and `tools/lib/router.mjs`.

## VCS Flow Integration

All task types create a branch via the `@vcs` agent before starting work.
The configured VCS provider (default: git) determines the exact branch commands.

| Task Type | Branch Pattern | Commit Prefix |
|-----------|---------------|---------------|
| Feature | `feature/<name>` | `feat:` |
| Bug Fix | `bugfix/<name>` | `fix:` |
| Hotfix | `hotfix/<name>` | `hotfix:` |
| Release | `release/<version>` | `release:` |

## Task Pipelines

### Feature
```
VCS (create feature/*) → Planner
→ [Requirements + Architect] (parallel)
→ Knowledge → Impact
→ [Language Specialist + Security + Testing] (parallel)
→ [Code Review + Documentation] (parallel)
→ CI (verify green) → VCS (merge)
```

### Bug Fix
```
VCS (create bugfix/*) → Planner
→ [Knowledge + Impact] (parallel)
→ Debugging
→ [Language Specialist + Testing] (parallel)
→ Code Review → CI (verify green) → VCS (merge)
```

### Refactor
```
VCS (create feature/*) → Architect
→ [Refactor + Performance] (parallel)
→ Code Review → CI (verify green) → VCS (merge)
```

### Security
```
VCS (create feature/*) → Security → Pentest → Code Review → CI (verify green) → VCS (merge)
```

### Deployment
```
VCS (create release/*) → [Docker + Kubernetes] (parallel)
→ [Build + Release] (parallel)
→ Documentation → CI (verify green) → VCS (finalize: merge to main + tag + merge to develop + cleanup)
```

### Hotfix (Urgent)
```
VCS (create hotfix/*) → Debugging → Code Review → CI (verify green) → VCS (tag + merge to main + develop)
```
