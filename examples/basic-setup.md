# Basic setup

## 1. Install

```bash
npx github:mjuliac/StaffForge-AI-Agent-Framework
```

Follow the prompts to select:
- **Default agent:** orchestrator (recommended)
- **Platform:** opencode (or your preferred tool)
- **Output:** project root

## 2. Platform-specific setup

### OpenCode

```bash
node install.mjs --platform opencode
```

This generates `opencode.json`. OpenCode reads it automatically.

### Claude Code

```bash
node install.mjs --platform claude-code
```

Generates `.claude/` rules and `CLAUDE.md`.

## 3. Verify

```bash
npm run validate   # Check all agents
npm test           # Run all tests
```

## 4. Use

Open your AI coding tool (OpenCode, Claude Code, Cursor, etc.).
Type `@` to invoke any subagent: `@python`, `@react`, `@docker`, `@security`.
The orchestrator routes requests to the right specialist automatically.
