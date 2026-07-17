/**
 * Guardrails — three-layer security framework (Input/Runtime/Output).
 *
 * Implements the C.R.E.A.D.O.+Guardrails specification for AI agent security.
 *
 * Exports:
 *   - Input Guardrails (A):   sanitizeInput, isSafe, getInjectionPatterns
 *   - Runtime Guardrails (B): GuardrailManager.checkRuntimeGuardrails
 *   - Output Guardrails (C):  scanSecrets, redactSecrets, isClean,
 *                             checkHallucinations, crossReference,
 *                             validateAgainstSchema, validateAgentOutput
 *   - Coordinator:            GuardrailManager, getGuardrailManager
 */

// Input Guardrails (A)
export { sanitizeInput, isSafe, getInjectionPatterns } from './input-sanitizer.mjs';

// Output Guardrails (C) — DLP
export { scanSecrets, redactSecrets, isClean, getSecretPatterns } from './output-dlp.mjs';

// Output Guardrails (C) — Hallucination Check
export {
  extractFileReferences,
  verifyFileReferences,
  crossReference,
  checkHallucinations,
} from './hallucination-check.mjs';

// Output Guardrails (C) — Schema Validation
export { validateAgainstSchema, validateAgentOutput, clearCache, getValidator } from './schema-validator.mjs';

// Coordinator
export { GuardrailManager, getGuardrailManager } from './guardrail-manager.mjs';
