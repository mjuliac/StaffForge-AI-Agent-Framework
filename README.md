# StaffForge AI Agent Framework

Multi-provider agent framework. Write agents once, deploy anywhere.

```
agents/           ← Canonical agent definitions (Markdown + frontmatter)
adapters/         ← Platform-specific exporters (OpenCode, Claude Code, Cursor, etc.)
schemas/          ← JSON Schema for agent validation
templates/        ← Scaffolding for new agents
tools/            ← CLI scripts (validate, export, init)
examples/         ← Usage examples
docs/             ← Guides
```

## Quick start

```bash
# Install dependencies
cd tools && npm install

# Run interactive installer (recommended)
node tools/install.mjs

# Or export directly
node tools/export.mjs --platform opencode

# Create a new agent
node tools/init-agent.mjs my-new-agent
```

## Installation

### Interactive installer

```bash
node tools/install.mjs
```

This will:
1. Ask you to select a default agent (build or plan)
2. Export all agents for OpenCode
3. Generate `opencode.json` in your current directory

### Non-interactive

```bash
# Set build as default (full tool access)
node tools/install.mjs --agent build

# Set plan as default (read-only mode)
node tools/install.mjs --agent plan

# Export to specific directory
node tools/install.mjs --agent build --out ~/my-project
```

### Agent modes

After installation, use **Tab** to switch between agent modes:

| Mode | Description | Permissions |
|------|-------------|-------------|
| **build** | Full tool access | Edit, bash, write enabled |
| **plan** | Read-only mode | Analysis and planning only |

- **Tab** - Switch between build and plan modes
- **Shift+Tab** - Switch in reverse order

## Architecture

- **Orchestrator** — owns user communication and Git Flow
- **Subagents** — specialized roles (architect, security, testing, etc.)
- **Only the orchestrator** may talk to the user, write files, or manage git

## Routing

See `ORCHESTRATOR_MATRIX.md` for task → pipeline mapping.

## Supported platforms

| Adapter | Output |
|---------|--------|
| OpenCode | `opencode.json` |
| Claude Code | `CLAUDE.md` + `.claude/rules/` |
| Cursor | `.cursor/rules/*.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Aider | `.aider.rules.md` |
| Gemini CLI | `.gemini/*.md` |
