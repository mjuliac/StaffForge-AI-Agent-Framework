# StaffForge AI Agent Framework

OpenCode multi-provider agent framework. Canonical agents in `agents/*.md`.

## Structure

```
agents/           — 136 agent definitions with YAML frontmatter (mode, description, tools)
adapters/          — Platform exporters per platform (opencode, claude-code, cursor, copilot, aider, gemini-cli)
schemas/           — JSON Schema for agent validation (agent.schema.json, model.schema.json)
tools/             — Node.js CLI: validate, export, init-agent, install, test
models/            — Model definitions (22 files, 7 providers) + task profiles
ORCHESTRATOR_MATRIX.md — task → pipeline routing with VCS Flow integration
```

## Routing

See `ORCHESTRATOR_MATRIX.md`.

| Type       | Pipeline |
|------------|----------|
| Feature    | VCS → Planner → [Requirements+Architect] → Knowledge → Impact → [Language+Security+Testing] → [Code Review+Documentation] → VCS merge |
| Bug        | VCS → Planner → [Knowledge+Impact] → Debugging → [Language+Testing] → Code Review → VCS merge |
| Refactor   | VCS → Architect → [Refactor+Performance] → Code Review → VCS merge |
| Security   | VCS → Security → Pentest → Code Review → VCS merge |
| Deployment | VCS → [Docker+Kubernetes] → [Build+Release] → Documentation → VCS (merge to main + tag + merge to develop + cleanup) |
| Hotfix     | VCS (from main) → Debugging → Code Review → VCS (merge to main + tag + merge to develop + cleanup) |

## Conventions

- **Orchestrator is the default agent** (Tab key). It receives all user requests first.
- **Orchestrator creates the VCS branch** as its very first action for every task.
- Only the orchestrator communicates with the user or creates branches/commits.
- No subagent may talk to the user or manage VCS.
- Subagents get findings/risks/recommendations, never final output.
- Tool permissions are explicit in frontmatter: `tools.write`, `tools.bash`, `tools.edit`.
- Only orchestrator has full permissions; most agents are read-only or have limited bash.

## Agent frontmatter

```yaml
---
description: One-line role summary
mode: subagent           # primary (Tab cycle), subagent (@mention), or all (both)
tools:
  write: false    # may create files
  bash: false     # may run shell commands
  edit: false     # may modify files
---
```

## Commands

```bash
npm install               # Install all dependencies
npm run setup             # Interactive installer (any platform)
npm run validate          # Validate all agents against JSON Schema
npm test                  # Run all tests (31 suites, 848+ tests)
npm run export:opencode   # Export for OpenCode
npm run export:claude     # Export for Claude Code
npm run export:cursor     # Export for Cursor
npm run export:copilot    # Export for GitHub Copilot
npm run export:aider      # Export for Aider
npm run export:gemini     # Export for Gemini CLI
npm run init-agent <name> # Create a new agent from template

# Low-level
node tools/export.mjs --platform <name>   # Export for any platform
node tools/validate.mjs                   # Validate all agents
node tools/init-agent.mjs <name>          # Create a new agent
node install.mjs --platform <name>        # Install for a platform
```

## Adapting to a new platform

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function receives `agents[]`, returns `[{path, content}]`
3. Run `node tools/export.mjs --platform <name>`

## opencode.json

Not committed to repo. Generate with `node tools/export.mjs --platform opencode`.
