# RFC-002: Model Intelligence Layer (MIL)

## Análisis y Plan de Implementación

> **Estado**: Análisis completado, pendiente de implementación.
> **Versión objetivo**: v0.3.0
> **Branch**: `feature/rfc-002-model-intelligence`

---

## 1. Contexto

RFC-001 implementó la infraestructura base: AgentRegistry, CapabilityEngine, Router, DAG Scheduler, Telemetría y Taxonomía. Sin embargo, los modelos de IA se seleccionan de forma manual o estática — cada agente está ligado a un modelo fijo.

**Problema**: El framework usa múltiples proveedores (OpenCode, OpenAI, Anthropic, Ollama, OpenRouter) pero no puede elegir inteligentemente qué modelo usar para cada tarea. No hay failover, no hay optimización de costes, no hay aprendizaje.

**Objetivo**: Crear una **Model Intelligence Layer (MIL)** — capa de abstracción que desacople completamente los agentes de los modelos de IA, aplicando Clean Architecture, SOLID y Dependency Inversion.

---

## 2. Estado Actual (Baseline RFC-001)

### 2.1 Componentes existentes que RFC-002 aprovechará

| Componente | Aporte a RFC-002 |
|---|---|
| `AgentRegistry` | Descubrimiento de agentes, consulta por capabilities |
| `CapabilityEngine` | Matching intención → capacidades (reutilizable para modelos) |
| `TelemetryCollector` | Almacena métricas de ejecución (insumo para learning engine) |
| `TelemetryStorage` | Persistencia JSON Lines (reutilizable para histórico de modelos) |
| `AdapterRegistry` | Patrón adapter reutilizable para discovery de modelos |
| `DAG` / `Scheduler` | Orquestación de pipelines (los modelos se asignan por nivel) |
| `Router` | Routing de agentes (los modelos se seleccionan por agente) |

### 2.2 Limitaciones actuales

- Los modelos están hardcodeados en cada agente/entorno
- No hay abstracción entre agente y modelo
- No hay failover automático
- No hay optimización de coste/rendimiento
- No hay aprendizaje histórico
- Cada proveedor requiere configuración manual de modelos

---

## 3. Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────┐
│                    Agent                             │
│  (desconoce modelo, solo pide un "selector")        │
└──────────────────┬──────────────────────────────────┘
                   │ select(task_type, capabilities)
                   ▼
┌──────────────────────────────────────────────────────┐
│                 ModelSelector (Facade)                 │
│  public API: select(), estimateCost(), listAvailable()│
└──────┬──────────────────────┬───────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐    ┌──────────────────┐
│ ModelRegistry│    │  SelectionEngine │
│ (catálogo)   │    │ (algoritmo)      │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│ModelDiscovery│    │  FallbackEngine  │
│ (adapters)   │    │ (failover chain) │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│ ModelProfile │    │  LearningEngine  │
│ (manifiesto) │    │ (histórico)      │
└──────────────┘    └──────────────────┘
```

### 3.1 Flujo de selección

```
1. Agent solicita modelo vía ModelSelector.select(task, capabilities)
2. ModelSelector consulta SelectionEngine con {task, capabilities}
3. SelectionEngine evalúa:
   a. Task Profiles (preferencias configuradas)
   b. ModelRegistry (modelos disponibles)
   c. LearningEngine (histórico de éxitos/fallos)
   d. Políticas (coste, velocidad, local/cloud)
4. Selecciona mejor modelo → lo retorna al agent
5. Si el modelo falla → FallbackEngine prueba siguiente
6. LearningEngine registra resultado de la ejecución
7. Ranking dinámico se actualiza automáticamente
```

---

## 4. Nuevos Componentes

### 4.1 Model Registry (`tools/lib/model-registry.mjs`)

Catálogo central de modelos disponibles. Cada modelo tiene un manifiesto:

```js
class ModelRegistry {
  constructor()
  load()                    // carga modelos desde models/*.yaml + discovery
  register(model)           // registro manual
  findById(id)
  findByProvider(provider)
  findByCapability(capability)
  findByTaskType(taskType)
  findByFamily(family)
  all()
  count()
}
```

**Manifiesto de modelo**:
```yaml
id: deepseek-v4
provider: opencode
family: deepseek
name: deepseek-v4-flash-free
version: "1.0"
context_window: 131072
supports_tools: true
supports_reasoning: true
supports_json: true
supports_streaming: true
cost_per_1k_input: 0
cost_per_1k_output: 0
priority: 80
strengths: [coding, architecture, reasoning]
weaknesses: [creative-writing]
metadata:
  release_date: "2026-01"
