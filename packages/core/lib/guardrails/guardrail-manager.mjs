/**
 * GuardrailManager — Orchestrates all three guardrail layers.
 *
 * Coordinates Input, Runtime, and Output guardrails across the pipeline lifecycle.
 * Provides a single entry point for the orchestrator and PipelineExecutor to
 * enforce security policies consistently.
 *
 * Three-layer model (per C.R.E.A.D.O.+Guardrails spec):
 *   A. Input Guardrails (pre-flight)  — sanitizeInput, schema validation
 *   B. Runtime Guardrails (execution) — iterations, token budget, timeout
 *   C. Output Guardrails (post-flight) — DLP, hallucination check, format validation
 */

import { sanitizeInput } from './input-sanitizer.mjs';
import { scanSecrets, redactSecrets } from './output-dlp.mjs';
import { checkHallucinations, crossReference } from './hallucination-check.mjs';
import { validateAgainstSchema } from './schema-validator.mjs';
import { getLogger } from '../logger.mjs';

// ── Default Policies ───────────────────────────────────────────────────────

const DEFAULT_POLICY = {
  input: {
    enabled: true,
    mode: 'reject', // 'reject' | 'warn' | 'report'
    allowlist: [],
  },
  runtime: {
    maxIterations: 10,
    tokenBudget: 32000, // per agent call
    sessionBudget: 128000, // per pipeline session
    timeoutMs: 120000, // per task call
    maxRetries: 3,
  },
  output: {
    dlpEnabled: true,
    dlpMode: 'redact', // 'scan' | 'redact'
    hallucinationCheck: true,
    schemaValidation: true,
    entropyThreshold: 4.0,
  },
};

// ── Audit Trail ────────────────────────────────────────────────────────────

/**
 * @typedef {object} GuardrailEntry
 * @property {string} layer - 'input' | 'runtime' | 'output'
 * @property {string} action - 'sanitize' | 'block' | 'redact' | 'validate' | 'check' | 'abort'
 * @property {string} status - 'passed' | 'blocked' | 'flagged' | 'redacted'
 * @property {string} detail
 * @property {string} timestamp
 */

// ── GuardrailManager ───────────────────────────────────────────────────────

export class GuardrailManager {
  constructor(policy = {}) {
    this._policy = { ...DEFAULT_POLICY, ...policy };
    this._audit = [];
    this._log = getLogger();
  }

  /**
   * Apply Input Guardrails (A) — sanitize prompt / subagent output before processing.
   *
   * @param {string} content - Raw input content
   * @param {object} [options]
   * @returns {{ safe: boolean, blocked: boolean, sanitized: string, alerts: Array }}
   */
  applyInputGuardrails(content, options = {}) {
    if (!this._policy.input.enabled) {
      return { safe: true, blocked: false, sanitized: content, alerts: [] };
    }

    const result = sanitizeInput(content, {
      mode: options.mode || this._policy.input.mode,
      allowlist: options.allowlist || this._policy.input.allowlist,
    });

    this._auditEntry('input', result.blocked ? 'block' : 'sanitize', result.blocked ? 'blocked' : 'passed', {
      alertCount: result.alerts.length,
      blocked: result.blocked,
    });

    if (result.blocked) {
      this._log.warn(`GUARDRAIL [input]: blocked content with ${result.alerts.length} injection pattern(s)`);
    }

    return result;
  }

  /**
   * Apply Runtime Guardrails (B) — check budget and iteration limits.
   *
   * @param {object} context - { agentId, iterations, tokensUsed, sessionTokens, elapsedMs }
   * @returns {{ allowed: boolean, reason: string|null }}
   */
  checkRuntimeGuardrails(context) {
    const { agentId, iterations = 0, tokensUsed = 0, sessionTokens = 0, elapsedMs = 0 } = context;

    if (iterations > this._policy.runtime.maxIterations) {
      const reason = `max_iterations exceeded: ${iterations} > ${this._policy.runtime.maxIterations}`;
      this._auditEntry('runtime', 'abort', 'blocked', { agentId, reason });
      this._log.warn(`GUARDRAIL [runtime]: ${reason}`);
      return { allowed: false, reason };
    }

    if (tokensUsed > this._policy.runtime.tokenBudget) {
      const reason = `token_budget exceeded: ${tokensUsed} > ${this._policy.runtime.tokenBudget}`;
      this._auditEntry('runtime', 'abort', 'blocked', { agentId, reason });
      this._log.warn(`GUARDRAIL [runtime]: ${reason}`);
      return { allowed: false, reason };
    }

    if (sessionTokens > this._policy.runtime.sessionBudget) {
      const reason = `session_token_budget exceeded: ${sessionTokens} > ${this._policy.runtime.sessionBudget}`;
      this._auditEntry('runtime', 'abort', 'blocked', { agentId, reason });
      this._log.warn(`GUARDRAIL [runtime]: ${reason}`);
      return { allowed: false, reason };
    }

    if (elapsedMs > this._policy.runtime.timeoutMs) {
      const reason = `timeout exceeded: ${elapsedMs}ms > ${this._policy.runtime.timeoutMs}ms`;
      this._auditEntry('runtime', 'abort', 'blocked', { agentId, reason });
      this._log.warn(`GUARDRAIL [runtime]: ${reason}`);
      return { allowed: false, reason };
    }

    return { allowed: true, reason: null };
  }

