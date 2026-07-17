# StaffForge-AI: Detailed Implementation Guide

> **⚠️ PLANNED IMPROVEMENTS — NOT YET IMPLEMENTED**
>
> This guide describes 6 planned enhancements for future releases. The files,
> line numbers, and code snippets are draft proposals — none have been implemented.
> Current Guardrails (Input/Runtime/Output) are in `packages/core/lib/guardrails/`.
> See `CHANGELOG.md` and `ARCHITECTURE.md` §2 for currently shipped features.

## 📋 Overview
Esta es una guía paso a paso para implementar las 6 mejoras críticas en el proyecto StaffForge-AI.

---

# FASE 1: Mejoras Inmediatas (Semana 1-2)

## MEJORA 1: Error Handling Framework
**Archivos a crear/modificar:** 3
**Esfuerzo:** 4-6 horas

### 1.1 Crear archivo de configuración de errores
**Archivo:** `packages/core/lib/error-handler.mjs`
**Línea:** NEW FILE

```javascript
// packages/core/lib/error-handler.mjs

export const ERROR_LEVELS = {
  CRITICAL: 'critical',    // VCS fail, architect fail → ABORT
  WARNING: 'warning',      // Test fail → CONTINUE_ALERT
  INFO: 'info'             // Docs incomplete → CONTINUE
};

export const ERROR_SEVERITY = {
  [ERROR_LEVELS.CRITICAL]: { action: 'ABORT', notify: ['user', 'logs'], rollback: true },
  [ERROR_LEVELS.WARNING]: { action: 'CONTINUE_ALERT', notify: ['agent'], flag: 'review_required' },
  [ERROR_LEVELS.INFO]: { action: 'CONTINUE', notify: ['logger'] }
};

export class PipelineError extends Error {
  constructor(message, level = ERROR_LEVELS.WARNING, context = {}) {
    super(message);
    this.name = 'PipelineError';
    this.level = level;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export async function handlePipelineError(error, taskName, piplineState) {
  const severity = ERROR_SEVERITY[error.level] || ERROR_SEVERITY[ERROR_LEVELS.WARNING];
  
  // Log error
  console.error(`[${error.timestamp}] ${error.level.toUpperCase()} in ${taskName}: ${error.message}`, error.context);
  
  // Decide action
  if (severity.action === 'ABORT') {
    // Save checkpoint before abort
    await saveCheckpoint(piplineState, `pre-abort-${taskName}`);
    throw new Error(`Pipeline aborted: ${error.message}`);
  }
  
  if (severity.action === 'CONTINUE_ALERT') {
    // Flag for review
    piplineState.issues = piplineState.issues || [];
    piplineState.issues.push({
      agent: taskName,
      severity: error.level,
      message: error.message,
      context: error.context,
      requiresReview: true
    });
  }
  
  return severity;
}

async function saveCheckpoint(state, name) {
  // TODO: Guardar checkpoint en git (tag vcs/checkpoint-{timestamp})
  console.log(`Checkpoint saved: ${name}`);
}
```

### 1.2 Actualizar Pipeline Executor
**Archivo:** `packages/core/lib/pipeline-executor.mjs`
**Buscar línea:** `class PipelineExecutor` (aprox. línea 15)
**Reemplazar sección:** Método `executeLevel()`

**Código ACTUAL (aproximadamente línea 50-80):**
```javascript
async executeLevel(level, context) {
  const results = {};
  for (const task of level.tasks) {
    results[task.name] = await this.executeTask(task, context);
  }
  return results;
}
```

**Código NUEVO:**
```javascript
async executeLevel(level, context, errorHandler) {
  const results = {};
  const errors = [];
  
  for (const task of level.tasks) {
    try {
      results[task.name] = await this.executeTask(task, context);
    } catch (error) {
      const severity = await errorHandler.handlePipelineError(
        error, 
        task.name, 
        { ...context, currentLevel: level.name }
      );
      
      if (severity.action === 'ABORT') {
        throw error;
      }
      
      errors.push({ task: task.name, error, severity });
      results[task.name] = { error: error.message, status: 'FAILED' };
    }
  }
  
  context.levelErrors = errors;
  return results;
}
```

### 1.3 Integración en Orchestrator
**Archivo:** `agents/orchestrator.md`
**Buscar línea:** `## Mission` (línea ~35)
**Agregar DESPUÉS del párrafo de misión:**

