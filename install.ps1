#!/usr/bin/env pwsh
#
# StaffForge AI Agent Framework — remote installer for Windows
#
# Run from ANY project:
#   iwr -useb https://raw.githubusercontent.com/mjuliac/StaffForge-AI-Agent-Framework/develop/install.ps1 | iex
#
param()

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/mjuliac/StaffForge-AI-Agent-Framework"
$Branch = "develop"
$UserProject = Get-Location
$TmpDir = Join-Path $env:TEMP "staffforge-$([System.IO.Path]::GetRandomFileName())"

Write-Host "StaffForge AI Agent Framework — Instalación remota (Windows)" -ForegroundColor White
Write-Host ""

# ── Platform ──────────────────────────────────────────
Write-Host "Selecciona la plataforma de IA:"
Write-Host "  1) opencode      — OpenCode (recomendado)"
Write-Host "  2) claude-code   — Claude Code"
Write-Host "  3) cursor        — Cursor"
Write-Host "  4) copilot       — GitHub Copilot"
Write-Host "  5) aider         — Aider"
Write-Host "  6) gemini-cli    — Gemini CLI"
Write-Host "  7) all           — Todas las plataformas"
Write-Host ""
$platformChoice = Read-Host "? Plataforma [1]"

switch -Wildcard ($platformChoice) {
  "2*" { $Platform = "claude-code" }
  "3*" { $Platform = "cursor" }
  "4*" { $Platform = "copilot" }
  "5*" { $Platform = "aider" }
  "6*" { $Platform = "gemini-cli" }
  "7*" { $Platform = "all" }
  default { $Platform = "opencode" }
}

# ── Default agent ─────────────────────────────────────
Write-Host ""
Write-Host "Selecciona el agente por defecto:"
Write-Host "  1) orchestrator  — coordina trabajo, crea ramas git flow, ejecuta pipelines"
Write-Host "  2) build         — acceso completo a herramientas"
Write-Host "  3) plan          — solo lectura (análisis y planificación)"
Write-Host ""
$agentChoice = Read-Host "? Agente por defecto [1]"

switch -Wildcard ($agentChoice) {
  "2*" { $DefaultAgent = "build" }
  "3*" { $DefaultAgent = "plan" }
  default { $DefaultAgent = "orchestrator" }
}

# ── Location ──────────────────────────────────────────
Write-Host ""
Write-Host "¿Dónde quieres instalar la configuración?"
Write-Host "  1) En este proyecto  (.\staffforge\)"
Write-Host "  2) Global            ($env:LOCALAPPDATA\staffforge\)"
Write-Host ""
$locChoice = Read-Host "? Ubicación [1]"

if ($locChoice -eq "2") {
  $InstallDir = "$env:LOCALAPPDATA\staffforge"
} else {
  $InstallDir = Join-Path $UserProject "staffforge"
}

# ── Download ──────────────────────────────────────────
Write-Host ""
Write-Host "→ Descargando StaffForge..." -ForegroundColor Cyan
git clone --depth 1 --branch $Branch $Repo $TmpDir 2>&1 | Out-Null
Push-Location $TmpDir

Write-Host "→ Instalando dependencias..." -ForegroundColor Cyan
npm install --silent 2>&1 | Out-Null

# ── Export ────────────────────────────────────────────
function Install-Platform {
  param([string]$platform, [string]$outDir)
  Write-Host "→ Exportando para $platform..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  switch ($platform) {
    "opencode"    { node tools/install.mjs --agent $DefaultAgent --out $outDir }
    "claude-code" { node tools/export.mjs --platform claude-code --out $outDir }
    "cursor"      { node tools/export.mjs --platform cursor --out $outDir }
    "copilot"     { node tools/export.mjs --platform copilot --out $outDir }
    "aider"       { node tools/export.mjs --platform aider --out $outDir }
    "gemini-cli"  { node tools/export.mjs --platform gemini-cli --out $outDir }
  }
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

if ($Platform -eq "all") {
  foreach ($p in @("opencode","claude-code","cursor","copilot","aider","gemini-cli")) {
    Install-Platform $p (Join-Path $InstallDir $p)
  }

  Write-Host ""
  Write-Host "✓ Todas las plataformas instaladas en: $InstallDir" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Para copiar a tu proyecto:"
  Write-Host "    Copy-Item -Recurse $InstallDir\claude-code\*  .claude\"
  Write-Host "    Copy-Item -Recurse $InstallDir\cursor\.cursor ."
  Write-Host "    Copy-Item -Recurse $InstallDir\copilot\.github ."
  Write-Host "    Copy-Item           $InstallDir\aider\.aider.rules.md ."
  Write-Host "    Copy-Item -Recurse $InstallDir\gemini-cli\.gemini ."
} else {
  Install-Platform $Platform $InstallDir
  Write-Host ""
  Write-Host "✓ StaffForge instalado para $Platform" -ForegroundColor Green

  if ($Platform -eq "opencode") {
    $opencodeJson = Join-Path $InstallDir "opencode.json"
    $opencodeLink = Join-Path $UserProject "opencode.json"
    if (Test-Path $opencodeJson) {
      New-Item -ItemType SymbolicLink -Path $opencodeLink -Target $opencodeJson -Force | Out-Null
      Write-Host "  ✓ Enlace creado: $opencodeLink → $opencodeJson" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "  Ahora ejecuta: opencode"
  }
}

Write-Host ""
Write-Host "Hecho. Los agentes están en: $InstallDir" -ForegroundColor White

Pop-Location
Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
