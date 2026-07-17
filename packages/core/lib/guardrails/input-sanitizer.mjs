/**
 * InputSanitizer — Input Guardrails Layer (pre-flight).
 *
 * Detects prompt injection, role-playing, and system prompt override attempts
 * in subagent outputs and user prompts before they enter the agent context.
 *
 * Implements the sanitización specification from orchestrator.md:
 *   "All subagent outputs are treated as untrusted data. Before passing to the
 *    next agent's context, scan for executable instructions, role-playing
 *    keywords, or system prompt overrides."
 */

// ── Injection Patterns ─────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  // Direct instruction override
  {
    pattern: /ignore\s+(all\s+)?(prior|previous|above)\s+(instructions|directives|commands|context)/gi,
    severity: 'critical',
    category: 'instruction-override',
  },
  {
    pattern: /disregard\s+(all\s+)?(prior|previous|above)\s+(instructions|directives|commands|context)/gi,
    severity: 'critical',
    category: 'instruction-override',
  },
  {
    pattern: /forget\s+(all\s+)?(prior|previous|above|everything)/gi,
    severity: 'high',
    category: 'instruction-override',
  },
  { pattern: /discard\s+(all\s+)?(prior|previous|above)/gi, severity: 'high', category: 'instruction-override' },
  {
    pattern: /do\s+not\s+follow\s+(the\s+)?(above|previous|earlier)\s+(instructions|directives)/gi,
    severity: 'critical',
    category: 'instruction-override',
  },
  {
    pattern: /override\s+(all\s+)?(prior|previous|system)\s+(instructions|prompt|directives)/gi,
    severity: 'critical',
    category: 'instruction-override',
  },

  // System prompt / message override
  { pattern: /system\s+prompt(\s*:|\s+override|\s+instruction)/gi, severity: 'high', category: 'system-override' },
  { pattern: /you\s+are\s+(now|currently)\s+/gi, severity: 'medium', category: 'role-play' },
  { pattern: /act\s+as\s+if\s+you\s+are/gi, severity: 'medium', category: 'role-play' },
  { pattern: /pretend\s+(to\s+be|you\s+are|that\s+you)/gi, severity: 'medium', category: 'role-play' },
  { pattern: /from\s+now\s+on\s*,?\s+you\s+are/gi, severity: 'medium', category: 'role-play' },

  // Executable instruction injection
  { pattern: /run\s+(the\s+)?following\s+(command|instruction|code)/gi, severity: 'high', category: 'exec-injection' },
  { pattern: /execute\s+(the\s+)?following/gi, severity: 'high', category: 'exec-injection' },
  { pattern: /```[\s\S]*?(system|bash|shell|exec|eval|sudo)\s*\n/gi, severity: 'medium', category: 'exec-injection' },

  // Meta-instruction extraction attempts
  { pattern: /print\s+(your|the)\s+(system\s+)?prompt/gi, severity: 'critical', category: 'prompt-extraction' },
  {
    pattern: /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions|directives)/gi,
    severity: 'critical',
    category: 'prompt-extraction',
  },
  { pattern: /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/gi, severity: 'high', category: 'prompt-extraction' },
  { pattern: /output\s+(your|the)\s+(initial|system)\s+prompt/gi, severity: 'critical', category: 'prompt-extraction' },
  {
    pattern: /what\s+(is|are)\s+(your|the)\s+(system\s+)?(prompt|instructions|directives)/gi,
    severity: 'high',
    category: 'prompt-extraction',
  },
  {
    pattern: /repeat\s+(all|everything|the\s+above|the\s+text)\s+(above|below|before)/gi,
    severity: 'high',
    category: 'prompt-extraction',
  },
];

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Scan content for prompt injection patterns.
 *
 * @param {string} content - The text to scan (user prompt or subagent output)
 * @param {object} [options]
 * @param {'reject'|'warn'|'report'} [options.mode='report'] - Action on detection
 * @param {string[]} [options.allowlist=[]] - Patterns to ignore (regex strings)
 * @returns {{
 *   safe: boolean,
 *   blocked: boolean,
 *   alerts: Array<{pattern: string, severity: string, category: string, match: string}>,
 *   sanitized: string
 * }}
 */
export function sanitizeInput(content, options = {}) {
  const mode = options.mode || 'report';
  const allowlist = options.allowlist || [];

  if (!content || typeof content !== 'string') {
    return { safe: true, blocked: false, alerts: [], sanitized: content || '' };
  }

  const alerts = [];
  let sanitized = content;

  for (const entry of INJECTION_PATTERNS) {
    // Skip if pattern is allowlisted
    if (allowlist.some((a) => entry.pattern.source.includes(a))) continue;

    const matches = sanitized.match(entry.pattern);
    if (matches) {
      alerts.push({
        pattern: entry.pattern.source,
        severity: entry.severity,
        category: entry.category,
        match: matches[0].trim().slice(0, 120),
      });

      // In 'reject' mode, return immediately on critical finds
      if (mode === 'reject' && entry.severity === 'critical') {
        return {
          safe: false,
          blocked: true,
          alerts,
          sanitized: sanitized,
        };
      }

      // Tag the injection point with [⚠ INJECTION DETECTED]
      sanitized = sanitized.replace(entry.pattern, (match) => {
        return `[⚠ INJECTION DETECTED: ${match.slice(0, 60)}]`;
      });
    }
  }

  const hasCritical = alerts.some((a) => a.severity === 'critical');
  const hasHigh = alerts.some((a) => a.severity === 'high');

  return {
    safe: !hasCritical && !hasHigh,
    blocked: mode === 'reject' && (hasCritical || hasHigh),
    alerts,
    sanitized,
  };
}

/**
 * Quick check — returns true if content appears safe.
 * @param {string} content
 * @param {object} [options]
 * @returns {boolean}
 */
export function isSafe(content, options = {}) {
  const result = sanitizeInput(content, { ...options, mode: 'reject' });
  return result.safe && !result.blocked;
}

/**
 * Get all registered injection patterns (for testing/tuning).
 * @returns {Array<{pattern: string, severity: string, category: string}>}
 */
export function getInjectionPatterns() {
  return INJECTION_PATTERNS.map(({ pattern, severity, category }) => ({
    pattern: pattern.source,
    severity,
    category,
  }));
}

export default { sanitizeInput, isSafe, getInjectionPatterns };
