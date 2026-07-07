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
$ConfigFile = Join-Path $UserProject ".staffforge-install.json"

Write-Host "StaffForge AI Agent Framework — Remote Installation (Windows)" -ForegroundColor White
Write-Host ""

# ── Detect previous installation ──────────────────────
if (Test-Path $ConfigFile) {
  $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
  Write-Host "→ Previous installation detected: $($config.platform) (agent: $($config.defaultAgent))" -ForegroundColor Cyan
  $reinstall = Read-Host "  Reinstall with same settings? [Y/n]"
  if ($reinstall -notin @("n","N","no")) {
    Write-Host "→ Reusing previous configuration" -ForegroundColor Cyan
    $Platform = $config.platform
    $DefaultAgent = $config.defaultAgent
    $InstallDir = $config.installDir
    $SkipPrompts = $true
  }
}

if (-not $SkipPrompts) {
  # ── Platform ──────────────────────────────────────────
  Write-Host "Select the AI platform:"
  Write-Host "  1) opencode      — OpenCode (recommended)"
  Write-Host "  2) claude-code   — Claude Code"
  Write-Host "  3) cursor        — Cursor"
  Write-Host "  4) copilot       — GitHub Copilot"
  Write-Host "  5) aider         — Aider"
  Write-Host "  6) gemini-cli    — Gemini CLI"
  Write-Host "  7) all           — All platforms"
  Write-Host ""
  $platformChoice = Read-Host "? Platform [1]"

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
  Write-Host "Select the default agent:"
  Write-Host "  1) orchestrator  — coordinates work, creates git flow branches, executes pipelines"
  Write-Host "  2) build         — full tool access"
  Write-Host "  3) plan          — read-only (analysis and planning)"
  Write-Host ""
  $agentChoice = Read-Host "? Default agent [1]"

  switch -Wildcard ($agentChoice) {
    "2*" { $DefaultAgent = "build" }
    "3*" { $DefaultAgent = "plan" }
    default { $DefaultAgent = "orchestrator" }
  }

  # ── Location ──────────────────────────────────────────
  Write-Host ""
  Write-Host "Where do you want to install the configuration?"
  Write-Host "  1) In this project  (.\staffforge\)"
  Write-Host "  2) Global           ($env:LOCALAPPDATA\staffforge\)"
  Write-Host ""
  $locChoice = Read-Host "? Location [1]"

  if ($locChoice -eq "2") {
    $InstallDir = "$env:LOCALAPPDATA\staffforge"
  } else {
    $InstallDir = Join-Path $UserProject "staffforge"
  }
}

# ── Download ──────────────────────────────────────────
Write-Host ""
Write-Host "→ Downloading StaffForge..." -ForegroundColor Cyan
git clone --depth 1 --branch $Branch $Repo $TmpDir 2>&1 | Out-Null
Push-Location $TmpDir

Write-Host "→ Installing dependencies..." -ForegroundColor Cyan
npm install --silent 2>&1 | Out-Null

# ── Export ────────────────────────────────────────────
function Install-Platform {
  param([string]$platform, [string]$outDir)
  Write-Host "→ Exporting for $platform..." -ForegroundColor Cyan
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
  Write-Host "✓ All platforms installed at: $InstallDir" -ForegroundColor Green
  Write-Host ""
  Write-Host "  To copy to your project:"
  Write-Host "    Copy-Item -Recurse $InstallDir\claude-code\*  .claude\"
  Write-Host "    Copy-Item -Recurse $InstallDir\cursor\.cursor ."
  Write-Host "    Copy-Item -Recurse $InstallDir\copilot\.github ."
  Write-Host "    Copy-Item           $InstallDir\aider\.aider.rules.md ."
  Write-Host "    Copy-Item -Recurse $InstallDir\gemini-cli\.gemini ."
} else {
  Install-Platform $Platform $InstallDir
  Write-Host ""
  Write-Host "✓ StaffForge installed for $Platform" -ForegroundColor Green

  # Copy files to project root (not symlink — so staffforge/ can be cleaned up)
  switch ($Platform) {
    "opencode" {
      $src = Join-Path $InstallDir "opencode.json"
      $dst = Join-Path $UserProject "opencode.json"
      Copy-Item -Force $src $dst
      Write-Host "  ✓ opencode.json copied" -ForegroundColor Green
      Write-Host ""
      Write-Host "  Now run: opencode"
    }
    "copilot" {
      $src = Join-Path $InstallDir ".github\copilot-instructions.md"
      $dstDir = Join-Path $UserProject ".github"
      New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
      Copy-Item -Force $src (Join-Path $dstDir "copilot-instructions.md")
      Write-Host "  ✓ .github\copilot-instructions.md copied" -ForegroundColor Green
    }
    "cursor" {
      $src = Join-Path $InstallDir ".cursor\rules"
      $dstDir = Join-Path $UserProject ".cursor"
      New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
      $dst = Join-Path $dstDir "rules"
      Remove-Item -Recurse -Force $dst -ErrorAction SilentlyContinue
      Copy-Item -Recurse -Force $src $dst
      Write-Host "  ✓ .cursor\rules\ copied" -ForegroundColor Green
    }
    "aider" {
      $src = Join-Path $InstallDir ".aider.rules.md"
      $dst = Join-Path $UserProject ".aider.rules.md"
      Copy-Item -Force $src $dst
      Write-Host "  ✓ .aider.rules.md copied" -ForegroundColor Green
    }
    "gemini-cli" {
      $src = Join-Path $InstallDir ".gemini"
      $dst = Join-Path $UserProject ".gemini"
      Remove-Item -Recurse -Force $dst -ErrorAction SilentlyContinue
      Copy-Item -Recurse -Force $src $dst
      Write-Host "  ✓ .gemini\ copied" -ForegroundColor Green
    }
    "claude-code" {
      $src = Join-Path $InstallDir "CLAUDE.md"
      $dst = Join-Path $UserProject "CLAUDE.md"
      Copy-Item -Force $src $dst
      $srcRules = Join-Path $InstallDir ".claude\rules"
      $dstDir = Join-Path $UserProject ".claude"
      New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
      $dstRules = Join-Path $dstDir "rules"
      Remove-Item -Recurse -Force $dstRules -ErrorAction SilentlyContinue
      Copy-Item -Recurse -Force $srcRules $dstRules
      Write-Host "  ✓ CLAUDE.md + .claude\rules\ copied" -ForegroundColor Green
    }
  }

  # Save config for future updates
  $config = @{
    platform     = $Platform
    defaultAgent = $DefaultAgent
    installDir   = $InstallDir
  } | ConvertTo-Json -Compress
  Set-Content -Path $ConfigFile -Value $config -Force

  # Cleanup staffforge/ on project-level install
  if ($InstallDir.StartsWith($UserProject)) {
    Write-Host ""
    Write-Host "→ Cleaning up temporary files..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
    $scriptPath = Join-Path $UserProject "install.ps1"
    Remove-Item -Force $scriptPath -ErrorAction SilentlyContinue
    Write-Host "✓ Cleanup complete" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "✓ Installation complete." -ForegroundColor Green

Pop-Location
Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
