# StaffForge AI Agent Framework — Architecture

> Current state: v2.6.0 — C.R.E.A.D.O. methodology + three-layer Guardrails + CapabilityEngine routing.  
> Active branch: `develop`

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    agents/*.md                           │
│  150 agent definitions (YAML frontmatter + Markdown body)│
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              tools/lib/agent-registry.mjs                 │
│  AgentRegistry: load, query, search, resolveDependencies │
└──────┬──────────────────────────────────────────┬────────┘
       │                                          │
       ▼                                          ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   tools/validate.mjs     │   │   tools/export.mjs       │
│   validates frontmatter  │   │   delegates to adapters  │
│   via AJV + JSON Schema  │   │   via AdapterRegistry    │
└──────────────────────────┘   └──────────┬───────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────┐
│           tools/lib/adapter-registry.mjs                 │
│  AdapterRegistry: lazy-load adapters, export(single/all)│
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   adapters/<platform>/                   │
│  6 platform adapters (opencode, claude-code, cursor,     │
│  copilot, aider, gemini-cli) transform agents → output   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.0 Libraries (`tools/lib/`)

Shared programmatic APIs consumed by CLI tools and external consumers.

| Module | File | Exports |
|---|---|---|---|
| Agent Registry | `tools/lib/agent-registry.mjs` | `AgentRegistry`, `getAgentRegistry()` |
| Adapter Registry | `tools/lib/adapter-registry.mjs` | `AdapterRegistry`, `getAdapterRegistry()` |
| Capability Engine | `tools/lib/capability-engine.mjs` | `CapabilityEngine`, `getCapabilityEngine()` |
| Router | `tools/lib/router.mjs` | `Router`, `getRouter()` |
| DAG | `tools/lib/dag.mjs` | `DAG` |
| Scheduler | `tools/lib/scheduler.mjs` | `Scheduler`, `getScheduler()` |
| Telemetry Collector | `tools/lib/telemetry/collector.mjs` | `TelemetryCollector`, `getCollector()` |
| Telemetry Storage | `tools/lib/telemetry/storage.mjs` | `TelemetryStorage`, `getStorage()` |
| Telemetry Reporter | `tools/lib/telemetry/reporter.mjs` | `TelemetryReporter`, `getReporter()` |
| Model Registry | `tools/lib/model-registry.mjs` | `ModelRegistry`, `getModelRegistry()` |
| Model Profile | `tools/lib/model-profile.mjs` | `ModelProfile`, `getModelProfile()` |
| Model Discovery | `tools/lib/model-discovery.mjs` | `ModelDiscovery`, `getModelDiscovery()` |
| Selection Engine | `tools/lib/selection-engine.mjs` | `SelectionEngine`, `getSelectionEngine()` |
| Fallback Engine | `tools/lib/fallback-engine.mjs` | `FallbackEngine`, `getFallbackEngine()` |
| Learning Engine | `tools/lib/learning-engine.mjs` | `LearningEngine`, `getLearningEngine()` |
| Model Selector | `tools/lib/model-selector.mjs` | `ModelSelector`, `getModelSelector()` |
| Pipeline Executor | `tools/lib/pipeline-executor.mjs` | `PipelineExecutor`, `getPipelineExecutor()` |
| Task Mapper | `tools/lib/task-mapper.mjs` | `TaskMapper`, `getTaskMapper()` |
| Logger | `tools/lib/logger.mjs` | `Logger`, `getLogger()` |

**Capability Engine** (`CapabilityEngine`):
- `analyzeIntent(text)` — extract keywords + detect task type
- `scoreAgent(agent, intent)` — rank agent against prompt intent
- `findBestMatch(intent, options?)` — top-N agents by score
- `expandCapabilities(text)` — resolve capability aliases

**Router** (`Router`):
- `resolveTask(taskType, prompt)` — build pipeline (template agents + technology matches)
- `buildPipeline(agentIds)` — topological sort by depends_on/before/after
- `suggestAgents(prompt)` — free-form agent recommendation

**DAG** (`DAG`):
- `addNode(id, data)` / `addEdge(from, to)` — build graph
- `getLevels()` — parallel execution groups (Kahn's algorithm)
- `topologicalSort()` — linear order
- `validate()` — cycle detection
- `static fromAgents(agents)` — build from agent definitions

**Scheduler** (`Scheduler`):
- `fromAgentIds(ids)` — build execution plan
- `fromRouterPipeline(pipeline)` — convert Router output to plan
- `buildPlan(taskType, ids, context)` — full plan with summary
- `validatePipeline(ids)` — validate DAG

**TelemetryCollector** (`TelemetryCollector`):
- `startRun(pipelineId, taskType, context?)` — start a pipeline run
- `recordAgentCall(agentId, {duration, tokens, model, provider, status})` — log agent execution
- `recordError(agentId, error)` — log error
- `endRun(status)` — finalize run, compute duration & totals
- `getReport()` — enriched report with agent_summary

**TelemetryStorage** (`TelemetryStorage`):
- `save(runData)` — append JSON line to `~/.staffforge/telemetry/runs.jsonl`
- `load(runId)` — find run by pipeline_id
- `list(limit)` — recent runs (newest first)
- `count()` / `deleteAll()` — management

**TelemetryReporter** (`TelemetryReporter`):
- `generateSummary(agents)` — stats: total, byStatus, avg tokens/duration
- `generateMarkdown(report)` — markdown pipeline report
- `generateJSON(report)` — enriched JSON output

**Telemetry report schema**:
```json
{
  "pipeline_id": "run_20260707_abc123",
  "task_type": "feature",
  "pipeline": ["architect", "security", "testing"],
  "duration_ms": 32000,
  "total_tokens": 15892,
  "provider": "OpenAI",
  "model": "gpt-4o",
  "agents": [
    { "id": "architect", "duration_ms": 8500, "tokens": 4200, "status": "success" }
  ],
  "status": "success",
}

**Model Registry** (`ModelRegistry`):
- `load()` — parse all models from `models/*.yaml`
- `findById(id)` / `findByProvider(provider)` / `findByFamily(family)` — lookup
- `findByCapability(capability)` / `findByTaskType(taskType)` — filter
- `findWithTools()` / `findWithReasoning()` / `findFree()` — feature filters
- `listProviders()` / `listFamilies()` — distinct values
- `register(model)` — add model at runtime
- `toJSON()` — serialize all models

**Model Profile** (`ModelProfile`):
- `load()` — parse task profiles from `models/profiles.yaml`
- `getProfile(taskType)` / `listProfiles()` — profile lookup
- `matchProfile(taskType, model)` — weighted scoring (family, tools, reasoning, context, cost)
- `rankModels(taskType, models)` — sorted by profile match
- `registerProfile(taskType, profile)` — add profile at runtime

**Model Discovery** (`ModelDiscovery`):
- `registerAdapter(provider, adapterFn)` — register custom discovery
- `discoverAll()` / `discoverProvider(provider)` — run discovery
- `listProviders()` — registered + file-based adapters
- Auto-loads adapters from `tools/lib/discovery/*.mjs`

**Selection Engine** (`SelectionEngine`):
- `select(taskType, options?)` — best model for task
- `selectTopN(taskType, options?)` — top N ranked models
- `rankModels(taskType, options?)` — scored and sorted
- `scoreModel(model, taskType, capabilities?)` — normalized 0-1 score
- Weighted scoring: profile (35%), capability (25%), priority (15%), cost (15%), reasoning (10%)

**Fallback Engine** (`FallbackEngine`):
- `executeWithFallback(agentFn, context, primaryModel)` — primary → same-provider → other-provider → free
- `getNextModel(failedModel, taskType)` — next available alternative
- `recordFailure(modelId, error)` / `recordSuccess(modelId, taskType)` — in-memory counters

> **Note:** `agentFn` is provided by the caller. This engine selects models and orchestrates fallback order, but does not call LLM APIs directly.

**Learning Engine** (`LearningEngine`):
- `recordExecution({modelId, taskType, duration, success})` — store execution
- `getModelRanking(taskType, {topN})` — sorted by success rate (60%) + speed (20%) + tokens (20%)
- `getSuccessRate(modelId, taskType)` / `getAverageCost(modelId)` — stats
- `clearHistory()` — reset data

**Model Selector** (`ModelSelector`):
- `select(taskType, {strategy, provider, requireTools})` — pick model (intelligent/free/cheapest/fastest)
- `execute(taskType, agentFn)` — run with optional fallback + learning
- `estimateCost(model, inputTokens, outputTokens)` — USD cost
- `listAvailable(options)` — filtered model list
- `getRanking(taskType)` — learning-backed or selection-backed ranking
- `configure(policy)` — set strategy, prefer_free, fallback, learning, etc.

> **Note:** This is a selection layer. `execute()` accepts a caller-provided `agentFn` but does not include an implementation. The MIL selects models and manages fallback; actual API execution is handled outside this layer.

**Agent Registry** (`AgentRegistry`):
- `load()` — parse all agents from disk
- `all()` / `count()` — enumerate
- `findById(id)` / `findByName(name)` — lookup
- `findByMode(mode)` / `findByCategory(category)` — filter
- `search(query)` — full-text across id, name, description, keywords, capabilities
- `resolveDependencies(agentIds)` — topological sort with cycle detection
- `getCategories()` / `getModes()` — distinct values
- `toJSON()` — serialize all agents

**Pipeline Executor** (`PipelineExecutor`):
- `execute(taskType, prompt, options?)` — resolves pipeline via Router and converts to DAG-based execution plan via Scheduler
- Returns `{taskType, description, modelProfile, agents, levels, summary}`

**Task Mapper** (`TaskMapper`):
- `mapTaskType(taskType)` — maps pipeline task type to model profile (feature→coding, bugfix→coding, refactor→architecture, security→security, deployment→coding, hotfix→quick)
- `getAllMappings()` — returns all task→profile mappings

**Logger** (`Logger`):
- `debug/info/warn/error(...args)` — structured logging with level prefixes
- `setLevel(level)` — runtime log level (debug/info/warn/error/silent)
- Controlled via `STAFFFORGE_LOG_LEVEL` env var (default: `info`)

**Adapter Registry** (`AdapterRegistry`):
- `listAdapters()` — auto-discover platform adapters
- `getAdapter(name)` — lazy-load + cache adapter module
- `export(agents, platform, outDir?)` — single-platform export
- `exportToAll(agents)` — export to all platforms sequentially

### 2.1 Agent Definitions (`agents/`)

150 Markdown files, each with YAML frontmatter and a body.

**Frontmatter schema** (`schemas/agent.schema.json`):

```json
{
  "id": "unique-kebab-id",
  "name": "Title Case",
  "mode": "primary | subagent | all",
  "category": "core | vcs | technology | domain | utility",
  "description": "One-line role summary",
  "tools": {
    "write": false,
    "bash": false,
    "edit": false
  },
  "input_schema": {
    "type": "object",
    "properties": { "task": { "type": "string" } },
    "required": ["task"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "findings": { "type": "array", "items": { "type": "string" } },
      "risks": { "type": "array", "items": { "type": "string" } },
      "recommendations": { "type": "array", "items": { "type": "string" } }
    }
  },
  "guardrails": {
    "max_iterations": 5,
    "token_budget": 8000,
    "input_sanitize": true,
    "output_validate": true,
    "output_dlp": false,
    "hallucination_check": false
  }
}
```

**Body**: Free-form Markdown with `## Mission`, `## Mandatory Rules`, `## Deliverables`.

**C.R.E.A.D.O. methodology**: All agents follow Contexto, Restricciones, Especificación, Audiencia, Datos de entrada, Output — ensuring consistent quality and Guardrails enforcement at every step.

### 2.2 Schema Validation (`schemas/agent.schema.json` + `tools/validate.mjs`)

- JSON Schema (draft-07) with AJV validation
- Checks: mode (enum), description (string, minLength 1), tools (3 required booleans)
- `additionalProperties: false` — no extra fields allowed
- Runs against all agents: `node tools/validate.mjs`

### 2.3 Agent Template (`templates/agent.md`)

Placeholder-based template:
- `__NAME__` → kebab-case filename
- `__TITLE__` → Title-Case name
- Scaffolds via: `node tools/init-agent.mjs <name>`

### 2.4 Platform Adapters (`adapters/<platform>/index.mjs`)

Each exports a default function: `(agents[]) → [{path, content}]`

| Platform | Output | Format |
|---|---|---|
| opencode | 1 file | `opencode.json` |
| claude-code | 150 files | `CLAUDE.md` + `.claude/rules/*.md` |
| cursor | 150 files | `.cursor/rules/*.mdc` |
| copilot | 1 file | `.github/copilot-instructions.md` |
| aider | 1 file | `.aider.rules.md` |
| gemini-cli | 150 files | `.gemini/*.md` |

### 2.5 Exporter (`tools/export.mjs`)

- CLI: `node tools/export.mjs --platform <name> [--out <dir>]`
- Loads all 150 agents
- Dynamic imports adapter
- Calls adapter.default(agents)
- Writes output files

### 2.6 Installer (`packages/cli/install.mjs`)

- Universal installer (local + npx)
- Downloads framework, runs exporter, copies to project
- Supports project-level and global installs
- 6 platforms + "all"

### 2.7 Orchestrator (`agents/orchestrator.md`)

- Default agent (Tab key in OpenCode)
- Routes tasks to subagents using `CapabilityEngine` intent analysis + `TaskMapper` pipeline resolution
- Delegates all VCS operations to `@vcs` (never runs git directly)
- Launches pipeline agents in DAG-based parallel levels
- References `ORCHESTRATOR_MATRIX.md` for pipeline definitions
- Enforces three-layer Guardrails at every delegation

### 2.8 Pipeline Matrix (`ORCHESTRATOR_MATRIX.md`)

Defines 6 task types with DAG pipelines:

| Type | Branch | Flow |
|---|---|---|
| Feature | `feature/*` | Git → Planner → Req+Arch → Knowledge → Impact → Lang+Sec+Test → Review+Doc → Git merge |
| Bug Fix | `bugfix/*` | Git → Planner → Knowledge+Impact → Debugging → Lang+Test → Review → Git merge |
| Refactor | `feature/*` | Git → Architect → Refactor+Perf → Review → Git merge |
| Security | `feature/*` | Git → Security → Pentest → Review → Git merge |
| Deployment | `release/*` | Git → Docker+K8s → Build+Release → Doc → Git finalize |
| Hotfix | `hotfix/*` | Git (from main) → Debugging → Review → Git finalize |

---

## 3. Directory Layout

```
/
├── agents/                 # 150 agent *.md files
├── adapters/               # 6 platform adapters
│   ├── opencode/index.mjs
│   ├── claude-code/index.mjs
│   ├── cursor/index.mjs
│   ├── copilot/index.mjs
│   ├── aider/index.mjs
│   └── gemini-cli/index.mjs
├── models/                  # Model definitions (23 YAML)
│   ├── profiles.yaml        # 8 task profiles
│   ├── openai-gpt-4o.yaml   # Model example
│   └── ...
├── skills/                   # 4 skill definitions with YAML frontmatter
├── schemas/
│   ├── agent.schema.json    # Current active schema
│   ├── agent.schema.v0.json # Frozen pre-RFC schema
│   └── model.schema.json    # Model manifest schema
├── templates/
│   └── agent.md
├── packages/                  # Monorepo packages
│   ├── cli/                   # @staffforge/cli — universal installer
│   ├── core/                  # @staffforge/core — Router, Guardrails, Pipeline
│   ├── sdk/                   # @staffforge/sdk — public SDK
│   ├── plugin-sdk/            # @staffforge/plugin-sdk — plugin API
│   ├── dashboard/             # Community dashboard
│   └── enterprise/            # Enterprise features (commercial)
├── tests/
│   ├── unit/
│   │   ├── dag.test.mjs           # DAG unit tests
│   │   ├── scheduler.test.mjs     # Scheduler unit tests
│   │   ├── pipeline-executor.test.mjs  # Pipeline executor tests
│   │   ├── registry/              # 8 MIL test files
│   │   ├── router/                # 2 router test files
│   │   └── telemetry.test.mjs     # Telemetry tests
│   ├── integration/
│   │   ├── export.test.mjs        # Export integration
│   │   ├── mil-pipeline.test.mjs  # MIL integration
│   │   └── pipeline.test.mjs      # Pipeline integration
│   ├── e2e/
│   │   └── mil-lifecycle.test.mjs # End-to-end MIL lifecycle
│   └── run-all.mjs                # Test runner
├── tools/
│   ├── lib/
│   │   ├── agent-registry.mjs     # Programmatic Agent Registry API
│   │   ├── adapter-registry.mjs   # Programmatic Adapter Registry API
│   │   ├── capability-engine.mjs  # Intent analysis + scoring
│   │   ├── router.mjs             # Declarative pipeline router
│   │   ├── dag.mjs                # Directed acyclic graph
│   │   ├── scheduler.mjs          # Pipeline execution planner
│   │   ├── pipeline-executor.mjs  # Router→Scheduler integration
│   │   ├── task-mapper.mjs        # Task-type → model-profile mapping
│   │   ├── logger.mjs             # Structured logger
│   │   ├── model-registry.mjs     # Model definitions
│   │   ├── model-profile.mjs      # Task profiles
│   │   ├── model-discovery.mjs    # Provider discovery
│   │   ├── selection-engine.mjs   # Weighted model scoring
│   │   ├── fallback-engine.mjs    # 4-level fallback chain
│   │   ├── learning-engine.mjs    # Execution history
│   │   ├── model-selector.mjs     # Model selection facade
│   │   └── telemetry/
│   │       ├── collector.mjs      # TelemetryCollector
│   │       ├── storage.mjs        # JSON Lines persistence
│   │       ├── reporter.mjs       # Markdown/JSON report generator
│   │       └── index.mjs          # Public exports
│   ├── export.mjs           # Multi-platform exporter
│   ├── validate.mjs         # JSON Schema validation
│   ├── init-agent.mjs       # Scaffolding tool
│   ├── generate-docs.mjs    # Documentation generator
│   └── install.mjs          # Platform installer
├── install.mjs              # Root installer (alias to packages/cli/install.mjs)
├── ORCHESTRATOR_MATRIX.md   # Pipeline routing definitions
├── AGENTS.md                # Framework overview
├── AGENTS_ANEX.md           # Configuration annex (project-specific overrides)
├── PROJECT_RULES.md         # Dynamically generated project rules (by @project-rules)
├── README.md                # User documentation
```

---

## 4. Data Flow

```
User prompt
    │
    ▼
Orchestrator (agents/orchestrator.md)
    │
    ├─ 0. Input Guardrails: sanitizeInput() — 18 injection patterns
    ├─ 1. Detect task type via TaskMapper (feature/bugfix/refactor/security/deployment/hotfix)
    ├─ 2. Detect technologies via CapabilityEngine (python → @python, docker → @docker)
    ├─ 3. Resolve pipeline via Router from ORCHESTRATOR_MATRIX.md
    ├─ 4. Delegate to @vcs for branch creation
    ├─ 5. Select optimal model via ModelSelector (MIL)
    ├─ 6. Execute pipeline levels (parallel where possible, DAG-based)
    │   ├─ Runtime Guardrails: max_iterations (10), token_budget (32K/session 128K)
    │   ├─ Output Guardrails: schema validation, DLP secret scanning, hallucination check
    │   └─ Levels: Requirements+Architect → Knowledge → Impact → Language+Sec+Test → Review+Doc
    ├─ 7. Record execution in LearningEngine + Telemetry
    ├─ 8. CI gate (@ci watchdog — zero tolerance)
    └─ 9. Delegate final merge/tag to @vcs
```

---

## 5. Current Limitations

- **Single version**: Framework, agents, adapters, and packages share one version — no independent versioning
- **No live model API integration**: ModelSelector selects models but doesn't call LLM APIs — callers must supply their own execution logic
- **No agent hot-reload**: Agent definitions are loaded at startup — adding a new agent requires re-export
- **No plugin marketplace**: Plugin SDK exists but no discovery or distribution infrastructure beyond the registry
- **No multi-tenancy**: Framework assumes a single project/team context

### Resolved (v2.x evolution)

| Limitation | Resolved In | Status |
|------------|-------------|--------|
| Flat agent model (no categories) | v1.1.0 | ✅ 5 categories (core/vcs/technology/domain/utility) |
| Hardcoded routing | v2.0.0 | ✅ CapabilityEngine intent analysis + scoring |
| No canonical agent representation | v1.0.0 | ✅ YAML frontmatter + structured Markdown body |
| No agent discovery | v1.1.0 | ✅ AgentRegistry search/load/query |
| No dependency engine | v1.3.0 | ✅ DAG with topological sort + cycle detection |
| No pipeline scheduler | v1.3.0 | ✅ Scheduler with execution plans |
| No test infrastructure | v1.1.0→v2.6.0 | ✅ 848 tests across 31 suites (unit/integration/e2e) |
| No telemetry/metrics | v1.3.0 | ✅ TelemetryCollector + Storage + Reporter |
| No auto-documentation | v1.1.0 | ✅ DocumentationGenerator (catalog, DAG, matrix) |
| No security/guardrails | v2.6.0 | ✅ Three-layer Guardrails (Input/Runtime/Output) |
| No VCS abstraction | v2.5.0 | ✅ 5 VCS providers via @vcs agent |
| Agent template lacks schemas | v2.6.0 | ✅ input_schema + output_schema + guardrails in frontmatter |

---

## 6. Validation Baseline

> **Legend:** ✅ = tested (unit/integration coverage). Integrated = wired into `run-pipeline.mjs` runtime.
> MIL components (SelectionEngine, FallbackEngine, LearningEngine, ModelSelector) are tested as a library but are not integrated into an LLM execution runtime.

| Check | Status |
|---|---|
| `node tools/validate.mjs` | ✅ 150/150 agents valid |
| `node tools/export.mjs --all` | ✅ 6 platforms, all pass |
| `node tools/export.mjs --platform opencode` | ✅ 1 file (with OPENCODE_BUILTINS filter) |
| `node tools/export.mjs --platform claude-code` | ✅ 150 files |
| `node tools/export.mjs --platform cursor` | ✅ 150 files |
| `node tools/export.mjs --platform copilot` | ✅ 1 file |
| `node tools/export.mjs --platform aider` | ✅ 1 file |
| `node tools/export.mjs --platform gemini-cli` | ✅ 150 files |
| `tools/lib/agent-registry.mjs` | ✅ AgentRegistry API (load, query, search, resolveDependencies) |
| `tools/lib/adapter-registry.mjs` | ✅ AdapterRegistry API (lazy-load, export, exportToAll) |
| `tools/lib/capability-engine.mjs` | ✅ CapabilityEngine (analyzeIntent, scoreAgent, findBestMatch) |
| `tools/lib/router.mjs` | ✅ Router (resolveTask, buildPipeline, suggestAgents) |
| `tools/lib/dag.mjs` | ✅ DAG (addNode/Edge, getLevels, topologicalSort, validate, cycle detection) |
| `tools/lib/scheduler.mjs` | ✅ Scheduler (fromAgentIds, fromRouterPipeline, buildPlan, validatePipeline) |
| `tests/unit/dag.test.mjs` | ✅ 27/27 passed |
| `tests/unit/scheduler.test.mjs` | ✅ 14/14 passed |
| `tools/lib/telemetry/collector.mjs` | ✅ TelemetryCollector (startRun, recordAgentCall, recordError, endRun, getReport) |
| `tools/lib/telemetry/storage.mjs` | ✅ TelemetryStorage (JSON Lines save/load/list/count) |
| `tools/lib/telemetry/reporter.mjs` | ✅ TelemetryReporter (generateSummary, generateMarkdown, generateJSON) |
| `tests/unit/telemetry.test.mjs` | ✅ 50/50 passed |
| `tests/unit/registry/AgentRegistry.test.mjs` | ✅ 26/26 passed |
| `tests/unit/registry/AdapterRegistry.test.mjs` | ✅ 12/12 passed |
| `tests/unit/router/CapabilityEngine.test.mjs` | ✅ 21/21 passed |
| `tests/unit/router/Router.test.mjs` | ✅ 16/16 passed |
| `tests/integration/pipeline.test.mjs` | ✅ 22/22 passed |
| `tests/integration/export.test.mjs` | ✅ 13/13 passed |
| `tests/run-all.mjs` | ✅ 848/848 passed (31 suites) |
| `tools/generate-docs.mjs` | ✅ DocumentationGenerator (catalog, capabilities, DAG, matrix, architecture) |
| Tools/lib/logger.mjs | ✅ Logger (debug/info/warn/error, env config) |
| `tools/lib/pipeline-executor.mjs` | ✅ PipelineExecutor (Router→Scheduler wiring) |
| `tools/lib/task-mapper.mjs` | ✅ TaskMapper (task-type → model-profile mapping) |
| `tests/unit/pipeline-executor.test.mjs` | ✅ 38/38 passed |
| `tools/lib/model-registry.mjs` | ✅ ModelRegistry |
| `tools/lib/model-profile.mjs` | ✅ ModelProfile (matchProfile weighted scoring) |
| `tools/lib/model-discovery.mjs` | ✅ ModelDiscovery (registerAdapter, discoverAll, auto-load) |
| `tools/lib/selection-engine.mjs` | ✅ SelectionEngine (select, rankModels, scoreModel) |
| `tools/lib/fallback-engine.mjs` | ✅ FallbackEngine (4-level chain, executeWithFallback) |
| `tools/lib/learning-engine.mjs` | ✅ LearningEngine (recordExecution, getModelRanking) |
| `tools/lib/model-selector.mjs` | ✅ ModelSelector (facade, 4 strategies, execute, estimateCost) |
| `tests/unit/registry/ModelRegistry.test.mjs` | ✅ 29/29 passed |
| `tests/unit/registry/ModelProfile.test.mjs` | ✅ 21/21 passed |
| `tests/unit/registry/ModelDiscovery.test.mjs` | ✅ 15/15 passed |
| `tests/unit/registry/SelectionEngine.test.mjs` | ✅ 24/24 passed |
| `tests/unit/registry/FallbackEngine.test.mjs` | ✅ 31/31 passed |
| `tests/unit/registry/LearningEngine.test.mjs` | ✅ 33/33 passed |
| `tests/unit/registry/ModelSelector.test.mjs` | ✅ 27/27 passed |
| `tests/integration/mil-pipeline.test.mjs` | ✅ 13/13 passed |
| `tests/e2e/mil-lifecycle.test.mjs` | ✅ 35/35 passed |
| `tests/run-all.mjs` | ✅ 848/848 passed (31 suites) |
| `packages/core/lib/guardrails/` — 3-layer system | ✅ Input (input-sanitizer), Runtime (guardrail-manager), Output (output-dlp, hallucination-check, schema-validator) |
| Agent categories | ✅ core=9, technology=99, domain=23, utility=14, vcs=5 |
| Models | ✅ 23 YAML files, 7 providers |
| VCS abstraction | ✅ 5 provider agents: vcs-git, vcs-svn, vcs-hg, vcs-tfvc, vcs-perforce |
| Git working tree | ✅ On `develop` |
| Skills | ✅ 4 skill definitions in `skills/*.md` |

---

*Generated at v2.6.0 — C.R.E.A.D.O. methodology + three-layer Guardrails + CapabilityEngine routing.*
*Last updated: 2026-07-17 (v2.6.0: Guardrails, OPENCODE_BUILTINS filter, AGENTS_ANEX.md v2.0)*
