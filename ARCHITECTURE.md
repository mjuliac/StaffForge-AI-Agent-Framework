# StaffForge AI Agent Framework — Architecture

> Current state at Phase 4 (DAG Scheduler + Ejecución Paralela).  
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
│   │   ├── agent-registry.mjs   # Programmatic Agent Registry API
│   │   ├── adapter-registry.mjs # Programmatic Adapter Registry API
│   │   ├── capability-engine.mjs # Intent analysis + scoring
│   │   ├── router.mjs           # Declarative pipeline router
│   │   ├── dag.mjs              # Directed acyclic graph
│   │   └── scheduler.mjs        # Pipeline execution planner
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
    ├─ 5. Execute pipeline levels (parallel where possible)
    └─ 6. Delegate final merge/tag to @git
```

---

## 5. Current Limitations (Pre-RFC-001)

- **Flat agent model**: No categories, keywords, capabilities, versioning, or dependencies
- **Hardcoded routing**: Orchestrator contains manual technology→agent mapping
- **No canonical representation**: Adapters receive raw frontmatter, transform inline
- **No discovery**: Adding an agent doesn't auto-register it anywhere
- **No dependency engine**: Pipeline order is hardcoded in matrix, not machine-readable
- **No scheduler**: Parallel execution is a documented strategy, not executable code
- **No tests**: Zero test infrastructure
- **No telemetry**: No metrics, no pipeline reports
- **No auto-documentation**: Catalogs, DAGs, and compatibility matrices are manual
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
| Git working tree | ✅ On `feature/rfc-001-architecture` |

---

*Generated at Phase 2 of RFC-001 implementation (Agent Registry + Adapter Registry).*
*Last updated: 2026-07-07*
