# Export examples

```bash
# List platforms
node tools/export.mjs --help

# --- Direct export (outputs to adapters/<platform>/output/) ---

# OpenCode — generates opencode.json
node tools/export.mjs --platform opencode

# Claude Code — generates CLAUDE.md + .claude/rules/*.md
node tools/export.mjs --platform claude-code

# Cursor — generates .cursor/rules/*.mdc
node tools/export.mjs --platform cursor

# GitHub Copilot — generates .github/copilot-instructions.md
node tools/export.mjs --platform copilot

# Aider — generates .aider.rules.md
node tools/export.mjs --platform aider

# Gemini CLI — generates .gemini/*.md
node tools/export.mjs --platform gemini-cli

# --- Export with custom output directory ---

node tools/export.mjs --platform claude-code --out ~/my-project/
node tools/export.mjs --platform opencode --out ~/my-project/

# --- Interactive installer (OpenCode only) ---

node tools/install.mjs

# --- Non-interactive installer ---

node tools/install.mjs --agent orchestrator
node tools/install.mjs --agent build
node tools/install.mjs --agent plan

# --- Copy to project root (for non-OpenCode platforms) ---

# Claude Code
cp -r adapters/claude-code/output/* .

# Cursor
cp -r adapters/cursor/output/.cursor .

# GitHub Copilot
cp -r adapters/copilot/output/.github .

# Aider
cp adapters/aider/output/.aider.rules.md .

# Gemini CLI
cp -r adapters/gemini-cli/output/.gemini .
```
