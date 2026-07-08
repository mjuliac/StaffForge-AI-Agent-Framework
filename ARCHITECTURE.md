# StaffForge AI Agent Framework — Architecture

> Current state at RFC-002 (Model Intelligence Layer).  
> Active branch: `feature/rfc-001-architecture`

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    agents/*.md                           │
│  136 agent definitions (YAML frontmatter + Markdown body)│
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

**Agent Registry** (`AgentRegistry`):
- `load()` — parse all agents from disk
- `all()` / `count()` — enumerate
- `findById(id)` / `findByName(name)` — lookup
- `findByMode(mode)` / `findByCategory(category)` — filter
- `search(query)` — full-text across id, name, description, keywords, capabilities
- `resolveDependencies(agentIds)` — topological sort with cycle detection
- `getCategories()` / `getModes()` — distinct values
- `toJSON()` — serialize all agents

**Adapter Registry** (`AdapterRegistry`):
- `listAdapters()` — auto-discover platform adapters
- `getAdapter(name)` — lazy-load + cache adapter module
- `export(agents, platform, outDir?)` — single-platform export
- `exportToAll(agents)` — export to all platforms sequentially

### 2.1 Agent Definitions (`agents/`)

136 Markdown files, each with YAML frontmatter and a body.

**Frontmatter schema** (`schemas/agent.schema.json`):

```json
{
  "mode": "primary | subagent | all",
  "description": "One-line role summary",
  "tools": {
    "write": false,
    "bash": false,
    "edit": false
  }
}
```

**Body**: Free-form Markdown with `## Mission`, `## Mandatory Rules`, `## Deliverables`.

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
| claude-code | 136 files | `CLAUDE.md` + `.claude/rules/*.md` |
| cursor | 136 files | `.cursor/rules/*.mdc` |
| copilot | 1 file | `.github/copilot-instructions.md` |
| aider | 1 file | `.aider.rules.md` |
| gemini-cli | 136 files | `.gemini/*.md` |

### 2.5 Exporter (`tools/export.mjs`)

- CLI: `node tools/export.mjs --platform <name> [--out <dir>]`
- Loads all 136 agents
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
- Routes tasks to subagents based on task type
- Contains hardcoded technology→agent mapping table
- References `ORCHESTRATOR_MATRIX.md` for pipeline definitions

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
├── agents/                 # 136 agent *.md files
├── adapters/               # 6 platform adapters
│   ├── opencode/index.mjs
│   ├── claude-code/index.mjs
│   ├── cursor/index.mjs
│   ├── copilot/index.mjs
│   ├── aider/index.mjs
│   └── gemini-cli/index.mjs
├── schemas/
│   ├── agent.schema.json   # Current active schema
│   └── agent.schema.v0.json # Frozen pre-RFC schema
├── templates/
│   └── agent.md
├── tests/
│   ├── unit/
│   │   ├── dag.test.mjs         # DAG unit tests
│   │   └── scheduler.test.mjs   # Scheduler unit tests
├── tools/
│   ├── lib/
│   │   ├── agent-registry.mjs    # Programmatic Agent Registry API
│   │   ├── adapter-registry.mjs  # Programmatic Adapter Registry API
│   │   ├── capability-engine.mjs # Intent analysis + scoring
│   │   ├── router.mjs            # Declarative pipeline router
│   │   ├── dag.mjs               # Directed acyclic graph
│   │   ├── scheduler.mjs         # Pipeline execution planner
│   │   └── telemetry/
│   │       ├── collector.mjs     # TelemetryCollector
│   │       ├── storage.mjs       # JSON Lines persistence
│   │       ├── reporter.mjs      # Markdown/JSON report generator
│   │       └── index.mjs         # Public exports
│   ├── export.mjs          # Multi-platform exporter
│   ├── validate.mjs        # JSON Schema validation
│   ├── init-agent.mjs      # Scaffolding tool
│   ├── migrate-frontmatter.mjs # Schema migration tool
│   └── install.mjs         # OpenCode-specific installer
├── packages/
│   └── cli/
│       ├── install.mjs     # Universal installer
│       ├── package.json    # @staffforge/cli (v0.1.0)
│       └── README.md
├── install.mjs             # Root symlink to packages/cli install
├── ORCHESTRATOR_MATRIX.md  # Pipeline routing definitions
├── AGENTS.md               # Framework overview
├── README.md               # User documentation
└── RFC-001-RESPONSE.md     # Architectural evolution plan
```

---

## 4. Data Flow

```
User prompt
    │
    ▼
Orchestrator (agents/orchestrator.md)
    │
    ├─ 1. Detect task type (feature/bugfix/refactor/security/deployment/hotfix)
    ├─ 2. Detect technologies from prompt (python → @python, docker → @docker)
    ├─ 3. Consult ORCHESTRATOR_MATRIX.md for pipeline
    ├─ 4. Delegate to @git for branch creation
    ├─ 5. Select optimal model via ModelSelector (MIL)
    ├─ 6. Execute pipeline levels (parallel where possible, with fallback)
    ├─ 7. Record execution in LearningEngine + Telemetry
    └─ 8. Delegate final merge/tag to @git
```

---

## 5. Current Limitations (Pre-RFC-001)

- **Flat agent model**: No categories, keywords, capabilities, versioning, or dependencies
- **Hardcoded routing**: Orchestrator contains manual technology→agent mapping
- **No canonical representation**: Adapters receive raw frontmatter, transform inline
- **No discovery**: Adding an agent doesn't auto-register it anywhere
- **No dependency engine**: Pipeline order is hardcoded in matrix, not machine-readable
- **No scheduler**: Parallel execution is a documented strategy, not executable code
- ~~**No tests**: Zero test infrastructure~~ ✅ 201 tests across 9 suites
- ~~**No telemetry**: No metrics, no pipeline reports~~ ✅ TelemetryCollector + Storage + Reporter
- ~~**No auto-documentation**: Catalogs, DAGs, and compatibility matrices are manual~~ ✅ DocumentationGenerator
- **Single version**: Framework, agents, and adapters share one version

---

## 6. Validation Baseline

| Check | Status |
|---|---|
| `node tools/validate.mjs` | ✅ 136/136 agents valid |
| `node tools/export.mjs --all` | ✅ 6 platforms, all pass |
| `node tools/export.mjs --platform opencode` | ✅ 1 file |
| `node tools/export.mjs --platform claude-code` | ✅ 136 files |
| `node tools/export.mjs --platform cursor` | ✅ 136 files |
| `node tools/export.mjs --platform copilot` | ✅ 1 file |
| `node tools/export.mjs --platform aider` | ✅ 1 file |
| `node tools/export.mjs --platform gemini-cli` | ✅ 136 files |
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
| `tests/run-all.mjs` | ✅ 201/201 passed (9 suites) |
| `tools/migrate-categories.mjs` | ✅ Assigned category to all 136 agents |
| `tools/generate-docs.mjs` | ✅ DocumentationGenerator (catalog, capabilities, DAG, matrix, architecture) |
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
| `tests/run-all.mjs` | ✅ 422/422 passed (18 suites) |
| Agent categories | ✅ core=8, technology=94, domain=23, utility=11 |
| Git working tree | ✅ On `feature/rfc-002-model-intelligence` |

---

*Generated at RFC-002 implementation (Model Intelligence Layer).*
*Last updated: 2026-07-08*