```

### 4.2 Model Discovery (`tools/lib/model-discovery.mjs`)

Descubrimiento automático de modelos desde cada proveedor mediante adaptadores.

```js
class ModelDiscovery {
  constructor()
  discoverAll()              // ejecuta todos los adaptadores
  discoverProvider(provider) // ejecuta un adaptador específico
  registerAdapter(provider, adapterFn) // registro de adaptador
  listProviders()
}
```

Adaptadores de discovery:
- `discovery/opencode.mjs` — consulta modelos disponibles en OpenCode
- `discovery/openai.mjs` — consulta API de OpenAI
- `discovery/anthropic.mjs` — consulta API de Anthropic
- `discovery/ollama.mjs` — consulta modelos locales de Ollama
- `discovery/openrouter.mjs` — consulta catálogo de OpenRouter

### 4.3 Model Profiles (`tools/lib/model-profile.mjs`)

Perfiles de selección configurables por tipo de tarea:

```yaml
profiles:
  coding:
    prefer: [deepseek, claude]
    require_tools: true
    min_context: 32768
    max_cost: 0.01

  architecture:
    prefer: [deepseek, gpt-4, claude]
    require_reasoning: true
    min_context: 65536

  documentation:
    prefer: [gemini, claude, gpt-4]
    require_tools: false

  testing:
    prefer: [deepseek, claude, gemini]
    require_tools: true