```markdown
## Error Handling Strategy

### Error Levels
- **CRITICAL**: VCS fail, architect fail → ABORT pipeline + rollback to checkpoint
- **WARNING**: Test failures → CONTINUE with alert flag + code review required
- **INFO**: Docs incomplete → CONTINUE silently

### Handling Rules
1. VCS operations are transactional: on failure, checkpoint exists and can be restored
2. Non-critical agent failures are logged but don't block pipeline
3. All errors are tracked in execution context for post-analysis
4. User is notified of all CRITICAL and WARNING errors
```

---

## MEJORA 2: Agent Validation + Schema
**Archivos a crear/modificar:** 2
**Esfuerzo:** 3-4 horas

### 2.1 Crear validador de agentes
**Archivo:** `packages/core/lib/agent-validator.mjs`
**Línea:** NEW FILE

```javascript
// packages/core/lib/agent-validator.mjs

import { readFile } from 'fs/promises';
import { join } from 'path';

const AGENT_SCHEMA = {
  required: ['id', 'name', 'mode', 'category', 'description', 'tools', 'capabilities', 'keywords'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9-]+$' },
    name: { type: 'string' },
    mode: { type: 'string', enum: ['primary', 'secondary', 'utility'] },
    category: { type: 'string' },
    description: { type: 'string' },
    tools: { type: 'object' },
    capabilities: { type: 'array' },
    keywords: { type: 'array', items: { type: 'string' } }
  }
};

export class AgentValidationError extends Error {
  constructor(agentName, message, missing = []) {
    super(`Agent validation failed for "${agentName}": ${message}`);
    this.name = 'AgentValidationError';
    this.agentName = agentName;
    this.missing = missing;
  }
}

export async function validateAgent(agentName, agentPath) {
  try {
    // 1. ¿Existe el archivo?
    const content = await readFile(agentPath, 'utf-8');
    
    // 2. Parse YAML frontmatter
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!yamlMatch) {
      throw new AgentValidationError(
        agentName,
        'Missing YAML frontmatter',
        ['---...---']
      );
    }
    
    const agentSpec = parseYAML(yamlMatch[1]);
    
    // 3. Validar campos requeridos
    const missing = AGENT_SCHEMA.required.filter(field => !agentSpec[field]);
    if (missing.length > 0) {
      throw new AgentValidationError(
        agentName,
        `Missing required fields: ${missing.join(', ')}`,
        missing
      );
    }
    
    // 4. Validar tipos
    for (const [field, fieldSchema] of Object.entries(AGENT_SCHEMA.properties)) {
      if (field in agentSpec) {
        if (fieldSchema.enum && !fieldSchema.enum.includes(agentSpec[field])) {
          throw new AgentValidationError(
            agentName,
            `Invalid value for "${field}": must be one of ${fieldSchema.enum.join(', ')}`
          );
        }
      }
    }
    
    return { valid: true, spec: agentSpec };
  } catch (error) {
    if (error instanceof AgentValidationError) {
      throw error;
    }
    throw new AgentValidationError(agentName, error.message);
  }
}

function parseYAML(content) {
  // Simplified YAML parser for frontmatter
  const lines = content.split('\n');
  const result = {};
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Parse arrays: tools: {write: true, bash: true}
      if (value.startsWith('{')) {
        result[key] = {};
        // Basic object parsing
      } else if (value.startsWith('[')) {
        result[key] = JSON.parse(value);
      } else if (value === 'true' || value === 'false') {
        result[key] = value === 'true';
      } else {
        result[key] = value.replace(/['"]/g, '');
      }
    }
  }
  
  return result;
}

export async function validateAgentRegistry(agentsPath) {
  const agents = await loadAgentsFromPath(agentsPath);
  const results = {
    valid: [],
    invalid: [],
    errors: []
  };
  
  for (const [name, path] of agents) {
    try {
      const validation = await validateAgent(name, path);
      results.valid.push({ name, spec: validation.spec });
    } catch (error) {
      results.invalid.push({ name, error: error.message });
      results.errors.push(error);
    }
  }
  
  return results;
}

async function loadAgentsFromPath(path) {
  // TODO: Load all .md files from agents/ directory
  return [];
}
```

### 2.2 Actualizar Pipeline Executor para validación
**Archivo:** `packages/core/lib/pipeline-executor.mjs`
**Buscar línea:** `constructor(agentRegistry)` (aprox. línea 10)
**Agregar DESPUÉS de constructor (aprox. línea 25):**

