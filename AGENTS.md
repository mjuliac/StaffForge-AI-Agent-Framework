# StaffForge AI Agent Framework

OpenCode multi-provider agent framework. Canonical agents in `agents/*.md`.

## Structure

```
agents/           — 136 agent definitions with YAML frontmatter (mode, description, tools)
adapters/          — Platform exporters per platform (opencode, claude-code, cursor, copilot, aider, gemini-cli)
schemas/           — JSON Schema for agent validation (agent.schema.json)
templates/         — Scaffolding for new agents (agent.md)
tools/             — Node.js CLI: validate, export, init-agent, install
examples/          — Sample outputs and export commands
ORCHESTRATOR_MATRIX.md — task → pipeline routing with Git Flow integration
```

## Routing

See `ORCHESTRATOR_MATRIX.md`.

| Type       | Pipeline |
|------------|----------|
| Feature    | Git → Planner → [Requirements+Architect] → Knowledge → Impact → [Language+Security+Testing] → [Code Review+Documentation] → Git merge |
| Bug        | Git → Planner → [Knowledge+Impact] → Debugging → [Language+Testing] → Code Review → Git merge |
| Refactor   | Git → Architect → [Refactor+Performance] → Code Review → Git merge |
| Security   | Git → Security → Pentest → Code Review → Git merge |
| Deployment | Git → [Docker+Kubernetes] → [Build+Release] → Documentation → Git (merge to main + tag + merge to develop + cleanup) |
| Hotfix     | Git (from main) → Debugging → Code Review → Git (merge to main + tag + merge to develop + cleanup) |

## Conventions

- **Orchestrator is the default agent** (Tab key). It receives all user requests first.
- **Orchestrator creates the git flow branch** as its very first action for every task.
- Only the orchestrator communicates with the user or creates Git branches/commits.
- No subagent may talk to the user or manage git.
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
npm install    # in tools/
node tools/validate.mjs              # validate all agents
node tools/export.mjs --platform <name>   # export for a platform
node tools/init-agent.mjs <name>     # create a new agent from template
```

## Adapting to a new platform

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function receives `agents[]`, returns `[{path, content}]`
3. Run `node tools/export.mjs --platform <name>`

## opencode.json

Not committed to repo. Generate with `node install.mjs`, `node tools/export.mjs --platform opencode`, or `npx github:mjuliac/StaffForge-AI-Agent-Framework`.
