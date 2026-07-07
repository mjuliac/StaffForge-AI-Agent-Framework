
# Routing Matrix

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
Git (create feature/*) → Planner → Requirements → Architect → Knowledge → Impact
→ Language Specialist → Security → Testing → Code Review → Documentation → Git (merge)
```

### Bug Fix
```
Git (create bugfix/*) → Planner → Knowledge → Impact → Debugging → Language Specialist
→ Testing → Code Review → Git (merge)
```

### Refactor
```
Git (create feature/*) → Architect → Refactor → Performance → Code Review → Git (merge)
```

### Security
```
Git (create feature/*) → Security → Pentest → Code Review → Git (merge)
```

### Deployment
```
Git (create release/*) → Docker → Kubernetes → Build → Release → Documentation → Git (tag)
```

### Hotfix (Urgent)
```
Git (create hotfix/*) → Debugging → Code Review → Git (tag + merge to main + develop)
```