```javascript
async validateAgentBeforeDelegation(agentName) {
  const agentPath = this.agentRegistry.getAgentPath(agentName);
  
  if (!agentPath) {
    throw new Error(`Agent not found: ${agentName}`);
  }
  
  const validation = await validateAgent(agentName, agentPath);
  
  if (!validation.valid) {
    throw new AgentValidationError(
      agentName,
      `Agent validation failed: missing capabilities`
    );
  }
  
  return validation.spec;
}

async delegate(agentName, prompt, context) {
  // 1. Validar agente ANTES de delegar
  const agentSpec = await this.validateAgentBeforeDelegation(agentName);
  
  // 2. Procesar delegación
  return await this.task(agentName, prompt);
}
```

---

## MEJORA 3: Token Logging + Budgeting
**Archivos a crear/modificar:** 2
**Esfuerzo:** 3-4 horas

### 3.1 Crear token tracker
**Archivo:** `packages/core/lib/token-tracker.mjs`
**Línea:** NEW FILE

```javascript
// packages/core/lib/token-tracker.mjs

export class TokenTracker {
  constructor(initialBudget = 190000) {
    this.initialBudget = initialBudget;
    this.used = 0;
    this.remaining = initialBudget;
    this.byAgent = {};
    this.trace = [];
    this.warnings = [];
  }
  
  trackAgentCall(agentName, tokensUsed) {
    this.used += tokensUsed;
    this.remaining = this.initialBudget - this.used;
    
    // Track per agent
    if (!this.byAgent[agentName]) {
      this.byAgent[agentName] = 0;
    }
    this.byAgent[agentName] += tokensUsed;
    
    // Track execution trace
    this.trace.push({
      ts: new Date().toISOString(),
      agent: agentName,
      tokens: tokensUsed,
      remaining: this.remaining,
      percentage: ((this.used / this.initialBudget) * 100).toFixed(1)
    });
    
    // Warning if exceeding expected percentage
    const expectedPercent = 10; // 10% per major agent
    const actualPercent = ((this.byAgent[agentName] / this.initialBudget) * 100);
    if (actualPercent > expectedPercent) {
      this.warnings.push({
        agent: agentName,
        expected: expectedPercent,
        actual: actualPercent.toFixed(1),
        message: `⚠️ ${agentName} consumed ${actualPercent.toFixed(1)}% of budget (expected: ${expectedPercent}%)`
      });
    }
    
    // Critical warning if <10% remaining
    if (this.remaining / this.initialBudget < 0.1) {
      this.warnings.push({
        level: 'CRITICAL',
        message: `⛔ Critical: Only ${((this.remaining / this.initialBudget) * 100).toFixed(1)}% of token budget remaining!`
      });
    }
  }
  
  getCompressedContextBlock() {
    return {
      TOKEN_BUDGET: {
        initial: this.initialBudget,
        used: this.used,
        remaining: this.remaining,
        percentageUsed: ((this.used / this.initialBudget) * 100).toFixed(1),
        by_agent: this.byAgent,
        warnings: this.warnings
      },
      EXECUTION_TRACE: this.trace.slice(-10) // Last 10 entries
    };
  }
  
  toMarkdown() {
    let md = '## Token Usage Report\n\n';
    md += `**Initial Budget:** ${this.initialBudget.toLocaleString()} tokens\n`;
    md += `**Used:** ${this.used.toLocaleString()} (${((this.used / this.initialBudget) * 100).toFixed(1)}%)\n`;
    md += `**Remaining:** ${this.remaining.toLocaleString()} (${((this.remaining / this.initialBudget) * 100).toFixed(1)}%)\n\n`;
    
    md += '### By Agent\n';
    for (const [agent, tokens] of Object.entries(this.byAgent)) {
      const percent = ((tokens / this.initialBudget) * 100).toFixed(1);
      md += `- **${agent}**: ${tokens.toLocaleString()} tokens (${percent}%)\n`;
    }
    
    if (this.warnings.length > 0) {
      md += '\n### ⚠️ Warnings\n';
      for (const warning of this.warnings) {
        md += `- ${warning.message}\n`;
      }
    }
    
    return md;
  }
}
```

