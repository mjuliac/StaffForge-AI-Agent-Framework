/**
 * OutputDLP — Output Guardrails Layer (post-flight).
 *
 * Scans subagent outputs for secrets, credentials, API keys, tokens,
 * connection strings, and PII before passing downstream or to VCS.
 *
 * Implements the DLP specification from orchestrator.md:
 *   "Scan all subagent outputs for API keys, tokens, connection strings,
 *    PII using regex patterns. If detected, strip or redact before passing
 *    downstream or to user."
 *
 * Two modes:
 *   - scan: detect and report only
 *   - redact: replace matches with [REDACTED]
 */

// ── Secret Detection Patterns ──────────────────────────────────────────────

const SECRET_PATTERNS = [
  // Provider API Keys — high confidence
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, type: 'openai-api-key', severity: 'critical', entropy: true },
  { pattern: /sk-ant-[a-zA-Z0-9]{20,}/g, type: 'anthropic-api-key', severity: 'critical', entropy: true },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, type: 'github-token', severity: 'critical', entropy: true },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, type: 'github-oauth-token', severity: 'critical', entropy: true },
  { pattern: /ghu_[a-zA-Z0-9]{36}/g, type: 'github-user-token', severity: 'critical', entropy: true },
  { pattern: /xox[abpors]-[a-zA-Z0-9]{10,}/g, type: 'slack-token', severity: 'critical', entropy: true },
  { pattern: /AKIA[0-9A-Z]{16}/g, type: 'aws-access-key', severity: 'critical', entropy: true },
  {
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    type: 'jwt-token',
    severity: 'high',
    entropy: true,
  },

  // Private Keys — high confidence
  {
    pattern:
      /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA|DSA|EC|OPENSSH|PGP)\s+PRIVATE\s+KEY-----/g,
    type: 'private-key',
    severity: 'critical',
    entropy: false,
  },
  {
    pattern: /-----BEGIN\s+CERTIFICATE-----[\s\S]*?-----END\s+CERTIFICATE-----/g,
    type: 'certificate',
    severity: 'high',
    entropy: false,
  },

  // Connection Strings — high confidence
  {
    pattern: /(?:postgres|postgresql|mysql|mongodb|redis|rediss):\/\/(?:[^\s:@\/]+)?(?::[^\s@\/]+)?@[^\s]+/g,
    type: 'database-connection-string',
    severity: 'critical',
    entropy: false,
  },
  {
    pattern: /(?:amqp|amqps):\/\/(?:[^\s:@\/]+)?(?::[^\s@\/]+)?@[^\s]+/g,
    type: 'message-broker-connection',
    severity: 'critical',
    entropy: false,
  },

  // Generic High-Entropy Tokens — medium confidence (entropy heuristic)
  { pattern: /[A-Za-z0-9_-]{32,40}/g, type: 'high-entropy-token', severity: 'medium', entropy: true },

  // Password / Secret env vars — medium confidence
  {
    pattern: /(?:password|passwd|pwd|secret|api[_-]?key|token)\s*[=:]\s*['"][^'"]{8,}['"]/gi,
    type: 'credential-assignment',
    severity: 'high',
    entropy: false,
  },

  // PII — medium confidence
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, type: 'email-address', severity: 'medium', entropy: false },
  { pattern: /\b(?:\d{3}[-.]?){2}\d{4}\b/g, type: 'phone-number', severity: 'medium', entropy: false },
];

// ── Entropy Heuristic ──────────────────────────────────────────────────────

/**
 * Shannon entropy — quick heuristic for random-looking tokens.
 * @param {string} str
 * @returns {number} 0–8 (higher = more random)
 */
function shannonEntropy(str) {
  const len = str.length;
  if (len === 0) return 0;
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Scan content for secrets and sensitive data.
 *
 * @param {string} content - The text to scan
 * @param {object} [options]
 * @param {'scan'|'redact'} [options.mode='scan']
 * @param {number} [options.entropyThreshold=4.0] - Minimum entropy for token detection
 * @returns {{
 *   safe: boolean,
 *   findings: Array<{type: string, severity: string, match: string, index: number}>,
 *   redacted: string|null
 * }}
 */
export function scanSecrets(content, options = {}) {
  const mode = options.mode || 'scan';
  const entropyThreshold = options.entropyThreshold ?? 4.0;

  if (!content || typeof content !== 'string') {
    return { safe: true, findings: [], redacted: mode === 'redact' ? content || '' : null };
  }

  const findings = [];
  let redacted = content;

  for (const entry of SECRET_PATTERNS) {
    const matches = redacted.matchAll(entry.pattern);
    for (const match of matches) {
      const matchedText = match[0];

      // Entropy filter for low-confidence patterns
      if (entry.entropy && entry.severity !== 'critical') {
        const entropy = shannonEntropy(matchedText);
        if (entropy < entropyThreshold) continue;
      }

      // Skip overly long matches (likely false positives from base64 or similar)
      if (entry.type === 'high-entropy-token' && matchedText.length > 40) continue;

      findings.push({
        type: entry.type,
        severity: entry.severity,
        match: matchedText.slice(0, 80),
        index: match.index,
      });

      if (mode === 'redact') {
        redacted = redacted.replace(matchedText, `[REDACTED:${entry.type}]`);
      }
    }
  }

  const hasCritical = findings.some((f) => f.severity === 'critical');
  const hasHigh = findings.some((f) => f.severity === 'high');

  return {
    safe: !hasCritical && !hasHigh,
    findings,
    redacted: mode === 'redact' ? redacted : null,
  };
}

/**
 * Quick scan — returns true if no secrets detected (ignores medium-severity).
 * @param {string} content
 * @returns {boolean}
 */
export function isClean(content) {
  const result = scanSecrets(content, { mode: 'scan' });
  return !result.findings.some((f) => f.severity !== 'medium');
}

/**
 * Redact all secrets from content inline.
 * @param {string} content
 * @param {object} [options]
 * @returns {string}
 */
export function redactSecrets(content, options = {}) {
  const result = scanSecrets(content, { ...options, mode: 'redact' });
  return result.redacted || content;
}

/**
 * Get all registered secret patterns (for testing/tuning).
 * @returns {Array<{pattern: string, type: string, severity: string}>}
 */
export function getSecretPatterns() {
  return SECRET_PATTERNS.map(({ pattern, type, severity }) => ({
    pattern: pattern.source,
    type,
    severity,
  }));
}

export default { scanSecrets, isClean, redactSecrets, getSecretPatterns };