```

### 4.4 Selection Engine (`tools/lib/selection-engine.mjs`)

Algoritmo de selección inteligente:

```js
class SelectionEngine {
  constructor(modelRegistry, profiles)
  select(taskType, { capabilities, requireTools, requireReasoning, provider })
    → Model
  scoreModel(model, criteria)
    → number (0-100)
  rankModels(models, criteria)
    → Model[]
}
```

**Algoritmo de scoring**:
1. Filtro por capacidades requeridas (ej: `tools=true`)
2. Filtro por proveedor (si se especifica)
3. Scoring weighted:
   - Coincidencia de capacidades: 40%
   - Prioridad/configuración: 25%
   - Histórico de éxito (LearningEngine): 20%
   - Coste (menor = mejor): 10%
   - Disponibilidad: 5%
4. Selección del de mayor score

### 4.5 Fallback Engine (`tools/lib/fallback-engine.mjs`)

Failover automático y transparente:

```js
class FallbackEngine {
  constructor(selectionEngine)
  async executeWithFallback(agent, taskContext, primaryModel)
    → { result, modelUsed, attempts }
  getNextModel(failedModel, taskType)
    → Model | null
  recordFailure(model, error)
  recordSuccess(model, taskType)
}
```

**Cadena de fallback**:
```
Modelo primario → Modelo alternativo (mismo provider)
→ Modelo alternativo (otro provider)
→ Modelo gratuito/local (último recurso)
```

### 4.6 Learning Engine (`tools/lib/learning-engine.mjs`)

Registro y análisis de ejecuciones para mejora continua:

```js
class LearningEngine {
  constructor(storage)
  recordExecution({ model, agent, task, duration, tokens, cost, success, error, retries })
  getModelRanking(taskType, { topN = 5 })
    → { model, avgScore, successRate, avgDuration }[]
  getSuccessRate(modelId, taskType)
    → number
  getAverageCost(modelId)
    → number
  generateRankings()
    → { taskType: ranking[] }
}
```

### 4.7 Model Selector (Facade) (`tools/lib/model-selector.mjs`)

API pública que unifica todos los componentes anteriores:

```js
class ModelSelector {
  constructor(registry, selectionEngine, fallbackEngine, learningEngine)
  select(taskType, { capabilities, requireTools, provider, strategy })
    → Model
  estimateCost(model, tokens)
    → number
  listAvailable({ taskType, provider, minContext })
    → Model[]
  getRanking(taskType)
    → Ranking
  configure(policy)
    → void
}
```

---

## 5. Plan de Implementación (Fases)

### Fase 0: Preparación (Sprint 1)

**Objetivo**: Setup de estructura de modelos.

- Crear `models/` directory con modelos conocidos en YAML
- Crear `tools/lib/model-registry.mjs` (carga desde FS + YAML)
- Crear schema de manifiesto `schemas/model.schema.json`
- Tests unitarios del registry

**Entregables**:
- `models/*.yaml` — catálogo inicial (~20 modelos)
- `tools/lib/model-registry.mjs` — ModelRegistry
- `schemas/model.schema.json` — validación de manifiestos

**Riesgos**: Bajo. Es puramente aditivo, no afecta a nada existente.

---

### Fase 1: Discovery + Profiles (Sprint 2)

**Objetivo**: Descubrimiento automático y perfiles configurables.

- Crear `tools/lib/model-discovery.mjs` (adaptadores por provider)
- Crear `tools/lib/model-profile.mjs` (perfiles YAML)
- Crear `discovery/` con adaptador para OpenCode
- Configuración predeterminada en `models/profiles.yaml`

**Entregables**:
- ModelDiscovery con discovery/openCode.mjs
- ModelProfile con profiles.yaml
- Tests de discovery y profiles

**Riesgos**: Medio. OpenCode no expone API pública de modelos; dependerá de parsing de configuración local.

---

### Fase 2: Selection Engine (Sprint 3)

**Objetivo**: Algoritmo de selección inteligente.

- Crear `tools/lib/selection-engine.mjs`
- Implementar scoring weighted (capacidades, prioridad, coste, histórico)
- Integrar con ModelRegistry y ModelProfile
- Tests de scoring y selección

**Entregables**:
- SelectionEngine funcional
- Tests de selección en múltiples escenarios (caro/rápido, local/cloud, etc.)

**Riesgos**: Medio. La calidad del scoring depende de la precisión de los manifiestos.

---

### Fase 3: Fallback Engine (Sprint 4)

**Objetivo**: Failover automático.

- Crear `tools/lib/fallback-engine.mjs`
- Implementar cadena de fallback progresiva
- Tests de fallback: quota, timeout, auth error, rate limit

**Entregables**:
- FallbackEngine con cadena configurable
- Tests de todos los modos de fallo

**Riesgos**: Bajo. Lógica determinista, bien testeable.

---

### Fase 4: Learning Engine (Sprint 5)

**Objetivo**: Mejora continua basada en histórico.

- Crear `tools/lib/learning-engine.mjs`
- Integrar con TelemetryStorage (reutilizar `~/.staffforge/telemetry/`)
- Ranking dinámico
- Tests de ranking y estadísticas

**Entregables**:
- LearningEngine con ranking dinámico
- Tests de aprendizaje y rankings

**Riesgos**: Bajo. Reusa TelemetryStorage existente.

---

### Fase 5: Model Selector Facade + Integración (Sprint 6)

**Objetivo**: API pública unificada e integración con el framework.

- Crear `tools/lib/model-selector.mjs` (facade)
- Integrar con Orchestrator (los agentes ya no conocen modelos)
- Integrar con Router (sugerencia de modelo por tipo de tarea)
- Políticas configurables (strategy, prefer_free, prefer_local, etc.)
- Tests de integración: pipeline completo con selección automática

**Entregables**:
- ModelSelector funcional
- Orchestrator integrado con MIL
- Tests de integración pipeline + MIL

**Riesgos**: Alto. La integración con Orchestrator cambia el comportamiento actual. Requiere backward compatibility estricta.

---

### Fase 6: Testing + Documentación (Sprint 7)

**Objetivo**: Cobertura completa y documentación.

- Tests unitarios de todos los componentes
- Tests de integración (selector → fallback → learning)
- Tests e2e (agente → modelo → resultado)
- Documentación: RFC-002, README, ARCHITECTURE.md
- Generación automática de ranking report

**Entregables**:
- 100% coverage en MIL
- Documentación completa
- Ranking report auto-generado

**Riesgos**: Bajo.

---

## 6. DAG de Dependencias entre Fases

```
Fase 0 (Model Registry)
  │
  ▼
Fase 1 (Discovery + Profiles)
  │
  ▼
Fase 2 (Selection Engine)
  │
  ├─────────────────┐
  ▼                 ▼
Fase 3 (Fallback)  Fase 4 (Learning Engine)
  │                 │
  └────────┬────────┘
           ▼
Fase 5 (Facade + Integración)
           │
           ▼
Fase 6 (Testing + Docs)
```

Las fases 3 y 4 pueden ejecutarse en paralelo (dependen de Fase 2, no entre sí).

---

## 7. Resumen de Epics y Sprints

| Fase | Épica | Sprints | Depende de |
|---|---|---|---|
| 0 | Model Registry | 1 | — |
| 1 | Discovery + Profiles | 1 | Fase 0 |
| 2 | Selection Engine | 1 | Fase 1 |
| 3 | Fallback Engine | 1 | Fase 2 |
| 4 | Learning Engine | 1 | Fase 2 |
| 5 | Facade + Integración | 1 | Fase 3 + 4 |
| 6 | Testing + Docs | 1 | Fase 5 |

**Total**: ~7 sprints, 6 fases (3-4 semanas estimadas).

---

## 8. Componentes Afectados

| Componente | Cambio | Impacto |
|---|---|---|
| `agents/orchestrator.md` | Integrar ModelSelector para selección de modelos | Alto |
| `tools/lib/agent-registry.mjs` | Posible integración con ModelRegistry | Bajo |
| `tools/lib/router.mjs` | Sugerencia de modelo por tipo de tarea | Medio |
| `tools/lib/telemetry/` | LearningEngine reusa TelemetryStorage | Bajo |
| `tools/lib/adapter-registry.mjs` | Inspiración para discovery adapters | Bajo |
| `tools/validate.mjs` | Validación de manifiestos de modelos | Bajo |
| `tools/export.mjs` | Posible inclusión de modelo en export | Medio |
| `package.json` | Posibles dependencias nuevas | Bajo |

---

## 9. Riesgos Globales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| OpenCode/Claude Code no exponen API de modelos | Alta | Medio | Discovery via configuración local + parsing de respuesta |
| Scoring impreciso lleva a mala selección | Media | Alto | Ponderación configurable + fallback automático |
| Fallback en bucle infinito | Baja | Alto | Límite de reintentos (default 3) + timeout |
| Learning Engine sin datos iniciales | Alta | Bajo | Rankings por defecto hasta acumular histórico |
| Integración con Orchestrator rompe flujo actual | Media | Alto | MIL opt-in, modo legacy disponible |
| Coste acumulado por fallos | Baja | Medio | Política prefer_free + límite de coste por ejecución |

---

## 10. Backward Compatibility

| Cambio | Compatible | Plan |
|---|---|---|
| Nuevos modelos en `models/*.yaml` | ✅ Sí | No afecta nada existente |
| SelectionEngine reemplaza selección manual | ✅ Sí | Modo legacy (selección manual) coexiste |
| FallbackEngine | ✅ Sí | Opt-in, no se activa sin configuración |
| LearningEngine | ✅ Sí | Opt-in, datos en `~/.staffforge/` fuera del repo |
| ModelSelector en Orchestrator | ⚠️ Parcial | MIL se integra sin cambiar API de agentes |
| AgentRegistry integración con modelos | ✅ Sí | Aditivo, no modifica API existente |

---

## 11. Lo que NO cambia

- Los agentes siguen siendo archivos `.md` con frontmatter YAML
- Los pipelines definidos en ORCHESTRATOR_MATRIX.md no cambian
- Los exportadores funcionan igual
- La estructura `agents/`, `adapters/`, `schemas/` se mantiene
- Git Flow y sus comandos no cambian
- Los adapters existentes no se modifican
- La telemetría sigue siendo optativa

---

## 12. Próximos Pasos

1. ✅ Aprobar análisis RFC-002 (este documento)
2. Crear rama `feature/rfc-002-model-intelligence`
3. Ejecutar Fase 0: modelos iniciales + ModelRegistry
4. Commit y push por cada sprint completado
5. Al finalizar: merge a develop + tag v0.3.0
