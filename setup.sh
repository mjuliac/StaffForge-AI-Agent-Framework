#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/mjuliac/StaffForge-AI-Agent-Framework"
BRANCH="develop"
DIR="StaffForge-AI-Agent-Framework"

# Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BOLD}StaffForge AI Agent Framework — Setup${NC}"
echo ""

# ── Clone ──────────────────────────────────────────────
if [ ! -d "$DIR" ]; then
  echo -e "${BLUE}→ Cloning repo from ${REPO}${NC}"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$DIR"
  cd "$DIR"
else
  echo -e "${BLUE}→ Using existing ${DIR}${NC}"
  cd "$DIR"
  git pull origin "$BRANCH"
fi

# ── Install dependencies ───────────────────────────────
echo -e "${BLUE}→ Installing dependencies...${NC}"
npm install

# ── Installer ──────────────────────────────────────────
echo ""
echo -e "${BOLD}Select default agent mode:${NC}"
echo "  1) orchestrator  (default) — coordinates work, creates branches, routes pipelines"
echo "  2) build         — full tool access (edit, bash, write)"
echo "  3) plan          — read-only mode (analysis and planning)"
echo ""
read -rp "? Default agent [1]: " choice

case "$choice" in
  2|build)   AGENT="build" ;;
  3|plan)    AGENT="plan" ;;
  *)         AGENT="orchestrator" ;;
esac

echo ""
echo -e "${BLUE}→ Running installer (default: ${AGENT})...${NC}"
node tools/install.mjs --agent "$AGENT"

# ── Done ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}✓ StaffForge installed successfully${NC}"
echo ""
echo "  Next steps:"
echo "    cd ${DIR}"
echo "    opencode"
echo ""
echo "  Or export to other platforms:"
echo "    npm run export:claude"
echo "    npm run export:cursor"
echo "    npm run export:copilot"
echo "    npm run export:aider"
echo "    npm run export:gemini"
echo ""

