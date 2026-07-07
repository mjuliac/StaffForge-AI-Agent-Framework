# StaffForge AI Agent Framework

Multi-provider agent framework. Write agents once, deploy anywhere.

```
agents/           ← Canonical agent definitions (Markdown + frontmatter)
adapters/         ← Platform-specific exporters (OpenCode, Claude Code, Cursor, etc.)
schemas/          ← JSON Schema for agent validation
templates/        ← Scaffolding for new agents
tools/            ← CLI scripts (validate, export, init, install)
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

### Legacy installers

The old platform-specific scripts (`instala.sh` for bash, `install.ps1` for PowerShell) still work but are deprecated. They now redirect to the unified Node.js installer.

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
Agents with `mode: subagent` appear in the **@** autocomplete menu (38 specialized agents).

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

Copilot reads `.github/copilot-instructions.md` automatically when it exists in the project. All 40 agents are included in a single file with `---` separators.

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
| 133 subagents | — | ✓ | Varies |

- **Tab** — Cycle: orchestrator → build → plan
- **@name** — Invoke any subagent (e.g., `@security`, `@testing`, `@docker`, `@flask`, `@react`, `@postgres`)
- Orchestrator is the default agent. It detects task type AND technologies from your prompt, then routes to the right specialist agents.

## Architecture

- **Orchestrator** (default agent) — receives all requests, detects task type and technologies, creates git flow branches, routes pipelines, communicates with the user
- **Subagents** (133) — specialized roles (language experts, frameworks, databases, infrastructure, testing, security, etc.)
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

# Low-level (node)
node install.mjs                      # Interactive installer (any platform)
node install.mjs --platform opencode --agent orchestrator -y
node tools/export.mjs --platform <name>   # Export agents for any platform
node tools/validate.mjs              # Validate all agent definitions
node tools/init-agent.mjs <name>     # Create a new agent from template
```

## Adapting to a new platform

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function receives `agents[]`, returns `[{path, content}]`
3. Run `node tools/export.mjs --platform <name>`

## opencode.json

Not committed to repo. Generate with `node install.mjs`, `node tools/export.mjs --platform opencode`, or `npx github:mjuliac/StaffForge-AI-Agent-Framework`.
