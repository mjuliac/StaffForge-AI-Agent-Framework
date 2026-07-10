# StaffForge AI Agent Framework

[![CI](https://github.com/mjuliac/StaffForge-AI-Agent-Framework/actions/workflows/ci.yml/badge.svg)](https://github.com/mjuliac/StaffForge-AI-Agent-Framework/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](#requirements)
[![Agents](https://img.shields.io/badge/agents-148-orange)](agents/)
[![Platforms](https://img.shields.io/badge/platforms-6-purple)](#installation-per-platform)

Multi-provider agent framework. Write agents once, deploy anywhere.

## Why StaffForge

If your team uses more than one AI coding assistant — OpenCode, Claude Code, Cursor, GitHub Copilot, Aider, Gemini CLI — you've probably rewritten the same agent rules, prompts, and conventions for each one, and kept rewriting them every time a rule changes.

StaffForge solves that by separating **what your agents know** from **where they run**:

- Define an agent once in `agents/*.md` (Markdown + frontmatter).
- Export it to any supported platform's native format with one command.
- Update the rule in one place; re-export to every platform instead of hand-editing 6 config formats.

StaffForge is **not** an agent-execution runtime like LangGraph or CrewAI — it doesn't call LLM APIs itself. It's a definition layer and orchestrator/router that sits on top of the AI coding tools you already use, plus a Model Selection Layer for choosing which model a task should use.

## Table of contents

- [Why StaffForge](#why-staffforge)
- [Quick start](#quick-start)
- [Installation per platform](#installation-per-platform)
- [Interactive installer](#interactive-installer)
- [Agent modes](#agent-modes)
- [Architecture](#architecture)
- [Routing](#routing)
- [Prompt examples](#prompt-examples)
- [Commands](#commands)
- [Adapting to a new platform](#adapting-to-a-new-platform)
- [Model Selection Layer](#model-selection-layer)
- [Requirements](#requirements)
- [Testing](#testing)
- [Project layout](#project-layout)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Project layout

```
agents/           ← Canonical agent definitions (Markdown + frontmatter)
adapters/         ← Platform-specific exporters (OpenCode, Claude Code, Cursor, etc.)
packages/         ← Monorepo packages (core, sdk, plugin-sdk, cli, dashboard, enterprise)
schemas/          ← JSON Schema for agent validation
templates/        ← Scaffolding for new agents
models/           ← Model definitions and task profiles (Model Selection Layer)
tools/            ← CLI scripts (validate, export, init, install)
tests/            ← Unit, integration, and e2e test suites
examples/         ← Usage examples
```

## Quick start

### From any project — **one command, all OS**

```bash
npx github:mjuliac/StaffForge-AI-Agent-Framework
```

Interactive prompts ask for platform, default agent, and location. Works on Linux, macOS, and Windows — Node.js is the only requirement.

Or non-interactive with flags:
```bash
npx github:mjuliac/StaffForge-AI-Agent-Framework --platform opencode --agent orchestrator
```

The installer saves a `.staffforge-install.json` config, so re-running detects previous settings:

```bash
# Update to latest agents:
npx github:mjuliac/StaffForge-AI-Agent-Framework
# → Previous: opencode (agent: orchestrator)
#   Reinstall? [Y/n]:  ← press Enter
```

After install:
```bash
opencode
```

### Clone the repository (any OS)

```bash
git clone --depth 1 https://github.com/mjuliac/StaffForge-AI-Agent-Framework.git
cd StaffForge-AI-Agent-Framework
npm install
npm run setup          # interactive installer
```

### Export to other platforms (after cloning)

```bash
npm run export:claude      # Claude Code
npm run export:cursor      # Cursor
npm run export:copilot     # GitHub Copilot
npm run export:aider       # Aider
npm run export:gemini      # Gemini CLI
```

---



## Installation per platform

Export agents to any supported platform:

```bash
node tools/export.mjs --platform <name> [--out <dir>]
```

### OpenCode

```bash
node tools/export.mjs --platform opencode
```

| Output | Purpose |
|--------|---------|
| `opencode.json` | Agent config (modes, permissions) |

Agents with `mode: primary` appear in the **Tab** cycle (orchestrator, build, plan).
Agents with `mode: subagent` appear in the **@** autocomplete menu (134 specialized agents).

> The `--out` flag copies the generated file elsewhere. For normal use, run without `--out` — the file is placed at `adapters/opencode/output/` and then copied to the project root by the installer.

---

### Claude Code

```bash
node tools/export.mjs --platform claude-code
```

| Output | Purpose |
|--------|---------|
| `CLAUDE.md` | Orchestrator instructions (top-level rules) |
| `.claude/rules/<agent>.md` | One file per subagent |

Claude Code reads `CLAUDE.md` automatically from the project root. Subagent rules in `.claude/rules/` are loaded as additional instructions when the relevant agent is invoked.

Copy the output to your project root:

```bash
cp -r adapters/claude-code/output/* .
```

---

### Cursor

```bash
node tools/export.mjs --platform cursor
```

| Output | Purpose |
|--------|---------|
| `.cursor/rules/<agent>.mdc` | One `.mdc` rule file per agent |

Cursor loads `.mdc` files from `.cursor/rules/` automatically. Each file has frontmatter with a `description` field so Cursor can select the right rule for the context.

Copy the output to your project root:

```bash
cp -r adapters/cursor/output/.cursor .
```

---

### GitHub Copilot

```bash
node tools/export.mjs --platform copilot
```

| Output | Purpose |
|--------|---------|
| `.github/copilot-instructions.md` | All agents concatenated as instructions |

Copilot reads `.github/copilot-instructions.md` automatically when it exists in the project. All 136 agents are included in a single file with `---` separators.

Copy the output to your project root:

```bash
cp -r adapters/copilot/output/.github .
```

---

### Aider

```bash
node tools/export.mjs --platform aider
```

| Output | Purpose |
|--------|---------|
| `.aider.rules.md` | All agents as rule definitions |

Aider loads `.aider.rules.md` automatically from the project root. Each agent's full body is included, separated by `---`.

Copy the output to your project root:

```bash
cp adapters/aider/output/.aider.rules.md .
```

---

### Gemini CLI

```bash
node tools/export.mjs --platform gemini-cli
```

| Output | Purpose |
|--------|---------|
| `.gemini/<agent>.md` | One prompt file per agent |

Gemini CLI reads markdown files from `.gemini/` as system prompts. Each file contains the agent's full instructions.

Copy the output to your project root:

```bash
cp -r adapters/gemini-cli/output/.gemini .
```

---

## Interactive installer

```bash
node install.mjs
```

Runs the export for any supported platform and copies the config files to your project. Supports all flags:

```bash
node install.mjs --platform opencode --agent orchestrator
node install.mjs --platform claude-code --agent build
node install.mjs --platform all
node install.mjs -y                                 # defaults (opencode, orchestrator, project-local)
```

## Agent modes

| Mode | Tab cycle | @ mention | Permissions |
|------|-----------|-----------|-------------|
| **orchestrator** | ✓ default | ✓ | Full tools |
| **build** | ✓ | ✓ | Full tools |
| **plan** | ✓ | ✓ | Read-only |
| 145 subagents | — | ✓ | Varies |

- **Tab** — Cycle: orchestrator → build → plan
- **@name** — Invoke any subagent (e.g., `@security`, `@testing`, `@ci`, `@docker`, `@flask`, `@react`, `@postgres`)
- Orchestrator is the default agent. It detects task type AND technologies from your prompt, then routes to the right specialist agents.

## Architecture

- **Orchestrator** (default agent) — receives all requests, detects task type and technologies, creates git flow branches, routes pipelines, communicates with the user
- **Subagents** (145) — specialized roles (language experts, frameworks, databases, infrastructure, testing, security, CI/CD, etc.)
- **Only the orchestrator** may talk to the user, write files, or manage git
- Subagents run in **parallel** when they have no dependency on each other (DAG-based execution)

## Routing

See `ORCHESTRATOR_MATRIX.md` for task → pipeline mapping with parallel execution groups.

## Prompt examples

The orchestrator detects **both the task type and the technologies** from your prompt, then invokes the relevant specialist agents. Mention the technologies explicitly for best results:

```text
# Python web — detects flask, sqlalchemy, postgres, pytest
"Add a Flask REST API with SQLAlchemy models for users and products, store in PostgreSQL, cover with pytest tests"

# .NET web — detects aspnet-core, entity-framework, sqlserver, xunit
"Create an ASP.NET Core API with Entity Framework connecting to SQL Server, add xUnit tests"

# Frontend — detects react, typescript, tailwind, vitest
"Build a React dashboard with TypeScript, style with Tailwind, test with Vitest"

# Full stack — detects react, fastapi, postgres, docker
"Implement a todo app: React frontend, FastAPI backend, PostgreSQL database, Docker compose"

# Mobile — detects react-native, typescript
"Fix the login screen in our React Native app written in TypeScript"

# DevOps — detects docker, github-actions, aws
"Set up CI with GitHub Actions to build the Docker image and deploy to AWS ECS"

# Database — detects postgres, redis, sqlalchemy
"Optimize slow queries: Postgres with Redis caching, accessed via SQLAlchemy"

# Mixed Python + .NET — both specialist agents are invoked
"Port the authentication module from Python Flask to ASP.NET Core"
```

The orchestrator:
1. Detects task type (feature, bugfix, refactor, security, deployment, hotfix)
2. Scans for technology keywords (flask → `@flask`, react → `@react`, postgres → `@postgres`, etc.)
3. Builds a pipeline mixing the base task flow with the detected technology agents
4. Executes in DAG-based parallel levels

## Commands

```bash
# Root-level (npm)
npm install              # Install all dependencies (tools/ included)
npm run setup            # Interactive installer
npm run setup:opencode   # Non-interactive: OpenCode + orchestrator
npm run setup:build      # Non-interactive: OpenCode + build agent
npm run setup:plan       # Non-interactive: OpenCode + plan agent
npm run export:opencode  # Export to OpenCode
npm run export:claude    # Export to Claude Code
npm run export:cursor    # Export to Cursor
npm run export:copilot   # Export to GitHub Copilot
npm run export:aider     # Export to Aider
npm run export:gemini    # Export to Gemini CLI
npm run validate         # Validate all agents
npm test                 # Run all 848+ tests (31 suites)

# Low-level (node)
node install.mjs                          # Interactive installer (any platform)
node install.mjs --platform opencode      # Non-interactive: OpenCode
node install.mjs --platform claude-code   # Non-interactive: Claude Code
node install.mjs --agent orchestrator -y  # Non-interactive with defaults
node tools/export.mjs --platform <name>   # Export agents for any platform
node tools/validate.mjs                   # Validate all agent definitions
node tools/init-agent.mjs <name>          # Create a new agent from template
node tests/run-all.mjs                    # Run test suite

# Environment variables
STAFFFORGE_LOG_LEVEL=debug node tools/export.mjs --platform opencode  # Verbose logging
STAFFFORGE_LOG_LEVEL=error node tools/validate.mjs                    # Errors only
```

## Adapting to a new platform

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function receives `agents[]`, returns `[{path, content}]`
3. Run `node tools/export.mjs --platform <name>`

## opencode.json

Not committed to repo. Generate with `node install.mjs`, `node tools/export.mjs --platform opencode`, or `npx github:mjuliac/StaffForge-AI-Agent-Framework`.

## Model Selection Layer

The framework includes a Model Selection Layer for optimal model selection:

- **22 model definitions** across 7 providers (OpenAI, Anthropic, Google, OpenRouter, Ollama, OpenCode)
- **8 task profiles** in `models/profiles.yaml` mapping task types to preferred model families
- **Selection Engine**: weighted scoring (profile fit, capabilities, priority, cost, reasoning)
- **Fallback Engine**: 4-level chain (primary → same-provider → other-provider → free)
- **Learning Engine**: tracks execution history and adjusts rankings by success rate
- **Model Selector facade**: 4 strategies (intelligent, cheapest, fastest, free)

> **Note:** This is a pure selection layer — it chooses the optimal model and returns it. It does not invoke LLM APIs directly. The `agentFn` parameter in FallbackEngine and ModelSelector is provided for callers to supply their own execution logic.

See `ARCHITECTURE.md` §2 for full API reference.

## Requirements

- **Node.js ≥ 18** (Linux, macOS, or Windows)
- No other runtime dependency — the installer (`npx github:mjuliac/StaffForge-AI-Agent-Framework`) works standalone
- A supported AI coding assistant already installed for whichever platform(s) you target (OpenCode, Claude Code, Cursor, GitHub Copilot, Aider, or Gemini CLI)

## Testing

```bash
npm test                 # Run all suites (unit, integration, e2e)
npm run validate         # Validate every agent definition against the JSON Schema
npm run lint             # ESLint over tools/ and packages/
npm run format           # Prettier check
```

The suite currently covers unit tests (registries, engines, DAG, scheduler, VCS, telemetry), integration tests (export, install, pipelines, VCS git+svn), and end-to-end tests (full agent lifecycle). Run `npm test` locally before opening a PR — CI runs the same suite on Node 22/24.

The **`@ci`** subagent enforces zero-tolerance for CI failures: invoked automatically before every merge, it inspects CI logs, fixes all failures (format, lint, test, validate, export, security), and iterates until every check passes. Invoke manually with `@ci` to debug a failing pipeline.

## Documentation

| Document | Contents |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Full internal architecture, core libraries, and API reference |
| [`ORCHESTRATOR_MATRIX.md`](ORCHESTRATOR_MATRIX.md) | Task → pipeline mapping and parallel execution groups |
| [`AGENTS.md`](AGENTS.md) | Conventions and structure for writing agent definitions |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to add agents, models, and adapters |

## Contributing

Contributions are welcome — especially new agent definitions, platform adapters, and model definitions. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow (adding an agent, adding a model, adding a platform adapter, commit conventions, and PR process). Issues and feature requests use the templates in `.github/ISSUE_TEMPLATE/`.

## License

- `packages/core`, `packages/sdk`, `packages/plugin-sdk`, and everything under `agents/`, `adapters/`, `schemas/`, `templates/`, and `tools/` are licensed under **GPL-3.0-only** — see [`LICENSE`](LICENSE).
- `packages/enterprise` (SQLite storage, analytics, policy engine, and the Enterprise dashboard) is distributed under a **separate commercial StaffForge license** and is not covered by the GPL-3.0 grant above.

## Support

- **Bugs / feature requests:** open an issue using the templates in `.github/ISSUE_TEMPLATE/`
- **Questions about usage:** see the [Prompt examples](#prompt-examples) and [`ORCHESTRATOR_MATRIX.md`](ORCHESTRATOR_MATRIX.md) first
- **Security issues:** please do not open a public issue — contact the maintainer directly
