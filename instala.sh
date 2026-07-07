#!/usr/bin/env bash
#
# StaffForge AI Agent Framework — remote installer
#
# Run from ANY project to install StaffForge agents:
#   curl -fsSL https://raw.githubusercontent.com/mjuliac/StaffForge-AI-Agent-Framework/develop/instala.sh | bash
#
set -euo pipefail

# ── Ensure interactive stdin (works with curl | bash) ──
# curl|bash leaves stdin connected to the pipe, causing read to hang.
# Try to redirect to terminal; fall back to timed reads if unavailable.
READ_OPTS=""
if ! [ -t 0 ]; then
  if (exec < /dev/tty) 2>/dev/null; then
    exec < /dev/tty
  else
    READ_OPTS="-t 3"
  fi
fi

REPO="https://github.com/mjuliac/StaffForge-AI-Agent-Framework"
BRANCH="develop"
TMP_DIR="/tmp/staffforge-$$"
USER_PROJECT="$(pwd)"

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo -e "${BOLD}StaffForge AI Agent Framework — Instalación remota${NC}"
echo ""

# ── Platform ──────────────────────────────────────────
echo "Selecciona la plataforma de IA:"
echo "  1) opencode      — OpenCode (recomendado)"
echo "  2) claude-code   — Claude Code"
echo "  3) cursor        — Cursor"
echo "  4) copilot       — GitHub Copilot"
echo "  5) aider         — Aider"
echo "  6) gemini-cli    — Gemini CLI"
echo "  7) all           — Todas las plataformas"
echo ""
read $READ_OPTS -rp "? Plataforma [1]: " platform_choice

case "$platform_choice" in
  2|claude-code) PLATFORM="claude-code" ;;
  3|cursor)      PLATFORM="cursor" ;;
  4|copilot)     PLATFORM="copilot" ;;
  5|aider)       PLATFORM="aider" ;;
  6|gemini-cli)  PLATFORM="gemini-cli" ;;
  7|all)         PLATFORM="all" ;;
  *)             PLATFORM="opencode" ;;
esac

# ── Default agent ─────────────────────────────────────
echo ""
echo "Selecciona el agente por defecto:"
echo "  1) orchestrator  — coordina trabajo, crea ramas git flow, ejecuta pipelines"
echo "  2) build         — acceso completo a herramientas"
echo "  3) plan          — solo lectura (análisis y planificación)"
echo ""
read $READ_OPTS -rp "? Agente por defecto [1]: " agent_choice

case "$agent_choice" in
  2|build) DEFAULT_AGENT="build" ;;
  3|plan)  DEFAULT_AGENT="plan" ;;
  *)       DEFAULT_AGENT="orchestrator" ;;
esac

# ── Location ──────────────────────────────────────────
echo ""
echo "¿Dónde quieres instalar la configuración?"
echo "  1) En este proyecto  (./staffforge/)"
echo "  2) Global            (~/.config/staffforge/)"
echo ""
read $READ_OPTS -rp "? Ubicación [1]: " loc_choice

if [ "$loc_choice" = "2" ]; then
  INSTALL_DIR="$HOME/.config/staffforge"
else
  INSTALL_DIR="${USER_PROJECT}/staffforge"
fi

# ── Obtain framework code ─────────────────────────────
if [ -f "tools/export.mjs" ]; then
  FRAMEWORK_DIR="$USER_PROJECT"
  echo -e "${BLUE}→ Usando StaffForge local${NC}"
else
  FRAMEWORK_DIR="$TMP_DIR"
  echo -e "${BLUE}→ Descargando StaffForge desde ${REPO}...${NC}"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$FRAMEWORK_DIR"
  echo -e "${BLUE}→ Instalando dependencias...${NC}"
  (cd "$FRAMEWORK_DIR" && npm install --silent)
fi

cd "$FRAMEWORK_DIR"

# ── Export ────────────────────────────────────────────
install_platform() {
  local platform="$1"
  local out_dir="$2"
  echo -e "${BLUE}→ Exportando para ${platform}...${NC}"
  mkdir -p "$out_dir"
  case "$platform" in
    opencode)    node tools/install.mjs --agent "$DEFAULT_AGENT" --out "$out_dir" ;;
    claude-code) node tools/export.mjs --platform claude-code --out "$out_dir" ;;
    cursor)      node tools/export.mjs --platform cursor --out "$out_dir" ;;
    copilot)     node tools/export.mjs --platform copilot --out "$out_dir" ;;
    aider)       node tools/export.mjs --platform aider --out "$out_dir" ;;
    gemini-cli)  node tools/export.mjs --platform gemini-cli --out "$out_dir" ;;
  esac
}

