---
name: customize-opencode
description: "Use ONLY when the user is editing or creating opencode's own configuration: opencode.json, opencode.jsonc, files under .opencode/, or files under ~/.config/opencode/. Also use when creating or fixing opencode agents, subagents, skills, plugins, MCP servers, or permission rules."
version: 1.0.0
keywords: [opencode, config, agent, skill, plugin, mcp, permission]
globs: [opencode.json, opencode.jsonc, .opencode/**]
compatible_platforms: [opencode]
author: StaffForge
---
# Customize OpenCode

Use ONLY when the user is editing or creating opencode's own configuration.

## Scope

This skill applies when working with:

- `opencode.json` / `opencode.jsonc` — main configuration files
- `.opencode/` — project-level opencode directory
- `~/.config/opencode/` — user-level opencode configuration
- OpenCode agents, subagents, skills, plugins, MCP servers
- Permission rules

## Rules

1. Always validate JSON syntax before saving configuration files
2. Reference the official OpenCode schema: `https://opencode.ai/config.json`
3. Agents must define: `description`, `mode` (primary/subagent/all), `permission` (edit/bash)
4. Skills must be placed under `.opencode/skills/<name>.md`
5. Plugin/MCP server configs follow the OpenCode plugin specification

## Examples

```json
{
  "default_agent": "Orchestrator",
  "agent": {
    "MyAgent": {
      "description": "Custom agent role",
      "mode": "subagent",
      "permission": { "edit": "deny", "bash": "deny" }
    }
  },
  "skills": {
    "paths": [".opencode/skills"]
  }
}
```
