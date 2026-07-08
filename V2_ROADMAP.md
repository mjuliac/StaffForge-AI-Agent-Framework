# StaffForge v2.0 → v3.0 Roadmap

## Architecture — Monorepo Structure

```
StaffForge/
├── packages/
│   ├── core/                    ← GPL-3.0 (Open Source)
│   │   ├── agents/              ← 141+ agent definitions
│   │   ├── schemas/             ← JSON Schema
│   │   ├── adapters/            ← 6 platform adapters
│   │   ├── pipelines/           ← YAML pipeline definitions
│   │   ├── lib/                 ← Core libraries
│   │   │   ├── interfaces/      ← All interfaces
│   │   │   ├── registries/      ← Agent, Adapter, Model, Pipeline registries
│   │   │   ├── engines/         ← Selection, Fallback, Learning, Capability
│   │   │   ├── storage/         ← MemoryStorage, JsonStorage
│   │   │   ├── loaders/         ← YamlLoader, JsonLoader, RemoteLoader, MarketplaceLoader
│   │   │   ├── event-bus.mjs    ← EventBus (Core, not Enterprise)
│   │   │   ├── dag.mjs
│   │   │   ├── scheduler.mjs
│   │   │   ├── logger.mjs
│   │   │   └── ...
│   │   └── cli/                 ← Installer
│   │
│   ├── sdk/                     ← GPL-3.0 (Open Source)
│   │   ├── index.mjs            ← Public API
│   │   └── package.json         ← @staffforge/sdk
│   │
│   ├── plugin-sdk/              ← GPL-3.0 (Open Source)
│   │   ├── index.mjs            ← IPlugin, IEventBus, interfaces
│   │   ├── interfaces/          ← All interface definitions
│   │   └── package.json         ← @staffforge/plugin-sdk
│   │
│   └── enterprise/              ← Licencia Comercial StaffForge
│       ├── storage/
│       │   ├── sqlite-storage.mjs
│       │   └── postgres-storage.mjs
│       ├── analytics.mjs
│       ├── policy-engine.mjs
│       ├── observability.mjs
│       └── dashboard/           ← (v3.0)
│
├── examples/
├── docs/
└── website/
```

## Plugin SDK Interfaces

### IEventBus (en Core)
```typescript
interface IEventBus {
  on(event: string, handler: EventHandler): Disposable;
  off(event: string, handler: EventHandler): void;
  emit(event: string, payload: any): void;
  once(event: string, handler: EventHandler): Disposable;
  removeAllListeners(event?: string): void;
}
```

### IAdapterProvider
```typescript
interface IAdapterProvider {
  name: string;
  description?: string;
  version?: string;
  export(agents: Agent[]): AdapterFile[];
  validate?(agents: Agent[]): ValidationResult;
}
```

### IModelProvider
```typescript
interface IModelProvider {
  name: string;
  discover(): Promise<ModelDefinition[]>;
  getById(id: string): ModelDefinition | null;
  listAll(): ModelDefinition[];
}
```

### IPipelineProvider
```typescript
interface IPipelineProvider {
  name: string;
  resolveTask(taskType: string, prompt?: string): Pipeline | null;
  listTaskTypes(): string[];
  registerTaskType(taskType: string, template: PipelineTemplate): void;
}
```

### IAgentProvider
```typescript
interface IAgentProvider {
  name: string;
  loadAgents(): Agent[];
  findById(id: string): Agent | null;
  search(query: string): Agent[];
}
```

### ITelemetryStorage
```typescript
interface ITelemetryStorage {
  save(runData: RunData): SavedEntry;
  load(runId: string): RunData | null;
  list(limit?: number): RunData[];
  count(): number;
  deleteAll(): boolean;
  query?(filter: RunFilter): RunData[];
}
```

### IPlugin
```typescript
interface IPlugin {
  name: string;
  version: string;
  description?: string;
  init(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
  hooks?: PluginHooks;
  adapters?: IAdapterProvider[];
  models?: IModelProvider[];
  agents?: IAgentProvider[];
  pipelines?: IPipelineProvider[];
  storage?: ITelemetryStorage;
}
```

## Roadmap

### v2.0 — Architecture + SDK + Pipelines
- Plugin SDK interfaces (7 interfaces)
- Pipeline YAML definitions + PipelineRegistry + YamlLoader
- EventBus in Core
- SDK Package (@staffforge/sdk)
- Storage Abstraction (MemoryStorage, JsonStorage)

### v2.1 — Plugins + Hooks + Learning + Storage
- PluginManager — loads plugins from ~/.staffforge/plugins/
- PipelineExecutor hooks — emit events at 12 pipeline points
- LearningEngine persistence — wire with storage by default
- SQLite Storage (Enterprise)

### v2.2 — Marketplace Open Source
- RemoteLoader — download pipelines from URL
- Marketplace registry — public pipeline catalog
- CLI: staffforge marketplace — search/install pipelines

### v2.3 — Remote Registry
- RegistryServer — discover agents, pipelines, plugins remotely
- Client sync — local ↔ remote synchronization

### v2.5 — Dashboard Community (basic)
- Web UI — view agents, pipelines, executions
- Read-only — no editing

### v3.0 — Enterprise
- Postgres Storage
- Analytics — metrics per team/project
- Policy Engine — model/cost restrictions
- Organizations — multi-tenant, roles, permissions
- SSO/RBAC — enterprise authentication
- Audit Logs — immutable logs, compliance
- Observability — OpenTelemetry, Prometheus, Grafana
- Dashboard Enterprise — editing, management, configuration

## Licensing

| Package | License |
|---------|---------|
| @staffforge/core | GPL-3.0 |
| @staffforge/sdk | GPL-3.0 |
| @staffforge/plugin-sdk | GPL-3.0 |
| @staffforge/enterprise | Licencia Comercial StaffForge |

## Visual Roadmap

```
v1.7.0 (actual) ─────────────────────────────────────────────
  Fases 1-3 completadas
  Score: 9.4

v2.0 ────────────────────────────────────────────────────────
  Plugin SDK interfaces
  Pipeline YAML
  EventBus (Core)
  SDK Package
  Storage abstraction
  Score: 9.7

v2.1 ────────────────────────────────────────────────────────
  Plugin manager
  Pipeline hooks
  Learning persistence
  SQLite storage (Enterprise)
  Score: 9.8

v2.2 ────────────────────────────────────────────────────────
  Marketplace Open Source
  Remote pipeline loading

v2.3 ────────────────────────────────────────────────────────
  Remote registry

v2.5 ────────────────────────────────────────────────────────
  Dashboard Community (read-only)

v3.0 ────────────────────────────────────────────────────────
  Enterprise:
  - Postgres storage
  - Analytics
  - Policy Engine
  - Organizations + SSO/RBAC
  - Audit Logs
  - Observability
  - Dashboard Enterprise
```
