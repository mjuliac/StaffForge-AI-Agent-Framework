# RFC-001 Response: Plan de Evolución Arquitectónica

## Resumen Ejecutivo

La RFC propone 17 objetivos. La arquitectura actual es funcional pero carece de los cimientos para escalar a cientos de agentes, múltiples adaptadores y pipelines complejos.

**Estado actual**: 136 agentes planos con frontmatter mínimo (3 campos), 6 adapters inline, routing hardcoded en el orchestrator, 0 tests, 0 telemetría.

**Plan**: 7 fases, ~12 semanas, completamente incremental y backward-compatible.

---

## Análisis de Impacto por Componente

| Componente | Archivos | Impacto |
|---|---|---|
| `schemas/agent.schema.json` | 1 | **Alto** — Reescribir de 3 a ~20 campos |
| `templates/agent.md` | 1 | **Medio** — Añadir campos del manifiesto |
| `tools/validate.mjs` | 1 | **Medio** — Validar nuevos campos |
| `tools/export.mjs` | 1 | **Bajo** — Usar Registry en vez de FS directo |
| `tools/init-agent.mjs` | 1 | **Bajo** — Preguntar campos nuevos |
| `agents/*.md` | 136 | **Masivo pero automatizable** — Añadir frontmatter a todos |
| `adapters/*/index.mjs` | 6 | **Medio** — Consumir representación canónica |
| `agents/orchestrator.md` | 1 | **Bajo** — Routing vía Registry |
| `ORCHESTRATOR_MATRIX.md` | 1 | **Bajo** — DAG declarativo |
| `packages/cli/install.mjs` | 1 | **Nulo** — No necesita cambios |
| **Nuevos** (Registry, Scheduler, Telemetry) | ~15 | **Alto** — Crear desde cero |

---

## Plan de Fases

### Fase 0: Sprint 0 — Preparación (Semana 1)

**Objetivo**: Estabilizar el estado actual antes de evolucionar.

- [ ] Congelar el schema actual como `schemas/agent.schema.v0.json`
- [ ] Crear rama `feature/rfc-001-architecture`
- [ ] Verificar que `node tools/validate.mjs` pasa en los 136 agentes
- [ ] Verificar que los 6 exportadores producen output válido
- [ ] Documentar el estado actual en `ARCHITECTURE.md`

**Riesgos**: Ninguno. Solo preparación.

---

### Fase 1: Manifiesto de Agente (Semanas 1-2)

**Objetivo**: Expandir el schema para soportar todos los campos del manifiesto.

**Componentes afectados**:
- `schemas/agent.schema.json`
- `templates/agent.md`
- `tools/validate.mjs`
- `tools/init-agent.mjs`

**Nuevo schema** (`agent.schema.json`):

```json
{
  "type": "object",
  "properties": {
    "id":             { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
    "name":           { "type": "string" },
    "description":    { "type": "string", "minLength": 1 },
    "version":        { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$", "default": "0.1.0" },
    "mode":           { "enum": ["primary", "subagent", "all"] },
    "category":       { "enum": ["core", "technology", "domain", "platform", "utility"] },
    "keywords":       { "type": "array", "items": { "type": "string" } },
    "capabilities":   { "type": "array", "items": { "type": "string" } },
    "priority":       { "type": "integer", "minimum": 0, "maximum": 100, "default": 50 },
    "tags":           { "type": "array", "items": { "type": "string" } },
    "depends_on":     { "type": "array", "items": { "type": "string" } },
    "before":         { "type": "array", "items": { "type": "string" } },
    "after":          { "type": "array", "items": { "type": "string" } },
    "tools": {
      "type": "object",
      "properties": {
        "write": { "type": "boolean" },
        "bash":  { "type": "boolean" },
        "edit":  { "type": "boolean" }
      },
      "required": ["write", "bash", "edit"]
    },
    "compatible_platforms": {
      "type": "array",
      "items": { "enum": ["opencode", "claude-code", "cursor", "copilot", "aider", "gemini-cli"] }
    },
    "permissions": { "type": "object" },
    "input_schema": { "type": "object" },
    "output_schema": { "type": "object" },
    "examples": { "type": "array", "items": { "type": "object" } },
    "limitations": { "type": "array", "items": { "type": "string" } },
    "owner": { "type": "string" }
  },
  "required": ["id", "name", "description", "mode", "tools"]
}
```

**Backward compatibility**: El schema antiguo (`mode`, `description`, `tools`) sigue siendo válido. Los nuevos campos son opcionales. `id` se inicializa automáticamente del filename.

