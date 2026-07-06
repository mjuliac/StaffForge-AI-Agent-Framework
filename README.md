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
# Validate all agents
node tools/validate.mjs

# Export for your platform
node tools/export.mjs --platform opencode

# Create a new agent
node tools/init-agent.mjs my-new-agent
```

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
