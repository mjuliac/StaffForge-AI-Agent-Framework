#!/usr/bin/env pwsh
param(
  [string]$Agent = "orchestrator"
)

$Repo = "https://github.com/mjuliac/StaffForge-AI-Agent-Framework"
$Branch = "develop"
$Dir = "StaffForge-AI-Agent-Framework"

Write-Host "StaffForge AI Agent Framework — Setup" -ForegroundColor White

# ── Clone ──
if (-not (Test-Path $Dir)) {
  Write-Host "→ Cloning repo from $Repo" -ForegroundColor Cyan
  git clone --depth 1 --branch $Branch $Repo $Dir
  Set-Location $Dir
} else {
  Write-Host "→ Using existing $Dir" -ForegroundColor Cyan
  Set-Location $Dir
  git pull origin $Branch
}

# ── Install dependencies ──
Write-Host "→ Installing dependencies..." -ForegroundColor Cyan
npm install

# ── Interactive agent selection ──
if ($args.Count -eq 0) {
  Write-Host ""
  Write-Host "Select default agent mode:" -ForegroundColor White
  Write-Host "  1) orchestrator  (default) — coordinates work, creates branches, routes pipelines"
  Write-Host "  2) build         — full tool access (edit, bash, write)"
  Write-Host "  3) plan          — read-only mode (analysis and planning)"
  $choice = Read-Host "? Default agent [1]"

  $Agent = switch ($choice) {
    "2" { "build" }
    "3" { "plan" }
    default { "orchestrator" }
  }
}

# ── Installer ──
Write-Host "→ Running installer (default: $Agent)..." -ForegroundColor Cyan
node tools/install.mjs --agent $Agent

# ── Done ──
Write-Host ""
Write-Host "✓ StaffForge installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "    cd $Dir"
Write-Host "    opencode"
Write-Host ""
Write-Host "  Or export to other platforms:" -ForegroundColor White
Write-Host "    npm run export:claude"
Write-Host "    npm run export:cursor"
Write-Host "    npm run export:copilot"
Write-Host "    npm run export:aider"
Write-Host "    npm run export:gemini"