**Entregables**:
- Schema expandido y validado
- `node tools/validate.mjs` pasa en 136 agentes
- Template actualizado
- Script de migración masiva para añadir campo `id` y `category` a los 136 agentes

**Riesgos**:
- Bajo: los agentes existentes no tienen `id` — el schema debe hacerlo opcional o derivarlo del filename
- Bajo: `category` es nuevo — todos los agentes existentes quedan sin categoría hasta la Fase 6 (Taxonomía)

---

### Fase 2: Agent Registry + Adapter Registry (Semanas 2-4)

**Objetivo**: Eliminar el acceso directo al FS. Toda consulta de agentes/adapters va a través de un Registry.

**Nuevos componentes**:

```
packages/registry/
  AgentRegistry.mjs      # descubre, indexa, busca agentes
  AdapterRegistry.mjs    # descubre, indexa, busca adaptadores
  CanonicalAgent.mjs     # representación canónica de agente
  index.mjs              # exporta ambos registries
```

**AgentRegistry**:
```js
class AgentRegistry {
  constructor(rootDir)
  loadAll()                          // escanea agents/*.md
  getById(id)                        // busca por id
  getByName(name)                    // busca por filename
  searchByKeyword(keyword)           // busca en keywords
  searchByCapability(capability)     // busca en capabilities
  searchByCategory(category)         // busca por categoría
  resolveDependencies(agentIds)      // resuelve grafo de depends_on
  topologicalSort(agentIds)          // orden topológico para DAG
  all()                              // todos los agentes
}
```

**AdapterRegistry**:
```js
class AdapterRegistry {
  constructor(rootDir)
  loadAll()                          // escanea adapters/*/index.mjs
  getAdapter(platform)               // importa y retorna el adapter
  listPlatforms()                    // plataformas disponibles
  getAdapterManifest(platform)       // metadatos del adapter
}
```

**Representación Canónica**: Los adapters no reciben arrays de objetos planos. Reciben instancias de `CanonicalAgent` con métodos normalizados:

```js
class CanonicalAgent {
  constructor(id, frontmatter, body)
  toOpenCode()                       // transforma a formato OpenCode
  toClaudeCode()                     // transforma a formato Claude Code
  toMarkdown()                       // transforma a Markdown (default)
  serialize()                        // objeto plano
}
```

**Componentes afectados**:
- `tools/export.mjs` — Usa AgentRegistry + AdapterRegistry
- `tools/validate.mjs` — Puede usar AgentRegistry o seguir directo
- `tools/install.mjs` (tools/) — Usa AgentRegistry para filtrar
- `adapters/*/index.mjs` — Reciben `CanonicalAgent[]` en vez de `{name, file, frontmatter, body}[]`

**Backward compatibility**:
- Los adapters actuales reciben `{name, file, frontmatter, body}`. El exportador puede pasar ambos formatos durante la migración (propiedad `legacy` en el agente canónico)
- `CanonicalAgent.toLegacy()` devuelve el formato antiguo
- Timeline: los adapters se actualizan en Fase 2, el exportador deja de pasar legacy en Fase 3

**Entregables**:
- `packages/registry/` con ambos registries
- `tools/export.mjs` migrado a usar registries
- Adapters actualizados a `CanonicalAgent[]`
- Test unitarios de Registry (batería inicial de tests)

**Riesgos**:
- Medio: los adapters actuales dependen del formato `{name, file, frontmatter, body}`. Se debe mantener compatibilidad durante la transición.
- Bajo: rendimiento de import dinámico con 136 agentes. Solución: lazy loading + cache.

---

### Fase 3: Routing Declarativo + Capability Engine (Semanas 4-6)

**Objetivo**: Reemplazar el routing hardcoded del orchestrator por un motor basado en capacidades.

**Nuevos componentes**:

```
packages/router/
  CapabilityEngine.mjs     # matching intención → capacidades
  Router.mjs               # orquesta la selección de agentes
  index.mjs
```

**CapabilityEngine**:
```js
class CapabilityEngine {
  constructor(agentRegistry)
  analyzeIntent(text)                 // NLP ligero: extrae keywords del prompt
  scoreAgent(agent, intent)           // puntúa un agente contra una intención
  findBestMatch(intent, options?)     // top-N agentes para una intención
  expandCapabilities(text)            // de "JWT auth" → [security, auth, backend]
}
```

