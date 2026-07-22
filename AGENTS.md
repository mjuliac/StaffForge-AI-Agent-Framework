# StaffForge AI Agent Framework

Multi-provider agent framework. Canonical agents in `agents/*.md`, skills in `skills/*.md`.

## Structure

```
agents/             — 150 agent definitions with YAML frontmatter (mode, description, tools)
skills/             — 3 skill definitions with YAML frontmatter (name, description, keywords, globs)
adapters/            — Platform exporters per platform (opencode, claude-code, cursor, copilot, aider, gemini-cli)
schemas/             — JSON Schema for validation (agent.schema.json, model.schema.json, skill.schema.json)
templates/           — Scaffolding templates for new agents and skills (agent.md, skill.md)
tools/               — Node.js CLI: validate, export, init-agent, init-skill, install, test, skill-loader
models/              — Model definitions (22 files, 7 providers) + task profiles (profiles.yaml)
ORCHESTRATOR_MATRIX.md — task → pipeline routing with VCS Flow integration
PROJECT_RULES.md     — Dynamically generated project rules (addendum to AGENTS.md, created by @project-rules)
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
- **🔴 BRANCH CREATION IS NOT OPTIONAL — Orchestrator creates the VCS branch as its very first action for every task.** Never work directly on develop/main. Any work done outside a task branch is REJECTED.
- **🔴 VCS/git agents REFUSE commits, stages, and file operations on develop/main.** Only merges and tags permitted on protected branches.
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

## Project Rules

`PROJECT_RULES.md` is a dynamically generated addendum to `AGENTS.md` that defines project-specific
settings: tech stack, conventions, constraints, workflow, and documentation standards.

- Created by the `@project-rules` agent via an interactive wizard at setup time.
- Automatically checked by `npm run setup` (if missing, prompts to create it).
- Read by the orchestrator at the start of every session and injected into the Compressed Context Block.
- All subagents receive project rules as context in every delegation.
- If a rule in `PROJECT_RULES.md` conflicts with `AGENTS.md`, the project rule takes precedence.

### When PROJECT_RULES.md is missing

The orchestrator delegates to `@project-rules` before any other work. The agent runs a 5-question
wizard covering: tech stack → conventions → rules → workflow → documentation.

## Skills

Skills are reusable instruction sets that provide specialized guidance for specific tasks.
They live as canonical files in `skills/*.md` and are exported per-platform alongside agents.

### Skill frontmatter

```yaml
---
name: database-review
description: Reviews database schema changes for performance and correctness
version: 0.1.0
keywords: [database, sql, schema, migration]
globs: [**/*.sql, **/migrations/**]
compatible_platforms: [opencode, claude-code, cursor]
author: StaffForge
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Unique kebab-case identifier (matches filename) |
| `description` | yes | One-line summary of when to load this skill |
| `version` | no | SemVer (default: 0.1.0 when scaffolding) |
| `keywords` | no | Task-matching keywords — skill loads when prompt matches |
| `globs` | no | File globs that trigger the skill (platform-specific) |
| `compatible_platforms` | no | Platforms that support this skill (empty = all) |
| `author` | no | Creator or maintainer |

### Skills pipeline

1. Define skill in `skills/<name>.md` (or use `npm run init-skill <name>`)
2. Validate with `npm run validate` (validates frontmatter + non-empty body)
3. Export with `npm run export` (generates platform-specific skill files in each adapter's output)
4. Install with `node tools/install.mjs --platform <name>` (copies output to project root)

Each platform adapter transforms the canonical skill file into its native format:
- **opencode**: `.opencode/skills/<name>.md` + `opencode.json` with `skills.paths`
- **claude-code**: `.claude/skills/<name>.md`
- **cursor**: `.cursor/rules/<name>.mdc` (with globs)
- **copilot**: Copilot-specific format
- **aider**: Aider-specific format
- **gemini-cli**: Gemini-specific format

## Commands

```bash
npm install               # Install all dependencies
npm run setup             # Interactive installer (any platform)
npm run validate          # Validate all agents, skills, and models against JSON Schema
npm test                  # Run all tests (31 suites, 848+ tests)
npm run export            # Export agents + skills to ALL platforms (--all)
npm run export:opencode   # Export for OpenCode
npm run export:claude     # Export for Claude Code
npm run export:cursor     # Export for Cursor
npm run export:copilot    # Export for GitHub Copilot
npm run export:aider      # Export for Aider
npm run export:gemini     # Export for Gemini CLI
npm run init-agent <name> # Create a new agent from template
npm run init-skill <name> # Create a new skill from template

# Low-level
node tools/export.mjs --platform <name>   # Export for a single platform
node tools/export.mjs --all               # Export to all platforms
node tools/validate.mjs                   # Validate all agents, skills, and models
node tools/init-agent.mjs <name>          # Create a new agent
node tools/init-skill.mjs <name>          # Create a new skill
node tools/skill-loader.mjs               # Load and inspect skill definitions
node install.mjs --platform <name>        # Install for a platform
```

## Adapting to a new platform

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function receives `(agents[], skills[])`, returns `[{path, content}]`
3. Run `node tools/export.mjs --platform <name>`

## opencode.json

Not committed to repo. Generate with `npm run export:opencode` or `node tools/export.mjs --platform opencode`.
When skills are present, the generated `opencode.json` includes `skills.paths: [".opencode/skills"]` and
individual skill files are written to `.opencode/skills/<name>.md`.
---

## Annex Reference

This project has an **AGENTS_ANEX.md** annex that extends or overrides parts of this configuration.
Agents **must** load `AGENTS_ANEX.md` after this file and apply its modifications.

---
