/**
 * HallucinationCheck — Output Guardrails Layer (post-flight).
 *
 * Validates factual consistency of agent outputs against the real filesystem
 * and cross-references claims between pipeline agents.
 *
 * Implements the hallucination cross-check from orchestrator.md:
 *   "For critical pipeline agents (Knowledge → Impact → Code Review),
 *    validate factual consistency against original source context.
 *    Flag contradictions."
 *
 * Two validations:
 *   1. File path verification — every `path/file.ts:line` reference must exist
 *   2. Cross-reference consistency — compare factual claims between agents
 */

import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

// ── File Path Extraction ───────────────────────────────────────────────────

/**
 * Regex patterns for file path references commonly found in agent outputs.
 * Captures: path/to/file.ext, path/to/file.ext:123, path/file.ext#L123
 */
const FILE_REF_PATTERNS = [
  // Standard path:line references: src/file.ts:45
  /\b([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+):(\d+)\b/g,
  // Standard path without line: src/file.ts
  /\b([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)(?![:\w])/g,
  // GitHub-style: src/file.ts#L45-L50
  /\b([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)#L(\d+)/g,
];

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Extract file references from text.
 *
 * @param {string} text - Agent output text
 * @param {string} [projectRoot] - Optional project root for relative path resolution
 * @returns {Array<{file: string, line: number|null, raw: string}>}
 */
export function extractFileReferences(text, projectRoot = '') {
  if (!text || typeof text !== 'string') return [];

  const refs = [];
  const seen = new Set();

  for (const regex of FILE_REF_PATTERNS) {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      const raw = match[0];
      if (seen.has(raw)) continue;
      seen.add(raw);

      let file = match[1];
      const line = match[2] ? parseInt(match[2], 10) : null;

      // Normalize path if projectRoot provided
      if (projectRoot && !isAbsolute(file)) {
        file = join(projectRoot, file);
      }

      refs.push({ file, line, raw });
    }
  }

  return refs;
}

/**
 * Verify file references against the actual filesystem.
 *
 * @param {Array<{file: string, line: number|null, raw: string}>} refs
 * @returns {Array<{file: string, line: number|null, raw: string, exists: boolean, lineValid: boolean|null}>}
 */
export function verifyFileReferences(refs) {
  return refs.map((ref) => {
    let exists = false;
    let lineValid = null;

    try {
      exists = existsSync(ref.file) && statSync(ref.file).isFile();
    } catch {
      exists = false;
    }

    // Line validation: only if file exists and line is specified
    if (exists && ref.line !== null) {
      try {
        const content = readFileSync(ref.file, 'utf-8');
        const totalLines = content.split('\n').length;
        lineValid = ref.line <= totalLines && ref.line > 0;
      } catch {
        lineValid = null;
      }
    }

    return { ...ref, exists, lineValid };
  });
}

/**
 * Cross-reference factual claims between two agent outputs.
 * Detects contradictions by comparing structured findings/references.
 *
 * @param {object} outputA - First agent output (e.g., Knowledge)
 * @param {object} outputB - Second agent output (e.g., Impact)
 * @returns {Array<{type: string, description: string, sourceA: string, sourceB: string}>}
 */
export function crossReference(outputA, outputB) {
  const inconsistencies = [];

  if (!outputA || !outputB) return inconsistencies;

  const factsA = extractFacts(outputA);
  const factsB = extractFacts(outputB);

  for (const factA of factsA) {
    const contradicting = factsB.find(
      (fb) =>
        fb.subject === factA.subject &&
        fb.sentiment !== factA.sentiment &&
        factA.confidence > 0.5 &&
        fb.confidence > 0.5,
    );
    if (contradicting) {
      inconsistencies.push({
        type: 'contradiction',
        description: `"${factA.subject}" stated as "${factA.sentiment}" in Agent A but "${contradicting.sentiment}" in Agent B`,
        sourceA: factA.source,
        sourceB: contradicting.source,
      });
    }
  }

  return inconsistencies;
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Simple fact extractor from agent output text.
 * Extracts statements about module status, risk severity, etc.
 */
function extractFacts(obj) {
  const facts = [];
  const text = JSON.stringify(obj).toLowerCase();

  // Extract key:value pairs from JSON output (findings, risks, recommendations)
  try {
    const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj;
    if (parsed && typeof parsed === 'object') {
      for (const key of ['findings', 'risks', 'recommendations']) {
        const items = parsed[key];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (typeof item === 'string') {
              facts.push({
                subject: item.split(':')[0]?.trim()?.slice(0, 60) || item.slice(0, 60),
                sentiment: key === 'risks' ? 'negative' : 'positive',
                confidence: 0.7,
                source: item.slice(0, 80),
              });
            }
          }
        }
      }
    }
  } catch {
    // Fallback to regex extraction
    const statementRegex =
      /"([a-z_./-]+)":\s*"([^"]+)"|([a-z_./-]+?)\s+(is|are|was|were)\s+(not\s+)?(safe|stable|broken|deprecated|affected|breaking|moderate|minimal|none)/gi;
    const matches = text.matchAll(statementRegex);
    for (const match of matches) {
      const subject = match[1] || match[3];
      const negated = !!match[5];
      const status = match[6] || match[2] || 'unknown';

      facts.push({
        subject: subject?.toLowerCase(),
        sentiment: negated ? `negative:${status}` : `positive:${status}`,
        confidence: 0.5,
        source: match[0].slice(0, 80),
      });
    }
  }

  return facts;
}

/**
 * Run full hallucination check on a single agent output.
 *
 * @param {object|string} agentOutput - Parsed agent output (JSON object or string)
 * @param {string} [projectRoot] - Project root for file verification
 * @returns {{
 *   fileRefs: Array,
 *   invalidRefs: Array,
 *   warnings: Array<string>,
 *   crossRefIssues: Array,
 *   verdict: 'passed'|'flagged'|'error'
 * }}
 */
export function checkHallucinations(agentOutput, projectRoot = '') {
  try {
    const text = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);
    const refs = extractFileReferences(text, projectRoot);
    const verified = verifyFileReferences(refs);

    const invalidRefs = verified.filter((r) => !r.exists);
    const warnings = [];

    if (invalidRefs.length > 0) {
      warnings.push(`hallucination-check: ${invalidRefs.length} file reference(s) not found on disk`);
    }

    const lineInvalid = verified.filter((r) => r.lineValid === false);
    if (lineInvalid.length > 0) {
      warnings.push(`hallucination-check: ${lineInvalid.length} line reference(s) exceed file length`);
    }

    return {
      fileRefs: verified,
      invalidRefs,
      warnings,
      crossRefIssues: [],
      verdict: warnings.length === 0 ? 'passed' : 'flagged',
    };
  } catch (err) {
    return {
      fileRefs: [],
      invalidRefs: [],
      warnings: [`hallucination-check error: ${err.message}`],
      crossRefIssues: [],
      verdict: 'error',
    };
  }
}

export default {
  extractFileReferences,
  verifyFileReferences,
  crossReference,
  checkHallucinations,
};
