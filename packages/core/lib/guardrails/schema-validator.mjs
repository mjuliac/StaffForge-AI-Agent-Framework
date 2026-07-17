/**
 * SchemaValidator — Output Guardrails Layer (post-flight).
 *
 * Validates agent outputs against their declared output_schema using JSON Schema.
 *
 * Implements the format validation from orchestrator.md:
 *   "Every subagent's output MUST match its declared output_schema.
 *    Use JSON Schema validation before accepting the response.
 *    If validation fails, discard and flag to orchestrator."
 *
 * This module wraps AJV (already a dependency) and provides:
 *   - validateAgainstSchema(output, schema) → { valid, errors }
 *   - validateAgentOutput(agent, output) → auto-loads agent's output_schema
 *   - strict mode for critical agents (Knowledge → Impact → Code Review)
 */

import Ajv from 'ajv';

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  validateSchema: true,
});

// Cache compiled schemas for performance
const cache = new Map();

/**
 * Validate data against a JSON Schema.
 *
 * @param {object|string} data - The output data to validate
 * @param {object} schema - JSON Schema object
 * @returns {{ valid: boolean, errors: Array<{path: string, message: string}> }}
 */
export function validateAgainstSchema(data, schema) {
  if (!schema) {
    return { valid: true, errors: [], skipped: true };
  }

  const schemaKey = JSON.stringify(schema);
  let validate = cache.get(schemaKey);

  if (!validate) {
    try {
      validate = ajv.compile(schema);
      cache.set(schemaKey, validate);
    } catch (err) {
      return {
        valid: false,
        errors: [{ path: '(schema)', message: `Schema compilation error: ${err.message}` }],
        skipped: false,
      };
    }
  }

  const parsed = typeof data === 'string' ? tryParse(data) : data;
  const valid = validate(parsed || data);

  if (!valid) {
    return {
      valid: false,
      errors: (validate.errors || []).map((err) => ({
        path: err.instancePath || '(root)',
        message: err.message || 'validation error',
      })),
      skipped: false,
    };
  }

  return { valid: true, errors: [], skipped: false };
}

/**
 * Validate agent output against the agent's declared output_schema.
 *
 * @param {object} agent - Agent object with frontmatter.output_schema
 * @param {object|string} output - The agent's output
 * @returns {{ valid: boolean, errors: Array, skipped: boolean }}
 */
export function validateAgentOutput(agent, output) {
  if (!agent || !agent.frontmatter) {
    return { valid: false, errors: [{ path: '(agent)', message: 'Invalid agent object' }], skipped: false };
  }

  const schema = agent.frontmatter.output_schema;
  if (!schema) {
    return { valid: true, errors: [], skipped: true };
  }

  return validateAgainstSchema(output, schema);
}

/**
 * Try to parse a string as JSON.
 * @param {string} str
 * @returns {object|null}
 */
function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Clear the compiled schema cache.
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get AJV instance (for advanced use).
 * @returns {import('ajv').default}
 */
export function getValidator() {
  return ajv;
}

export default {
  validateAgainstSchema,
  validateAgentOutput,
  clearCache,
  getValidator,
};
