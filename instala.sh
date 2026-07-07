#!/usr/bin/env bash
#
# StaffForge AI Agent Framework
#
# This script is deprecated. It now redirects to the universal Node.js installer.
# See https://github.com/mjuliac/StaffForge-AI-Agent-Framework
#
set -euo pipefail
REPO="https://github.com/mjuliac/StaffForge-AI-Agent-Framework"
BOLD='\033[1m'; GREEN='\033[0;32m'; NC='\033[0m'

echo ""
echo -e "${BOLD}StaffForge AI Agent Framework${NC}"
echo ""
echo -e "  ${GREEN}→${NC} This script is deprecated."
echo -e "  ${GREEN}→${NC} Use the unified installer instead:"
echo ""
echo "    npx @staffforge/cli"
echo ""
echo "  Or run directly from the repo:"
echo "    node install.mjs"
echo ""

# ── Detect local repo ──
if [ -f "$(dirname "$0")/tools/export.mjs" ] || [ -f "./tools/export.mjs" ]; then
  LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
  echo -e "  ${GREEN}→${NC} Local StaffForge detected. Running installer..."
  echo ""
  node "${LOCAL_DIR}/install.mjs" "$@"
  exit $?
fi

# ── Check for npx ──
if command -v npx &>/dev/null; then
  echo -e "  ${GREEN}→${NC} Launching npx @staffforge/cli..."
  echo ""
  npx @staffforge/cli "$@"
  exit $?
fi

# ── Fallback: git clone + run ──
echo -e "  ${GREEN}→${NC} npx not found. Cloning repo..."
TMP_DIR="/tmp/staffforge-$$"
trap 'rm -rf "$TMP_DIR"' EXIT
git clone --depth 1 --branch develop "$REPO" "$TMP_DIR"
cd "$TMP_DIR"
node install.mjs "$@"
