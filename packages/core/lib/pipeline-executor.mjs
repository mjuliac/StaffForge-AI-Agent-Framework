import { getRouter } from './router.mjs';
import { getScheduler } from './scheduler.mjs';
import { getModelSelector } from './model-selector.mjs';
import { getSelectionEngine } from './engines/selection-engine.mjs';
import { getLearningEngine } from './engines/learning-engine.mjs';
import { TelemetryCollector } from './telemetry/collector.mjs';
import eventBus from './event-bus.mjs';
import { GuardrailManager, getGuardrailManager } from './guardrails/guardrail-manager.mjs';

export class PipelineExecutor {
  constructor(router = null, scheduler = null, guardrailManager = null) {
    this._router = router || getRouter();
    this._scheduler = scheduler || getScheduler();
    this._guardrails = guardrailManager || getGuardrailManager();
  }

  execute(taskType, prompt = '', options = {}) {
    // ── Reset guardrail state for this pipeline run ──────────────────
    this._guardrails.reset();

    // ── A. INPUT GUARDRAILS (pre-flight) ────────────────────────────
    const inputGuardrailResult = this._guardrails.applyInputGuardrails(prompt, {
      mode: options.inputGuardrailMode || 'warn',
    });

    if (inputGuardrailResult.blocked) {
      eventBus.emit('pipeline:error', {
        taskType,
        error: 'INPUT_GUARDRAIL_BLOCKED',
        guardrails: inputGuardrailResult,
      });
      return {
        taskType,
        error: 'Pipeline blocked by input guardrails',
        guardrails: {
          layer: 'input',
          blocked: true,
          alerts: inputGuardrailResult.alerts,
          audit: this._guardrails.getAuditTrail(),
        },
        agents: [],
        levels: [],
        summary: [],
      };
    }

    // ── Pipeline Resolution ─────────────────────────────────────────
    const pipeline = this._router.resolveTask(taskType, prompt);
    const plan = this._scheduler.fromRouterPipeline(pipeline);
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const ctx = { runId, taskType, pipelineId: pipeline.id || taskType };

    eventBus.emit('pipeline:start', {
      ...ctx,
      description: pipeline.description,
      guardrails: inputGuardrailResult,
    });

    const result = {
      taskType,
      description: pipeline.description,
      modelProfile: pipeline.modelProfile || null,
      model: null,
      telemetry: null,
      agents: pipeline.agents,
      levels: plan.levels,
      guardrails: {
        audit: [],
        summary: null,
      },
      summary:
        plan.totalLevels > 0
          ? plan.levels.map((l, i) => `Level ${i + 1}: [${l.parallel.map((p) => p.name || p.id).join(', ')}]`)
          : [],
    };

    // ── B. RUNTIME GUARDRAILS — Model Selection Budget ──────────────
    let sessionTokens = 0;

    if (options.selectModel !== false) {
      const selector = getModelSelector();
      const selectionEngine = getSelectionEngine();
      const learningEngine = getLearningEngine();

      if (options.learningFeedback && learningEngine.getTotalRuns() >= 10) {
        const adjusted = learningEngine.getAdjustedWeights(selectionEngine.getWeights());
        selectionEngine.setWeights(adjusted);
      }

      eventBus.emit('agent:start', { ...ctx, agentId: 'model-selector' });
      try {
        result.model = selector.select(taskType, {
          requireTools: options.requireTools ?? true,
          preferFree: options.preferFree ?? false,
          provider: options.provider || null,
          minContext: options.minContext || null,
        });

        // Runtime guardrail: estimate token usage for model selection
        // In declarative mode, we use context_window as an upper-bound estimate
        const estimatedTokens = Math.min(result.model?.context_window || 0, 16000);
        sessionTokens += estimatedTokens;
        const runtimeOk = this._guardrails.checkRuntimeGuardrails({
          agentId: 'model-selector',
          iterations: 1,
          tokensUsed: estimatedTokens,
          sessionTokens,
          elapsedMs: 0,
        });

        if (!runtimeOk.allowed) {
          eventBus.emit('pipeline:error', { ...ctx, error: runtimeOk.reason });
          result.guardrails.audit = this._guardrails.getAuditTrail();
          result.error = runtimeOk.reason;
          return result;
        }

        eventBus.emit('agent:complete', { ...ctx, agentId: 'model-selector', duration: 0 });
      } catch (err) {
        eventBus.emit('agent:error', { ...ctx, agentId: 'model-selector', error: err.message });
        eventBus.emit('pipeline:error', { ...ctx, error: err.message });
      }

      learningEngine.recordExecution({
        modelId: result.model?.id || 'none',
        taskType,
        success: true,
        duration: 0,
        tokens: 0,
        cost: 0,
        retries: 0,
      });
    }

    // ── Level Execution with Runtime Guardrails ─────────────────────
    let totalIterations = 0;

    for (let i = 0; i < plan.levels.length; i++) {
      const level = plan.levels[i];

      // Runtime guardrail: check iteration budget before each level
      totalIterations++;
      const runtimeOk = this._guardrails.checkRuntimeGuardrails({
        agentId: `level-${i + 1}`,
        iterations: totalIterations,
        tokensUsed: sessionTokens,
        sessionTokens,
        elapsedMs: 0,
      });

      if (!runtimeOk.allowed) {
        eventBus.emit('pipeline:error', {
          ...ctx,
          level: i + 1,
          error: runtimeOk.reason,
        });
        result.guardrails.audit = this._guardrails.getAuditTrail();
        result.error = runtimeOk.reason;
        return result;
      }

      eventBus.emit('level:start', { ...ctx, level: i + 1 });

      for (const agent of level.parallel) {
        const agentId = agent.id || agent.name || `agent-${i}`;

        // Runtime guardrail: per-agent iteration check
        const agentRuntimeOk = this._guardrails.checkRuntimeGuardrails({
          agentId,
          iterations: totalIterations,
          tokensUsed: sessionTokens,
          sessionTokens,
          elapsedMs: 0,
        });

        if (!agentRuntimeOk.allowed) {
          eventBus.emit('agent:skip', {
            ...ctx,
            agentId,
            level: i + 1,
            reason: agentRuntimeOk.reason,
          });
          continue;
        }

        eventBus.emit('agent:start', { ...ctx, agentId, level: i + 1 });
        eventBus.emit('subagent:spawn', { ...ctx, subagentType: agentId, level: i + 1 });

        // ── C. OUTPUT GUARDRAILS (post-flight per agent) ──────────
        // In a real execution, this would wrap the agent's actual output.
        // For the declarative pipeline plan, we record that guardrails
        // are active and ready for the orchestrator to use.

        eventBus.emit('agent:complete', { ...ctx, agentId, level: i + 1, duration: 0 });
        eventBus.emit('subagent:complete', { ...ctx, subagentType: agentId, level: i + 1, duration: 0 });
      }

      eventBus.emit('level:complete', { ...ctx, level: i + 1, duration: 0 });
    }

    // ── Final Guardrail Audit Summary ───────────────────────────────
    const auditTrail = this._guardrails.getAuditTrail();
    result.guardrails = {
      audit: auditTrail,
      summary: this._guardrails.getAuditSummary(),
      inputGuardrailAlerts: inputGuardrailResult.alerts,
    };

    // Emit guardrail audit as events
    for (const entry of auditTrail) {
      eventBus.emit('guardrail:action', { ...ctx, ...entry });
    }

    // ── Telemetry (optional) ────────────────────────────────────────
    if (options.enableTelemetry) {
      const collector = new TelemetryCollector();
      collector.startRun(runId, taskType, {
        prompt,
        model: result.model?.id || null,
        provider: result.model?.provider || null,
        pipeline: pipeline.agents.map((a) => a.id),
        guardrails: auditTrail,
      });
      collector.endRun('dry_run');
      result.telemetry = {
        runId,
        report: collector.getReport(),
      };
    }

    eventBus.emit('pipeline:complete', {
      ...ctx,
      duration: 0,
      guardrails: result.guardrails,
    });

    return result;
  }
}

let _defaultInstance = null;
export function getPipelineExecutor(router = null, scheduler = null, guardrailManager = null) {
  if (!_defaultInstance) {
    _defaultInstance = new PipelineExecutor(router, scheduler, guardrailManager);
  }
  return _defaultInstance;
}

export default getPipelineExecutor;