  /**
   * Apply Output Guardrails (C) — DLP + hallucination check + schema validation.
   *
   * @param {object|string} output - Agent output to validate
   * @param {object} [options]
   * @param {object} [options.schema] - JSON Schema for format validation
   * @param {string} [options.projectRoot] - For file path verification
   * @param {object} [options.crossReferenceWith] - Another agent output for cross-ref
   * @returns {{
   *   safe: boolean,
   *   dlpFindings: Array,
   *   hallucinationWarnings: Array,
   *   schemaErrors: Array,
   *   crossRefIssues: Array,
   *   redacted: string|null
   * }}
   */
  applyOutputGuardrails(output, options = {}) {
    const result = {
      safe: true,
      dlpFindings: [],
      hallucinationWarnings: [],
      schemaErrors: [],
      crossRefIssues: [],
      redacted: null,
    };

    const text = typeof output === 'string' ? output : JSON.stringify(output);

    // 1. DLP Scan
    if (this._policy.output.dlpEnabled) {
      const dlpResult = scanSecrets(text, {
        mode: this._policy.output.dlpMode,
        entropyThreshold: this._policy.output.entropyThreshold,
      });
      result.dlpFindings = dlpResult.findings;
      result.redacted = dlpResult.redacted;

      if (!dlpResult.safe) {
        result.safe = false;
        const criticalCount = dlpResult.findings.filter((f) => f.severity === 'critical').length;
        this._auditEntry('output', 'redact', 'redacted', {
          totalFindings: dlpResult.findings.length,
          criticalCount,
        });
        this._log.warn(
          `GUARDRAIL [output]: DLP flagged ${dlpResult.findings.length} secret(s) (${criticalCount} critical)`,
        );
      }
    }

    // 2. Hallucination Check
    if (this._policy.output.hallucinationCheck) {
      const hcResult = checkHallucinations(output, options.projectRoot || '');
      result.hallucinationWarnings = hcResult.warnings;

      if (hcResult.verdict === 'flagged') {
        result.safe = false;
        this._auditEntry('output', 'check', 'flagged', {
          invalidRefs: hcResult.invalidRefs.length,
          warnings: hcResult.warnings,
        });
      }
    }

    // 3. Cross-reference check
    if (options.crossReferenceWith) {
      const xrefIssues = crossReference(output, options.crossReferenceWith);
      result.crossRefIssues = xrefIssues;
      if (xrefIssues.length > 0) {
        result.safe = false;
        this._auditEntry('output', 'check', 'flagged', {
          crossRefCount: xrefIssues.length,
        });
      }
    }

    // 4. Schema validation
    if (this._policy.output.schemaValidation && options.schema) {
      const schemaResult = validateAgainstSchema(output, options.schema);
      result.schemaErrors = schemaResult.errors;
      if (!schemaResult.valid) {
        result.safe = false;
        this._auditEntry('output', 'validate', 'flagged', {
          schemaErrors: schemaResult.errors.length,
        });
      }
    }

    return result;
  }

  /**
   * Reset guardrail state for a new pipeline run.
   */
  reset() {
    this._audit = [];
  }

  // ── Audit ────────────────────────────────────────────────────────────────

  /**
   * Get the full audit trail for this pipeline run.
   * @returns {GuardrailEntry[]}
   */
  getAuditTrail() {
    return [...this._audit];
  }

  /**
   * Get summary of guardrail actions.
   * @returns {{ total: number, blocked: number, flagged: number, redacted: number }}
   */
  getAuditSummary() {
    const total = this._audit.length;
    const blocked = this._audit.filter((e) => e.status === 'blocked').length;
    const flagged = this._audit.filter((e) => e.status === 'flagged').length;
    const redacted = this._audit.filter((e) => e.status === 'redacted').length;
    return { total, blocked, flagged, redacted };
  }

  /**
   * Get/set policy.
   */
  getPolicy() {
    return { ...this._policy };
  }

  setPolicy(policy) {
    Object.assign(this._policy, policy);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  _auditEntry(layer, action, status, detail) {
    this._audit.push({
      layer,
      action,
      status,
      detail: typeof detail === 'object' ? JSON.stringify(detail) : String(detail),
      timestamp: new Date().toISOString(),
    });
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _defaultManager = null;

/**
 * Get or create the default GuardrailManager singleton.
 * @param {object} [policy]
 * @returns {GuardrailManager}
 */
export function getGuardrailManager(policy) {
  if (!_defaultManager) {
    _defaultManager = new GuardrailManager(policy);
  }
  return _defaultManager;
}

export default GuardrailManager;