### 3.2 Actualizar Orchestrator para logging
**Archivo:** `agents/orchestrator.md`
**Buscar línea:** `## Compressed Context Block` (aprox. línea 220)
**Reemplazar párrafo completo:**

**CÓDIGO ACTUAL:**
```markdown
### Compressed Context Block (mandatory before every output)
```
PROJECT
- Name: StaffForge AI Agent Framework
...
```
```

**CÓDIGO NUEVO:**
```markdown
### Compressed Context Block (mandatory before every output)
```
PROJECT
- Name: StaffForge AI Agent Framework
- Version: 2.6.0
- Stack: Node.js ESM, YAML frontmatter agents

DECISIONS
- Git flow mandatory (git provider)
- Orchestrator never runs VCS directly
- All agents validate against JSON Schema

TOKEN_BUDGET
- Initial: 190,000
- Used: [X] ([Y]%)
- Remaining: [Z] ([W]%)
- By Agent:
  - @architect: 18,500 tokens (9.7%)
  - @code-review: 24,630 tokens (13%)
  - (others...)
- ⚠️ Warnings:
  - @code-review consumed 13% of budget (expected: 10%)

EXECUTION_TRACE (last 5 steps)
- [timestamp] @vcs: ✅ branch created (tokens: 2,100)
- [timestamp] @architect: ✅ design approved (tokens: 18,500)
- [timestamp] @impact: ⚠️ TIMEOUT (tokens: 8,900)

OPEN_TASKS
- (varies per session)

KNOWN_ISSUES
- (varies per session)

NEXT_STEP
- (current immediate action)
```
```

---

# FASE 2: Mejoras Arquitectónicas (Semana 3-4)

## MEJORA 4: Transactional VCS + Checkpoints
**Archivos a crear/modificar:** 2
**Esfuerzo:** 6-8 horas

### 4.1 Crear sistema de transacciones VCS
**Archivo:** `packages/core/lib/vcs/vcs-transaction.mjs`
**Línea:** NEW FILE

```javascript
// packages/core/lib/vcs/vcs-transaction.mjs

export const VCS_TRANSACTION_TYPES = {
  BRANCH_CREATE: 'branch-create',
  CODE_COMMIT: 'code-commit',
  FINAL_MERGE: 'final-merge'
};

export const TRANSACTION_CONFIG = {
  [VCS_TRANSACTION_TYPES.BRANCH_CREATE]: {
    idempotent: true,
    rollback: 'delete branch',
    checkpoint: false
  },
  [VCS_TRANSACTION_TYPES.CODE_COMMIT]: {
    idempotent: false,
    checkpoint: true,
    rollback: 'revert commit'
  },
  [VCS_TRANSACTION_TYPES.FINAL_MERGE]: {
    idempotent: false,
    checkpoint: true,
    rollback: 'revert merge + recreate branch'
  }
};

export class VCSTransaction {
  constructor(vcsManager) {
    this.vcsManager = vcsManager;
    this.transactions = [];
    this.checkpoints = [];
    this.isRolledBack = false;
  }
  
  async createCheckpoint(name) {
    const checkpointName = `vcs/checkpoint-${name}-${Date.now()}`;
    
    try {
      await this.vcsManager.createTag(checkpointName);
      this.checkpoints.push({
        name: checkpointName,
        timestamp: new Date().toISOString(),
        status: 'created'
      });
      console.log(`✅ Checkpoint created: ${checkpointName}`);
      return checkpointName;
    } catch (error) {
      console.error(`❌ Failed to create checkpoint: ${error.message}`);
      throw error;
    }
  }
  
  async executeTransactionWithCheckpoint(type, operation) {
    const config = TRANSACTION_CONFIG[type];
    
    if (!config) {
      throw new Error(`Unknown transaction type: ${type}`);
    }
    
    // 1. Create checkpoint before transaction if needed
    let checkpoint = null;
    if (config.checkpoint) {
      checkpoint = await this.createCheckpoint(type);
    }
    
    // 2. Execute transaction
    try {
      const result = await operation();
      
      this.transactions.push({
        type,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        checkpoint,
        result
      });
      
      return result;
    } catch (error) {
      // 3. Rollback if checkpoint exists
      if (checkpoint && config.rollback) {
        await this.rollbackToCheckpoint(checkpoint, config.rollback);
      }
      
      this.transactions.push({
        type,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        checkpoint,
        error: error.message
      });
      
      throw error;
    }
  }
  
  async rollbackToCheckpoint(checkpointName, action) {
    console.log(`🔄 Rolling back to ${checkpointName}...`);
    console.log(`   Action: ${action}`);
    
    try {
      // Git: checkout commit associated with tag
      await this.vcsManager.checkoutTag(checkpointName);
      
      this.isRolledBack = true;
      console.log(`✅ Rollback completed`);
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`);
      throw error;
    }
  }
  
  getTransactionLog() {
    return {
      transactions: this.transactions,
      checkpoints: this.checkpoints,
      isRolledBack: this.isRolledBack
    };
  }
}
```

### 4.2 Actualizar VCS Manager
**Archivo:** `packages/core/lib/vcs/vcs-manager.mjs`
**Buscar línea:** `class VCSManager` (aprox. línea 20)
**Agregar DESPUÉS del constructor:**

```javascript
// Around line 50 - Add transactional methods