**Router**:
```js
class Router {
  constructor(agentRegistry, capabilityEngine)
  resolveTask(taskType, prompt)       // devuelve pipeline de agentes
  buildPipeline(agentIds)             // ordena según depends_on/before/after
  suggestAgents(prompt)               // agentes sugeridos para un prompt libre
}
```

**Pipeline DAG dinámico**: El Router no usa pipelines fijos. Construye el DAG en caliente:
1. Detecta task type y extrae capacidades del prompt
2. Consulta AgentRegistry.searchByCapability()
3. Ordena por priority + score
4. Resuelve depends_on/before/after (topological sort)
5. Devuelve niveles de ejecución paralela

**Componentes afectados**:
- `agents/orchestrator.md` — Las reglas de routing cambian de "palabra clave → agente" a "consulta al Registry"
- `ORCHESTRATOR_MATRIX.md` — Los pipelines pasan a ser templates, no rutas fijas
- Los 136 agentes — Necesitan campos `keywords` y `capabilities` poblados (añadidos en Fase 1, ahora se usan)

**Backward compatibility**: El Router puede operar en modo híbrido: si no encuentra match por capacidades, usa el mapeo antiguo como fallback.

**Entregables**:
- CapabilityEngine con matching funcional
- Router integrado con AgentRegistry
- Update de `agents/orchestrator.md` con nuevo flujo de routing
- Tests unitarios de matching y scoring
- Tests de integración: prompt → pipeline de agentes

**Riesgos**:
- Alto: la calidad del capability matching es crítica. Si es mala, el orchestrator elige agentes incorrectos.
  - Mitigación: fuzzy matching + ranking por priority + fallback a routing clásico
- Medio: los 136 agentes necesitan keywords. Se pueden generar automáticamente desde el nombre + descripción (script en Fase 1)

---

### Fase 4: DAG Scheduler + Ejecución Paralela (Semanas 6-8)

**Objetivo**: Convertir la estrategia documentada de paralelismo en un scheduler ejecutable.

**Nuevos componentes**:

```
packages/scheduler/
  DAG.mjs                  # grafo dirigido acíclico
  Scheduler.mjs            # ejecuta niveles en paralelo
  index.mjs
```

**DAG**:
```js
class DAG {
  constructor()
  addNode(id, agent)
  addEdge(fromId, toId)          // from must complete before to
  getLevels()                    // devuelve [[parallel], [parallel], ...]
  topologicalSort()
  validate()                     // detecta ciclos
}
```

**Scheduler**:
```js
class Scheduler {
  constructor(agentRegistry, dag)
  async execute(pipeline, context)  // ejecuta pipeline nivel por nivel
  executeLevel(agents, context)     // lanza agentes en paralelo
  waitForLevel(results)             // recolecta resultados
  buildContext(previousLevels)      // pasa contexto entre niveles
}
```

**Componentes afectados**:
- `agents/orchestrator.md` — La sección "Parallel Execution Strategy" se simplifica. El orchestrator solo llama a `Scheduler.execute(pipeline)`.
- `ORCHESTRATOR_MATRIX.md` — Los pipelines son ahora datos de entrada para el Scheduler.
- Nuevo: `packages/scheduler/`

**Backward compatibility**: El orchestrator puede seguir ejecutando pipelines manualmente. El Scheduler es una opción, no un reemplazo forzoso.

**Entregables**:
- DAG con validación de ciclos y niveles paralelos
- Scheduler que ejecuta niveles en paralelo respetando dependencias
- Integración con el Router (Router.buildPipeline → DAG → Scheduler.execute)
- Tests unitarios de DAG (topological sort, cycle detection)
- Tests de integración Scheduler + Router

**Riesgos**:
- Medio: el Scheduler necesita un mecanismo de Task tool calls. En el contexto actual (OpenCode/Claude Code), el "scheduler" es el propio LLM. No podemos lanzar procesos hijos desde agentes subagentes — solo el orchestrador puede hacer Task calls. La implementación del Scheduler debe limitarse a **planificar el orden y agrupar agentes por nivel**, no a ejecutar procesos.
  - Mitigación: el Scheduler produce una estructura de datos `{ levels: [[agents], [agents], ...] }` que el orchestrator consume para hacer los Task calls en el orden correcto.

---

### Fase 5: Telemetría + Pipeline Reports (Semanas 8-9)

**Objetivo**: Registrar métricas de cada ejecución.

**Nuevos componentes**:

