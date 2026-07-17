# Changelog

## [v2.6.0] — 2026-07-17

### Added
- C.R.E.A.D.O. methodology compliance: all 6 components (Contexto, Restricciones, Especificación, Audiencia, Datos de entrada, Output) in agent definitions
- Three-layer Guardrails system: Input (sanitization, schema validation), Runtime (recursion limits, token budgets), Output (format validation, DLP, hallucination filter)
- `input_schema` and `output_schema` fields in agent frontmatter (JSON Schema validation)
- Guardrails enforcement in orchestrator: max_iterations, token budgets, pre-flight input validation, post-flight output scanning
- Compressed Context Block with GUARDRAILS section for audit trail

### Changed
- Agent template (`templates/agent.md`) redesigned with full C.R.E.A.D.O. structure
- `technology-agent.md` base template updated with C.R.E.A.D.O. + Guardrails defaults
- All 4 domain base templates (backend, frontend, database, devops) updated for C.R.E.A.D.O.
- 10 critical pipeline agents rewritten (orchestrator, prompt-base, requirements, architect, knowledge, impact-analysis, code-review, documentation, debugging, testing)
- Agent schema (`schemas/agent.schema.json`) updated with reinforced `input_schema` and `output_schema`
- Version bumped from 2.5.0 → 2.6.0 across all files

### Fixed
- Missing Audiencia (audience) specification in all agents
- Missing Datos de entrada (input data format) in all agents
- Missing Output format structure in ~140 agents
- Missing Guardrails at all 3 layers (input, runtime, output)
- Missing anti-hallucination cross-validation between pipeline agents

## [v2.5.0] — 2026-07-09

### Added
- Community Dashboard: Web UI for agents, pipelines, models
- Git pre-flight checks for missing repo and remote setup
- ZERO TOLERANCE git flow rules in orchestrator documentation

### Fixed
- Git flow bootstrap: create main + develop branch structure
- Git: rename master → main after git init
- Git: add remote guard to pull commands
- Hoist workspace deps to root package.json for npx compatibility
- Install workspace deps on npx invocation to resolve @staffforge/core
- Remove postinstall npm install --workspaces that hangs npx github install

### Changed
- Install system tests: 0→95

## [v2.3.0] — 2026-07-09

### Added
- Remote Registry: server, client, loader, CLI

### Fixed
- Marketplace loader recursion, learning storage default, enterprise files

## [v2.2.0] — 2026-07-08

### Changed
- Release tracking tag (no substantive changes)

## [v2.1.0] — 2026-07-08

### Added
- Plugin manager with 12 lifecycle hooks
- Enterprise SQLite storage
- Marketplace CLI

### Fixed
- Restrict full permissions to orchestrator only
- Agent governance validation

## [v2.0.1] — 2026-07-08

### Fixed
- Restrict full permissions to orchestrator, validate agent governance
- Resolve default_agent by id 'orchestrator' (case-insensitive)

## [v2.0.0] — 2026-07-08

### Added
- Monorepo architecture: @staffforge/core, @staffforge/sdk
- Pipeline YAML loader and EventBus
- Plugin SDK with public API for plugin authors
- Storage abstraction layer

## [v1.7.0] — 2026-07-08

### Added
- ESLint + Prettier integration
- Model validation against schema
- CI lint step

## [v1.6.0] — 2026-07-08

### Added
- Agent enrichment with multi-level extends
- 4 base templates for agent inheritance

## [v1.5.0] — 2026-07-08

### Added
- Instance-scoped state management
- Community contribution files
- CI audit improvements

### Changed
- Documentation fixes

## [v1.4.1] — 2026-07-08

### Changed
- License: MIT → GPL-3.0-only

## [v1.4.0] — 2026-07-08

### Added
- Agent `extends` mechanism: body inheritance from parent agent (schema + registry)
- `agents/technology-agent.md` base template for technology subagents
- CI/CD badges in README
- GitHub Actions CI and publish workflows (committed as v1.3.0, released v1.4.0)

### Changed
- Security fix: `execSync` → `execFileSync` + platform whitelist in install.mjs
- 4 subagents (react, vue, svelte, angular) use `extends: technology-agent`
- Tests: 526→532 (6 new AgentRegistry extends tests)
- Pinned dependencies in tools/package.json (^ → ~)

### Removed
- Hotfix and feature branches cleaned up

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

[v2.6.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v2.6.0
[v2.5.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v2.5.0
[v2.3.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v2.3.0
[v2.2.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v2.2.0
[v2.1.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v2.1.0
[v2.0.1]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v2.0.1
[v2.0.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v2.0.0
[v1.7.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.7.0
[v1.6.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.6.0
[v1.5.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.5.0
[v1.4.1]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.4.1
[v1.4.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.4.0
[v1.3.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.3.0
[v1.2.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.2.0
[v1.1.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.1.0
[v1.0.0]: https://github.com/StaffForge/StaffForge-AI-Agent-Framework/releases/tag/v1.0.0