async createTagWithCheckpoint(checkpointName) {
  const command = `git tag -a ${checkpointName} -m "Pipeline checkpoint: ${new Date().toISOString()}"`;
  return await this.executeCommand(command);
}

async checkoutTag(tagName) {
  const command = `git checkout ${tagName}`;
  return await this.executeCommand(command);
}

async createBranchWithTransaction(branchName, fromBranch = 'develop') {
  // Transactional branch creation: if fails, clean up
  try {
    await this.createBranch(branchName, fromBranch);
    return { success: true, branch: branchName };
  } catch (error) {
    // Cleanup on failure
    await this.deleteBranch(branchName).catch(() => {}); // Ignore cleanup errors
    throw error;
  }
}

async mergeBranchWithTransaction(sourceBranch, targetBranch, options = {}) {
  const backupTagName = `vcs/pre-merge-${Date.now()}`;
  
  // Backup before merge
  await this.createTagWithCheckpoint(backupTagName);
  
  try {
    return await this.mergeBranch(sourceBranch, targetBranch, options);
  } catch (error) {
    // Restore on failure
    console.log(`Merge failed, restoring from ${backupTagName}`);
    await this.checkoutTag(backupTagName);
    throw error;
  }
}
```

---

## MEJORA 5: Compresión automática de prompts
**Archivos a crear/modificar:** 1
**Esfuerzo:** 4-5 horas

### 5.1 Crear optimizador de prompts
**Archivo:** `packages/core/lib/prompt-optimizer.mjs`
**Línea:** NEW FILE

```javascript
// packages/core/lib/prompt-optimizer.mjs

const COMPRESSION_RULES = {
  // 1. Remove boilerplate
  removeBoilerplate: (prompt) => {
    const patterns = [
      /Please help me/gi,
      /I need you to/gi,
      /Can you help me/gi,
      /Would you mind/gi,
      /If possible/gi,
      /Thank you/gi
    ];
    
    let optimized = prompt;
    for (const pattern of patterns) {
      optimized = optimized.replace(pattern, '');
    }
    
    return optimized.replace(/\s+/g, ' ').trim();
  },
  
  // 2. Use structured facts instead of prose
  proseToStructured: (prompt) => {
    // Convert narrative paragraphs to key:value facts
    // "The user wants to add a feature that validates emails in forms"
    // → "Feature: email validation in forms"
    
    return prompt;
  },
  
  // 3. Reference file paths instead of quoting
  replaceQuotesWithReferences: (prompt) => {
    return prompt.replace(
      /I found this code:[\s\S]*?function/,
      'Code in src/auth.js:15-42: function'
    );
  },
  
  // 4. Compress repeated context
  deduplicateContext: (current, previous) => {
    if (!previous) return current;
    
    // Remove sentences that are similar to previous context
    const prevSentences = previous.split(/[.!?]/);
    const currSentences = current.split(/[.!?]/);
    
    const newInfo = currSentences.filter(sentence => {
      return !prevSentences.some(prev => 
        similarity(sentence, prev) > 0.8
      );
    });
    
    return newInfo.join('. ').trim();
  }
};

export class PromptOptimizer {
  constructor(rules = COMPRESSION_RULES) {
    this.rules = rules;
  }
  
