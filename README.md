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

### Desde tu proyecto — macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/mjuliac/StaffForge-AI-Agent-Framework/develop/instala.sh | bash
```

El script te guía: seleccionas plataforma, agente por defecto, ubicación (proyecto o global), descarga el framework y exporta los agentes. Para OpenCode crea automáticamente el enlace `opencode.json`.

```bash
# Tras la instalación:
opencode
```

### Desde tu proyecto — Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/mjuliac/StaffForge-AI-Agent-Framework/develop/install.ps1 | iex
```

Mismo flujo interactivo. La ubicación global usa `$env:LOCALAPPDATA\staffforge\`.

### Clonando el repositorio (cualquier SO)

```bash
git clone --depth 1 https://github.com/mjuliac/StaffForge-AI-Agent-Framework.git
cd StaffForge-AI-Agent-Framework
npm install
npm run setup      # instalador interactivo (OpenCode)
opencode
```

### Exportar a otras plataformas (tras clonar)

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
node tools/install.mjs
```

This runs the **OpenCode** export and copies `opencode.json` to the project root. You can also set the default agent:

```bash
node tools/install.mjs --agent orchestrator   # default, coordinates all work
node tools/install.mjs --agent build          # full tool access
node tools/install.mjs --agent plan           # read-only mode
node tools/install.mjs --agent build --out ~/my-project
```

## Agent modes

| Mode | Tab cycle | @ mention | Permissions |
|------|-----------|-----------|-------------|
| **orchestrator** | ✓ default | ✓ | Full tools |
| **build** | ✓ | ✓ | Full tools |
| **plan** | ✓ | ✓ | Read-only |
| 38 subagents | — | ✓ | Varies |

- **Tab** — Cycle: orchestrator → build → plan
- **@name** — Invoke any subagent (e.g., `@security`, `@testing`, `@docker`)
- Orchestrator is the default agent. It detects task type from your prompt, creates a git flow branch, then executes the pipeline.

## Architecture

- **Orchestrator** (default agent) — receives all requests, detects task type, creates git flow branches, routes pipelines, communicates with the user
- **Subagents** (38) — specialized roles (architect, security, testing, docker, etc.)
- **Only the orchestrator** may talk to the user, write files, or manage git
- Subagents run in **parallel** when they have no dependency on each other (DAG-based execution)

## Routing

See `ORCHESTRATOR_MATRIX.md` for task → pipeline mapping with parallel execution groups.

## Commands

```bash
# Root-level (npm)
npm install              # Install all dependencies (tools/ included)
npm run setup            # Interactive OpenCode installer
npm run export:opencode  # Export to OpenCode
npm run export:claude    # Export to Claude Code
npm run export:cursor    # Export to Cursor
npm run export:copilot   # Export to GitHub Copilot
npm run export:aider     # Export to Aider
npm run export:gemini    # Export to Gemini CLI
npm run validate         # Validate all agents

# Low-level (node)
node tools/export.mjs --platform <name>   # Export agents for any platform
node tools/install.mjs           # Interactive OpenCode installer
node tools/validate.mjs          # Validate all 40 agent definitions
node tools/init-agent.mjs <name> # Create a new agent from template
```

## Adapting to a new platform

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function receives `agents[]`, returns `[{path, content}]`
3. Run `node tools/export.mjs --platform <name>`

## opencode.json

Not committed to repo. Generate with `node tools/export.mjs --platform opencode` or `node tools/install.mjs`.