```
packages/telemetry/
  Collector.mjs            # recolecta métricas en tiempo real
  Storage.mjs              # persistencia (JSON Lines / SQLite)
  Reporter.mjs             # genera informes estructurados
  index.mjs
```

**Collector**:
```js
class TelemetryCollector {
  startRun(pipelineId, taskType)
  recordAgentCall(agentId, duration, tokens, model, provider)
  recordError(agentId, error)
  endRun(status)
  getReport()                     // PipelineReport
}
```

**PipelineReport**:
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
    {
      "id": "architect",
      "duration_ms": 8500,
      "tokens": 4200,
      "status": "success"
    }
  ],
  "status": "success",
  "errors": [],
  "timestamp": "2026-07-07T12:00:00Z"
}
```

**Componentes afectados**:
- `agents/orchestrator.md` — El orchestrator debe instrumentar las llamadas
- Nuevo: `packages/telemetry/`

**Backward compatibility**: La telemetría es 100% optativa. Sin collector, el pipeline funciona igual.

**Entregables**:
- TelemetryCollector funcional
- Generación de PipelineReport al finalizar cada pipeline
- Tests unitarios

**Riesgos**:
- Bajo: la telemetría requiere que el orchestrator pase metadata (modelo, proveedor) — esto puede no estar disponible en todos los entornos
- Bajo: el almacenamiento puede generar ruido en el repositorio. Opción: `~/.staffforge/telemetry/` fuera del repo

---

### Fase 6: Taxonomía + Reorganización (Semanas 9-10)

**Objetivo**: Clasificar los 136 agentes en la taxonomía propuesta.

**Categorías**:

| Categoría | Agentes | Ejemplos |
|---|---|---|
| `core` | 8 | orchestrator, architect, git, security, testing, performance, documentation, code-review |
| `technology` | ~90 | python, csharp, fastapi, django, docker, kubernetes, react, vue, ... |
| `domain` | ~15 | backend, frontend, cloud, devops, mobile, ai, data, database, ... |
| `platform` | 6 | opencode, claude-code, cursor, copilot, aider, gemini-cli |
| `utility` | ~15 | refactor, debugging, dependency-audit, secrets, pentest, logging, monitoring, ... |

**Script de migración** (`tools/migrate-categories.mjs`):
```js
// Asigna category basado en heurísticas:
// - Si name está en CORE_AGENTS → core
// - Si name está en TECHNOLOGY_AGENTS → technology
// - Si name está en PLATFORM_AGENTS → platform
// - Si description contiene "specialist" → technology
// - Si description contiene "design" → domain
// - Default → utility
```

**Componentes afectados**:
- Los 136 agentes (añadir campo `category`)
- `ORCHESTRATOR_MATRIX.md` — Posible reorganización de pipelines por categoría
- `README.md` — Nueva sección de taxonomía
- `AGENTS.md` — Actualizar descripción de estructura

**Backward compatibility**: `category` es opcional. Sin categoría, los agentes funcionan igual.

**Entregables**:
- Script de migración
- 136 agentes con categoría asignada
- Documentación de taxonomía actualizada
- Tests de validación de categorías

**Riesgos**:
- Bajo: la clasificación puede ser incorrecta para algunos agentes. Revisión manual necesaria después del script automático.

---

### Fase 7: Testing + Documentación Automática (Semanas 10-12)

**Objetivo**: Crear infraestructura de tests y generación de documentación.

**Test Infrastructure**:

```
tests/
  unit/
    registry/
      AgentRegistry.test.mjs
      AdapterRegistry.test.mjs
    router/
      CapabilityEngine.test.mjs
      Router.test.mjs
    scheduler/
      DAG.test.mjs
    telemetry/
      Collector.test.mjs
  integration/
    pipeline.test.mjs
    export.test.mjs
  e2e/
    agent-to-platform.test.mjs
