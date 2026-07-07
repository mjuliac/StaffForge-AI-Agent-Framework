#!/usr/bin/env pwsh
#
# StaffForge AI Agent Framework
#
# This script is deprecated. It now redirects to the universal Node.js installer.
# See https://github.com/mjuliac/StaffForge-AI-Agent-Framework
#
$ErrorActionPreference = "Stop"
$Repo = "https://github.com/mjuliac/StaffForge-AI-Agent-Framework"

Write-Host ""
Write-Host "StaffForge AI Agent Framework" -ForegroundColor White
Write-Host ""
Write-Host "  → This script is deprecated." -ForegroundColor Green
Write-Host "  → Use the unified installer instead:" -ForegroundColor Green
Write-Host ""
Write-Host "    npx @staffforge/cli"
Write-Host ""
Write-Host "  Or run directly from the repo:" -ForegroundColor Green
Write-Host "    node install.mjs"
Write-Host ""

# Check for local repo (running from within the repo)
$localDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exportTool = Join-Path $localDir "tools\export.mjs"
if (Test-Path $exportTool) {
  Write-Host "  → Local StaffForge detected. Running installer..." -ForegroundColor Green
  & node (Join-Path $localDir "install.mjs") $args
  exit $LASTEXITCODE
}

# Check if running from repo root
if (Test-Path ".\tools\export.mjs") {
  Write-Host "  → Local StaffForge detected. Running installer..." -ForegroundColor Green
  & node ".\install.mjs" $args
  exit $LASTEXITCODE
}

# Try npx
try {
  Write-Host "  → Launching npx @staffforge/cli..." -ForegroundColor Green
  & npx @staffforge/cli $args
  exit $LASTEXITCODE
} catch {
  # Fallback: git clone
  Write-Host "  → npx not found. Cloning repo..." -ForegroundColor Cyan
  $tmpDir = Join-Path $env:TEMP "staffforge-$([System.IO.Path]::GetRandomFileName())"
  git clone --depth 1 --branch develop $Repo $tmpDir
  Push-Location $tmpDir
  try {
    & node "install.mjs" $args
  } finally {
    Pop-Location
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
  }
}
