# Changelog

## [v1.3.0] — 2026-07-08

### Added
- Pipeline Executor: wires Router → Scheduler, supports dry-run mode
- Task Mapper: 6 task types → model profiles + prompt-based detection (8 profiles)
- Structured Logger: debug/info/warn/error levels via `STAFFFORGE_LOG_LEVEL`
- 7 new models: gpt-4.1-nano, claude-opus-4, gemini-2.5-pro, mistral-large, deepseek-coder-v2, qwen-2.5-72b, o3-mini
- Model Selection Layer: SelectionEngine, FallbackEngine, LearningEngine, ModelSelector
- Learning feedback loop: success-rate-adjusted weights in PipelineExecutor
- `run-pipeline.mjs` CLI runner: --task, --prompt, --model, --dry-run, --telemetry options
- GitHub Actions CI workflow (Node 18/20/22): validate + test + export all platforms
- GitHub Actions publish workflow: npm publish `@staffforge/cli` on tags
- License: MIT
- Security: command injection fix in install.mjs (execFileSync + platform whitelist)

### Changed
- Renamed Model Intelligence Layer → Model Selection Layer (selection-only, no LLM API calls)
- Pinned dependencies in tools/package.json (^ → ~) for deterministic installs
- .gitignore: `package-lock.json` → `/package-lock.json` (root only)
- Updated test count: 526 tests across 21 suites (was 462/18)

### Removed
- Legacy installers: setup.sh, instala.sh, install.ps1
- Deprecated migrate scripts and orphaned files
- RFC-001-RESPONSE.md, RFC-002-RESPONSE.md (plans fully implemented)

## [v1.2.0] — 2026-07-07

### Added
- Model Registry: load, query, search models from `models/*.yaml`
- Model Profiles: task-type → profile mapping with weighted scoring
- Model Discovery: auto-load adapters from `tools/lib/discovery/`
- Selection Engine: weighted scoring (profile fit, capabilities, priority, cost, reasoning)
- Fallback Engine: 4-level fallback chain (primary → same-provider → other-provider → free)
- Learning Engine: execution history tracking, success-rate-based ranking
- Model Selector facade: 4 strategies (intelligent, cheapest, fastest, free)
- 8 MIL test files (unit + integration + e2e)
- Telemetry: Collector, Storage (JSON Lines), Reporter (summary/markdown/JSON)
- Capability Engine: intent analysis, agent scoring by capability
- Router: resolveTask, buildPipeline, suggestAgents
- DAG: topological sort, cycle detection, parallel execution levels
- Scheduler: execution plan from agent IDs or Router pipeline

### Changed
- 15 model definitions → 22 (added 7 new)
- 0 tests → 462 tests across 19 suites

## [v1.1.0] — 2026-07-06

### Added
- Agent categories: core (8), technology (94), domain (23), utility (11)
- Adapter Registry: lazy-load, export to all 6 platforms
- Agent Registry: load, query, search, resolveDependencies
- Documentation Generator: catalog, capabilities, DAG, matrix, architecture
- Initial CI infrastructure

### Changed
- 0 → 201 tests across 9 suites
- Architecture documentation with validation baseline

## [v1.0.0] — 2026-07-05

### Added
- 136 agent definitions with YAML frontmatter
- 6 platform adapters: opencode, claude-code, cursor, copilot, aider, gemini-cli
- JSON Schema validation (agent.schema.json, model.schema.json)
- Installer: interactive and CLI modes (install.mjs)
- Export tool: export agents to any platform
- Init-agent: scaffolding for new agents
- ORCHESTRATOR_MATRIX.md: task → pipeline routing
- AGENTS.md: agent catalog and conventions

[v1.3.0]: https://github.com/mjuliac/StaffForge-AI-Agent-Framework/releases/tag/v1.3.0
[v1.2.0]: https://github.com/mjuliac/StaffForge-AI-Agent-Framework/releases/tag/v1.2.0
[v1.1.0]: https://github.com/mjuliac/StaffForge-AI-Agent-Framework/releases/tag/v1.1.0
[v1.0.0]: https://github.com/mjuliac/StaffForge-AI-Agent-Framework/releases/tag/v1.0.0