```

**Auto-documentación** (`tools/generate-docs.mjs`):

```js
class DocumentationGenerator {
  generateAgentCatalog(agents)      // lista completa de agentes
  generateCapabilityCatalog(agents) // capacidades disponibles
  generateDAGDiagram(pipelines)     // graphviz/mermaid DAG
  generatePlatformMatrix(agents, adapters)  // compatibilidad
  generateArchitectureDiagram()     // mermaid architecture
}
```

**Componentes afectados**:
- `package.json` — Nuevo script `test`, `test:unit`, `test:integration`, `test:e2e`
- `tools/` — Nuevo `generate-docs.mjs`
- Nuevo: `tests/`

**Backward compatibility**: Sin cambios en componentes existentes. Tests y docs son añadidos.

**Entregables**:
- Batería completa de tests unitarios (Registry, Router, Scheduler, Telemetry)
- Tests de integración (pipeline completo, exportadores)
- Tests e2e (agente → adapter → plataforma)
- Documentación auto-generada en `docs/` (catalog, capabilities, DAG, platform matrix)

**Riesgos**:
- Medio: los tests e2e requieren que los exportadores funcionen. Deben pasar antes de implementar la fase.
- Bajo: la documentación auto-generada necesita un mecanismo de publish (GH Pages, wiki, etc.)

---

## Resumen de Epics y Sprints

| Fase | Épica | Sprints | Semanas | Depende de |
|---|---|---|---|---|
| 0 | Preparación | 1 sprint | 1 | — |
| 1 | Manifiesto | 2 sprints | 1-2 | Fase 0 |
| 2 | Registry | 3 sprints | 2-4 | Fase 1 |
| 3 | Routing | 3 sprints | 4-6 | Fase 2 |
| 4 | Scheduler | 3 sprints | 6-8 | Fase 3 |
| 5 | Telemetría | 2 sprints | 8-9 | Fase 4 |
| 6 | Taxonomía | 2 sprints | 9-10 | Fase 1 |
| 7 | Testing + Docs | 3 sprints | 10-12 | Fases 1-5 |

**Total**: ~12 semanas, 7 fases, 19 sprints.

---

## DAG de Dependencias entre Fases

```
Fase 0 (Preparación)
  │
  ▼
Fase 1 (Manifiesto) ──────────────────────────┐
  │                                            │
  ▼                                            ▼
Fase 2 (Registry)                        Fase 6 (Taxonomía)
  │
  ▼
Fase 3 (Routing)
  │
  ▼
Fase 4 (Scheduler)
  │
  ▼
Fase 5 (Telemetría)
  │
  ▼
Fase 7 (Testing + Docs) ← requiere Fases 1-5
```

Las fases 2 y 6 pueden ejecutarse en paralelo (dependen de Fase 1, no entre sí).

---

## Riesgos Globales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Capability matching impreciso | Alta | Alto | Fallback a routing clásico; ranking por priority |
| Rotura de adapters existentes | Media | Alto | Compatibilidad legacy durante 2 fases (CanonicalAgent.toLegacy()) |
| 136 agentes sin keywords | Alta | Medio | Script de generación automática desde nombre + descripción |
| Scheduler no ejecutable en IA | Alta | Medio | Scheduler produce plan, orchestrator ejecuta Task calls |
| Migración manual tediosa | Media | Bajo | Scripts automatizados para cada fase |
| Dependencias circulares en DAG | Baja | Medio | DAG.validate() detecta ciclos en tiempo de carga |

---

## Backward Compatibility Matrix

| Cambio | Compatible hacia atrás | Plan de migración |
|---|---|---|
| Nuevos campos en schema (opcionales) | ✅ Sí | Agentes antiguos siguen siendo válidos |
| Registry reemplaza FS directo | ✅ Sí | Registry usa mismo FS internamente |
| Adapters reciben CanonicalAgent | ✅ Sí | `.toLegacy()` devuelve formato antiguo |
| Router con capability matching | ✅ Sí | Fallback a routing hardcoded |
| Scheduler planifica pipelines | ✅ Sí | Modo manual sigue disponible |
| Telemetría | ✅ Sí | Opt-in, no afecta ejecución |
| Categorías en agentes | ✅ Sí | Campo opcional |
| Tests | ✅ Sí | Código existente no se modifica |

---

## Lo que NO cambia

- Los agentes siguen siendo archivos `.md` con frontmatter YAML
- La estructura `agents/`, `adapters/`, `schemas/` se mantiene
- Los exportadores (`node tools/export.mjs`) funcionan igual
- Los pipelines definidos en `ORCHESTRATOR_MATRIX.md` siguen siendo válidos
- Git Flow y sus comandos no cambian
- El CLI installer (`npx github:mjuliac/...`) no cambia
- Los adapters existentes siguen funcionando (con compatibilidad)

---

## Próximos Pasos Inmediatos

1. ✅ Aprobar esta RFC (conversación actual)
2. Crear rama `feature/rfc-001-architecture`
3. Ejecutar Sprint 0: preparación y congelación del estado actual
4. Iniciar Fase 1: schema expandido + template + validate actualizado
5. Commit y push por cada sprint completado