  async optimize(prompt, options = {}) {
    const {
      targetReduction = 0.70,    // 70% target
      preserveIntent = true,
      validateSchema = true,
      previousContext = null
    } = options;
    
    let optimized = prompt;
    
    // 1. Apply boilerplate removal
    optimized = this.rules.removeBoilerplate(optimized);
    
    // 2. Compress repeated context
    if (previousContext) {
      optimized = this.rules.deduplicateContext(optimized, previousContext);
    }
    
    // 3. Validate compression ratio
    const ratio = optimized.length / prompt.length;
    if (ratio > (1 - targetReduction)) {
      console.warn(`⚠️ Compression ratio ${(ratio * 100).toFixed(1)}% exceeds target ${(targetReduction * 100).toFixed(1)}%`);
    }
    
    return {
      original: prompt,
      optimized,
      ratio: ratio,
      savings: prompt.length - optimized.length,
      targetAchieved: ratio <= (1 - targetReduction)
    };
  }
}

function similarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1, str2) {
  const costs = [];
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }
  return costs[str2.length];
}
```

### 5.2 Integración en Orchestrator
**Archivo:** `agents/orchestrator.md`
**Buscar línea:** `## Pipeline Execution` (aprox. línea 310)
**Reemplazar sección:**

**CÓDIGO ACTUAL:**
```markdown
**Before delegating to ANY subagent, compress the prompt** using `@prompt-base` rules:
strip boilerplate, use structured facts, eliminate duplicate context from previous delegations.
```

**CÓDIGO NUEVO:**
```markdown
### Automatic Prompt Compression

**Before delegating to ANY subagent:**
1. Apply boilerplate removal via `PromptOptimizer`
2. Remove repeated context from previous delegations
3. Convert prose paragraphs to key:value facts
4. Reference file paths instead of quoting code blocks
5. Target 70% compression ratio minimum

**Example:**
```
// BEFORE (245 tokens)
"Please help me understand the architecture. I found in the user's request that they want to 
add a new feature for email validation in forms. The code is quite complex with multiple 
functions that handle..."

// AFTER (73 tokens, 70% reduction)
"Feature: email validation in forms
Status: add new
Complexity: high
Files affected: src/forms.js, src/validators.js"
```

All delegation happens through `orchestrator.delegate()` which automatically compresses prompts.
```

---

## MEJORA 6: Timeout + Graceful Degradation
**Archivos a crear/modificar:** 1
**Esfuerzo:** 3-4 horas

### 6.1 Crear config de timeouts
**Archivo:** `packages/core/lib/execution-config.mjs`
**Línea:** NEW FILE

```javascript
// packages/core/lib/execution-config.mjs

export const EXECUTION_TIMEOUTS = {
  perAgent: 30000,          // 30 segundos por agente
  perLevel: 120000,         // 2 minutos por nivel
  totalPipeline: 600000     // 10 minutos total
};

export const DEGRADATION_STRATEGY = {
  strategy: 'skip_lowest_priority',
  
  agents: {
    '@performance': {
      priority: 'low',
      action: 'skip',
      notifyAgent: '@code-review',
      fallback: 'generic performance check'
    },
    '@testing': {
      priority: 'high',
      action: 'ABORT',  // Never skip testing
      notifyAgent: null
    },
    '@documentation': {
      priority: 'low',
      action: 'skip',
      notifyAgent: 'user',
      fallback: 'auto-generated docs'
    },
    '@security': {
      priority: 'critical',
      action: 'ABORT',
      notifyAgent: null
    }
  },
  
  onTimeout(agentName, elapsedMs) {
    const config = this.agents[agentName];
    
    if (!config) {
      return { action: 'CONTINUE' };
    }
    
    console.warn(`⏱️ Timeout on ${agentName} after ${(elapsedMs / 1000).toFixed(1)}s`);
    console.log(`   Priority: ${config.priority}`);
    console.log(`   Action: ${config.action}`);
    
    if (config.action === 'ABORT') {
      throw new Error(`Critical agent timeout: ${agentName}`);
    }
    
    if (config.action === 'skip') {
      console.log(`   Fallback: ${config.fallback}`);
      return {
        action: 'skip',
        fallback: config.fallback,
        notifyAgent: config.notifyAgent
      };
    }
    
    return { action: 'CONTINUE' };
  }
};

export class ExecutionLimiter {
  constructor(timeouts = EXECUTION_TIMEOUTS) {
    this.timeouts = timeouts;
    this.startTime = Date.now();
    this.agentStartTimes = {};
    this.skippedAgents = [];
  }
  
  startAgent(agentName) {
    this.agentStartTimes[agentName] = Date.now();
  }
  
  async checkTimeout(agentName) {
    const elapsed = Date.now() - this.agentStartTimes[agentName];
    
    if (elapsed > this.timeouts.perAgent) {
      const degradation = DEGRADATION_STRATEGY.onTimeout(agentName, elapsed);
      
      if (degradation.action === 'skip') {
        this.skippedAgents.push({
          agent: agentName,
          reason: 'timeout',
          fallback: degradation.fallback
        });
      } else if (degradation.action === 'ABORT') {
        throw new Error(`Agent timeout (critical): ${agentName} took ${(elapsed / 1000).toFixed(1)}s`);
      }
      
      return degradation;
    }
    
    const totalElapsed = Date.now() - this.startTime;
    if (totalElapsed > this.timeouts.totalPipeline) {
      throw new Error(`Total pipeline timeout: ${(totalElapsed / 1000).toFixed(1)}s exceeded`);
    }
    
    return { action: 'CONTINUE' };
  }
  
  getReport() {
    const totalTime = Date.now() - this.startTime;
    return {
      totalExecutionTime: `${(totalTime / 1000).toFixed(1)}s`,
      timeoutLimit: `${(this.timeouts.totalPipeline / 1000).toFixed(1)}s`,
      skippedAgents: this.skippedAgents,
      status: totalTime > this.timeouts.totalPipeline ? 'TIMEOUT' : 'OK'
    };
  }
}
```