mkdir -p "$INSTALL_DIR"

if [ "$PLATFORM" = "all" ]; then
  for p in opencode claude-code cursor copilot aider gemini-cli; do
    install_platform "$p" "${INSTALL_DIR}/${p}"
  done
  echo ""
  echo -e "${GREEN}✓ Todas las plataformas instaladas en:${NC}  ${INSTALL_DIR}/"
  echo ""
  echo "  Para usar con OpenCode directamente:"
  echo "    ln -s ${INSTALL_DIR}/opencode/opencode.json ${USER_PROJECT}/opencode.json"
  echo "    opencode"
  echo ""
  echo "  Para copiar a otras plataformas desde ${INSTALL_DIR}/:"
  echo "    cp -r ${INSTALL_DIR}/claude-code/*  ${USER_PROJECT}/.claude/"
  echo "    cp -r ${INSTALL_DIR}/cursor/.cursor ${USER_PROJECT}/"
  echo "    cp -r ${INSTALL_DIR}/copilot/.github ${USER_PROJECT}/"
  echo "    cp    ${INSTALL_DIR}/aider/.aider.rules.md ${USER_PROJECT}/"
  echo "    cp -r ${INSTALL_DIR}/gemini-cli/.gemini ${USER_PROJECT}/"
else
  install_platform "$PLATFORM" "$INSTALL_DIR"
  echo ""
  echo -e "${GREEN}✓ StaffForge instalado para ${PLATFORM}${NC}"

  # Copy files to project root (NOT symlink — so staffforge/ can be cleaned up)
  case "$PLATFORM" in
    opencode)
      cp "${INSTALL_DIR}/opencode.json" "${USER_PROJECT}/opencode.json"
      echo -e "  ${GREEN}✓${NC} opencode.json copiado a ${USER_PROJECT}/"
      echo ""
      echo "  Ahora ejecuta: opencode"
      ;;
    copilot)
      mkdir -p "${USER_PROJECT}/.github"
      cp "${INSTALL_DIR}/.github/copilot-instructions.md" "${USER_PROJECT}/.github/copilot-instructions.md"
      echo -e "  ${GREEN}✓${NC} .github/copilot-instructions.md copiado"
      ;;
    cursor)
      rm -rf "${USER_PROJECT}/.cursor/rules" 2>/dev/null
      mkdir -p "${USER_PROJECT}/.cursor"
      cp -r "${INSTALL_DIR}/.cursor/rules" "${USER_PROJECT}/.cursor/"
      echo -e "  ${GREEN}✓${NC} .cursor/rules/ copiado"
      ;;
    aider)
      cp "${INSTALL_DIR}/.aider.rules.md" "${USER_PROJECT}/.aider.rules.md"
      echo -e "  ${GREEN}✓${NC} .aider.rules.md copiado"
      ;;
    gemini-cli)
      rm -rf "${USER_PROJECT}/.gemini" 2>/dev/null
      cp -r "${INSTALL_DIR}/.gemini" "${USER_PROJECT}/"
      echo -e "  ${GREEN}✓${NC} .gemini/ copiado"
      ;;
    claude-code)
      cp "${INSTALL_DIR}/CLAUDE.md" "${USER_PROJECT}/CLAUDE.md"
      rm -rf "${USER_PROJECT}/.claude/rules" 2>/dev/null
      mkdir -p "${USER_PROJECT}/.claude"
      cp -r "${INSTALL_DIR}/.claude/rules" "${USER_PROJECT}/.claude/"
      echo -e "  ${GREEN}✓${NC} CLAUDE.md + .claude/rules/ copiados"
      ;;
  esac

  # ── Cleanup: remove staffforge/ and instala.sh on project-level install ──
  if [[ "$INSTALL_DIR" == "$USER_PROJECT"* ]]; then
    echo ""
    echo -e "${BLUE}→ Limpiando archivos temporales...${NC}"
    rm -rf "$INSTALL_DIR"
    rm -f "${USER_PROJECT}/instala.sh" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Limpieza completada"
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}✓ Instalación completada.${NC}"
cd "$USER_PROJECT"
