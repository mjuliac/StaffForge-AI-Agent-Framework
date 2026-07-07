
# Routing Matrix

> **Notation:** `+` between agents means they run in **parallel** at the same level.
> Sequential `→` means the previous step must complete before the next begins.

## Git Flow Integration

All task types create a branch via the `git` agent before starting work:

| Task Type | Branch Pattern | Commit Prefix |
|-----------|---------------|---------------|
| Feature | `feature/<name>` | `feat:` |
| Bug Fix | `bugfix/<name>` | `fix:` |
| Hotfix | `hotfix/<name>` | `hotfix:` |
| Release | `release/<version>` | `release:` |

## Task Pipelines

### Feature
```
Git (create feature/*) → Planner
→ [Requirements + Architect] (parallel)
→ Knowledge → Impact
→ [Language Specialist + Security + Testing] (parallel)
→ [Code Review + Documentation] (parallel)
→ Git (merge)
```

### Bug Fix
```
Git (create bugfix/*) → Planner
→ [Knowledge + Impact] (parallel)
→ Debugging
→ [Language Specialist + Testing] (parallel)
→ Code Review → Git (merge)
```

### Refactor
```
Git (create feature/*) → Architect
→ [Refactor + Performance] (parallel)
→ Code Review → Git (merge)
```

### Security
```
Git (create feature/*) → Security → Pentest → Code Review → Git (merge)
```

### Deployment
```
Git (create release/*) → [Docker + Kubernetes] (parallel)
→ [Build + Release] (parallel)
→ Documentation → Git (finalize: merge to main + tag + merge to develop + cleanup)
```

### Hotfix (Urgent)
```
Git (create hotfix/*) → Debugging → Code Review → Git (tag + merge to main + develop)
```