### 6.2 Integrar en Orchestrator
**Archivo:** `agents/orchestrator.md`
**Agregar nueva sección ANTES de "## Deliverables":**

```markdown
## Timeout & Graceful Degradation

### Timeout Configuration
- **Per Agent**: 30 seconds max
- **Per Level**: 2 minutes max  
- **Total Pipeline**: 10 minutes max

### Priority-Based Degradation
1. **CRITICAL** (@security, @testing): ABORT on timeout
2. **HIGH** (main implementation): CONTINUE with alert + manual review flag
3. **LOW** (@performance, @documentation): SKIP gracefully + use fallback

### On Timeout Action
```yaml
Timeout Triggered
├─ Log warning with elapsed time
├─ Check agent priority
├─ If CRITICAL: ABORT pipeline + alert user
├─ If HIGH: CONTINUE + flag "manual_review_required"
└─ If LOW: SKIP agent + use fallback + notify code-review
```

**Example:**
```
⏱️ Timeout on @performance after 30.2s
   Priority: low
   Action: skip
   Fallback: generic performance check
   → Continues without impact
```
```

---

# 📊 Summary Table

| Mejora | Archivo(s) Clave | Línea | Esfuerzo | Prioridad |
|--------|------------------|-------|----------|-----------|
| Error Handling | error-handler.mjs, pipeline-executor.mjs | NEW, ~50 | 4-6h | P0 |
| Agent Validation | agent-validator.mjs, pipeline-executor.mjs | NEW, ~25 | 3-4h | P0 |
| Token Logging | token-tracker.mjs, orchestrator.md | NEW, ~220 | 3-4h | P1 |
| VCS Transactions | vcs-transaction.mjs, vcs-manager.mjs | NEW, ~50 | 6-8h | P1 |
| Prompt Compression | prompt-optimizer.mjs, orchestrator.md | NEW, ~310 | 4-5h | P2 |
| Timeouts | execution-config.mjs, orchestrator.md | NEW, ~850 | 3-4h | P2 |

---

# 🚀 Implementation Order

## Week 1-2 (Phase 1 - Critical)
1. ✅ Error Handling Framework
2. ✅ Agent Validation + Schema
3. ✅ Token Logging (preparación para Phase 2)

## Week 3-4 (Phase 2 - Architecture)
4. ✅ Transactional VCS + Checkpoints
5. ✅ Prompt Compression Automation
6. ✅ Timeout + Graceful Degradation

---

# ✅ Validation Checklist

- [ ] All error scenarios tested (VCS fail, agent timeout, etc.)
- [ ] Token budget warnings trigger correctly
- [ ] Checkpoints can be restored successfully
- [ ] Prompt compression maintains intent (validate with test prompts)
- [ ] Timeout handling doesn't break low-priority agents
- [ ] Logs are readable and actionable
- [ ] All new files have unit tests in `tests/unit/`
- [ ] Integration tests pass in `tests/integration/`
