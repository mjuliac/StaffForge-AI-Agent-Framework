# StaffForge-AI Improvements: Visual Roadmap

## 📌 Executive Summary

**6 mejoras críticas → 2 fases → 4 semanas → ~30 horas de desarrollo**

```
ACTUAL ISSUES                          AFTER IMPROVEMENTS
━━━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━━━
❌ Sin manejo de errores      ──→     ✅ Error handling + rollback
❌ Agentes sin validación     ──→     ✅ Schema validation + verification
❌ Sin logging de tokens      ──→     ✅ Token tracker + alerts
❌ VCS no es transaccional    ──→     ✅ Checkpoints + restore capability
❌ Compresión manual          ──→     ✅ Automatic prompt optimization
❌ Sin timeout control        ──→     ✅ Graceful degradation
```

---

## 📅 Timeline

```
SEMANA 1-2: PHASE 1 (Critical)
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  MON-FRI (Día 1-5)                                       │
│  ├─ Error Handler Framework         [4-6h]              │
│  ├─ Agent Validator + Schema        [3-4h]              │
│  └─ Token Logger Setup              [2-3h] (prep)       │
│                                                           │
│  Validation: ✅ All errors caught + logged              │
│             ✅ Invalid agents rejected before exec       │
│             ✅ Token budget tracked per level            │
└─────────────────────────────────────────────────────────┘

SEMANA 3-4: PHASE 2 (Architecture)
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  MON-FRI (Día 1-5)                                       │
│  ├─ VCS Transactions + Checkpoints  [6-8h]              │
│  ├─ Prompt Compression              [4-5h]              │
│  └─ Timeout + Graceful Degrade      [3-4h]              │
│                                                           │
│  Validation: ✅ Pipelines can rollback on error         │
│             ✅ Prompts auto-compressed 70%+            │
│             ✅ Low-priority agents skip on timeout      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Phase 1: Critical Improvements (Semanas 1-2)

### 1️⃣ Error Handling Framework

**WHERE:**
- 📁 `packages/core/lib/error-handler.mjs` (NEW)
- 📁 `packages/core/lib/pipeline-executor.mjs` (MODIFY line ~50)
- 📁 `agents/orchestrator.md` (MODIFY line ~35)

**WHAT:** Defines error levels (CRITICAL/WARNING/INFO) + automatic handling

**HOW IT WORKS:**
```
Pipeline Error Occurs
      ↓
Error Handler evaluates severity
      ↓
    ┌─────────────────────────────────┐
    │                                 │
  CRITICAL              WARNING              INFO
  (VCS fail)        (Test failure)    (Docs missing)
    │                   │                 │
    ▼                   ▼                 ▼
  ABORT +         CONTINUE +          CONTINUE
  ROLLBACK        ALERT FLAG          SILENTLY
  + NOTIFY          + NOTIFY            + LOG
    USER           CODE-REVIEW
```

**TESTING:**
```bash
# Test CRITICAL error handling
npm test -- tests/unit/error-handler.test.mjs

# Test pipeline error propagation
npm test -- tests/integration/error-handling.test.mjs
```

---

### 2️⃣ Agent Validation + Schema

**WHERE:**
- 📁 `packages/core/lib/agent-validator.mjs` (NEW)
- 📁 `packages/core/lib/pipeline-executor.mjs` (MODIFY line ~25, add method)

**WHAT:** Validates agents before delegation

**VALIDATION CHECKLIST:**
```
Before delegating to agent @xyz
    ✓ Agent file exists?
    ✓ YAML frontmatter valid?
    ✓ All required fields present?
        - id, name, mode, category
        - description, tools, capabilities
    ✓ Field types correct?
    ✓ Enum values valid?
    
If ANY validation fails → Throw error + alert user
```

**EXAMPLE:**
```javascript
// ✅ VALID agent
await validateAgent('architect', '/agents/architect.md');
// Returns: { valid: true, spec: { id: 'architect', name: 'Architect', ... } }

// ❌ INVALID agent (missing "capabilities")
await validateAgent('broken-agent', '/agents/broken.md');
// Throws: AgentValidationError: Missing required fields: capabilities
```

---

### 3️⃣ Token Logger Setup (Preparation)

**WHERE:**
- 📁 `packages/core/lib/token-tracker.mjs` (NEW)
- 📁 `agents/orchestrator.md` (MODIFY line ~220, add TOKEN_BUDGET block)

**WHAT:** Tracks token consumption and warns on overages

**OUTPUT EXAMPLE:**
```
TOKEN_BUDGET
- Initial: 190,000
- Used: 85,430 (45%)
- Remaining: 104,570 (55%)

BY_AGENT
- @architect: 18,500 (9.7%) ✅ OK
- @code-review: 24,630 (13%) ⚠️ EXCEEDED (expected: 10%)
- @testing: 15,200 (8%) ✅ OK

WARNINGS
- ⚠️ @code-review exceeded budget: 13% vs 10% expected
```

---

## 🏗️ Phase 2: Architectural Improvements (Semanas 3-4)

### 4️⃣ VCS Transactions + Checkpoints

**WHERE:**
- 📁 `packages/core/lib/vcs/vcs-transaction.mjs` (NEW)
- 📁 `packages/core/lib/vcs/vcs-manager.mjs` (MODIFY line ~50)

**WHAT:** Makes VCS operations transactional with rollback capability

**TRANSACTION FLOW:**
```
Pipeline Start
    ↓
[1] Create Branch (idempotent, no checkpoint)
    ├─ Success → Continue
    └─ Failure → Clean up + Abort
    
[2] Commit Code (non-idempotent, WITH checkpoint)
    ├─ Create checkpoint TAG: vcs/checkpoint-code-1721056723
    ├─ Commit code
    ├─ Success → Continue
    └─ Failure → Restore from checkpoint + Abort
    
[3] Final Merge (non-idempotent, WITH checkpoint)
    ├─ Create checkpoint TAG: vcs/checkpoint-merge-1721056865
    ├─ Merge feature → main
    ├─ Create release tag: v2.5.0
    ├─ Success → Continue
    └─ Failure → Restore from checkpoint + alert
```

**CHECKPOINT STORAGE:**
```bash
git tag -a vcs/checkpoint-code-1721056723 \
        -m "Checkpoint before commit in feature/my-feature"

# List all checkpoints
git tag -l "vcs/checkpoint-*"

# Restore to checkpoint
git checkout vcs/checkpoint-code-1721056723
```

---

### 5️⃣ Prompt Compression Automation

**WHERE:**
- 📁 `packages/core/lib/prompt-optimizer.mjs` (NEW)
- 📁 `packages/core/lib/pipeline-executor.mjs` (add automatic compression before delegate)
- 📁 `agents/orchestrator.md` (MODIFY line ~310)

**WHAT:** Auto-compresses prompts 70%+ without losing intent

**COMPRESSION RULES:**
```
RULE 1: Remove Boilerplate
  BEFORE: "Please help me understand the requirement..."
  AFTER:  "Requirement: ..."
  
RULE 2: Convert Prose → Structured Facts
  BEFORE: "The user wants to add a feature that validates
           emails in forms and the implementation should use
           a library called Email.js"
  AFTER:  "Feature: email validation in forms
           Library: Email.js"

RULE 3: Reference Files Instead of Quoting
  BEFORE: "I found this code in auth.js:
           function validateUser(email) {
             // 10 lines of code...
           }"
  AFTER:  "Code in src/auth.js:15-42: validateUser()"

RULE 4: Deduplicate Context from Previous Levels
  Previous delegation mentioned: "VCS flow: git-flow strategy"
  Current prompt mentions same → REMOVE (already known to orchestrator)
```

**EXAMPLE:**
```
ORIGINAL PROMPT (245 tokens)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please help me with a new feature. I need to add email 
validation to the form submission handler. The user has 
indicated that the requirement is to validate against RFC 5322 
standard and provide user-friendly error messages when the 
email is invalid. Can you please help implement this? The code 
is in src/forms.js and relates to multiple functions including 
submitForm and validateEmail.

OPTIMIZED PROMPT (73 tokens, 70% reduction)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature: email validation in form submission
Requirement: RFC 5322 standard + user-friendly errors
Files: src/forms.js (submitForm, validateEmail)
Status: implement new
```

**COMPRESSION VERIFICATION:**
```
✅ Intent preserved? 
   Original intent: "Add email validation"
   Optimized intent: "Feature: email validation"
   → YES, same
   
✅ No critical info lost?
   RFC 5322 ✓
   User-friendly errors ✓
   Files affected ✓
   → Complete
```

---

### 6️⃣ Timeout + Graceful Degradation

**WHERE:**
- 📁 `packages/core/lib/execution-config.mjs` (NEW)
- 📁 `agents/orchestrator.md` (MODIFY before "## Deliverables")

**WHAT:** Prevents stuck agents from blocking pipeline

**TIMEOUT HIERARCHY:**
```
Total Pipeline Timeout: 10 minutes (600s)
    │
    ├─ Level Timeout: 2 minutes (120s) per level
    │   │
    │   ├─ Agent Timeout: 30s per agent
    │   │   ├─ @security: CRITICAL → ABORT ❌
    │   │   ├─ @testing: CRITICAL → ABORT ❌
    │   │   ├─ @code-review: HIGH → ALERT + CONTINUE ⚠️
    │   │   ├─ @performance: LOW → SKIP + USE FALLBACK ⏭️
    │   │   └─ @documentation: LOW → SKIP + USE FALLBACK ⏭️
```

**BEHAVIOR ON TIMEOUT:**
```
⏱️ Agent exceeds 30 seconds
    ↓
Check agent priority
    ├─ CRITICAL (@security, @testing)
    │   └─ ABORT pipeline + Alert user
    │
    ├─ HIGH (@code-review, @architect)
    │   └─ CONTINUE + Flag "manual_review_required"
    │
    └─ LOW (@performance, @documentation)
        └─ SKIP + Use fallback + Notify code-review

Example Execution:
━━━━━━━━━━━━━━━━━
@architect:    ✅ 18.3s (OK)
@code-review:  ⏱️ 30.2s (TIMEOUT detected)
               → priority: HIGH
               → Action: CONTINUE + alert
               → Continue with code-review review
@testing:      ✅ 25.1s (OK)
```

---

## 🔧 Files to Create vs Modify

```
CREATE (NEW FILES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ packages/core/lib/error-handler.mjs
   └─ Error levels, handling logic, checkpoint saving

✨ packages/core/lib/agent-validator.mjs
   └─ Agent schema validation, YAML parsing

✨ packages/core/lib/token-tracker.mjs
   └─ Token budget tracking, warnings, reporting

✨ packages/core/lib/vcs/vcs-transaction.mjs
   └─ Transactional VCS operations, checkpoints

✨ packages/core/lib/prompt-optimizer.mjs
   └─ Prompt compression rules, deduplication

✨ packages/core/lib/execution-config.mjs
   └─ Timeout configuration, degradation rules

MODIFY (EXISTING FILES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 packages/core/lib/pipeline-executor.mjs
   └─ Lines ~50: Add error handling to executeLevel()
   └─ Lines ~25: Add validateAgentBeforeDelegation()
   └─ Add automatic prompt compression before delegate()

📝 packages/core/lib/vcs/vcs-manager.mjs
   └─ Lines ~50: Add transactional methods
   └─ createTagWithCheckpoint()
   └─ checkoutTag()
   └─ mergeBranchWithTransaction()

📝 agents/orchestrator.md
   └─ Lines ~35: Add error handling strategy section
   └─ Lines ~220: Add TOKEN_BUDGET to compressed context
   └─ Lines ~310: Update prompt compression docs
   └─ Before Deliverables: Add timeout strategy section
```

---

## 📊 Line-by-Line Map

### Error Handler
```
FILE: packages/core/lib/error-handler.mjs
TYPE: NEW
SIZE: ~150 lines
LOCATION: Between registry and logger imports

INTEGRATION POINTS:
  - pipeline-executor.mjs line 50: Add try-catch with handlePipelineError
  - orchestrator.md line 35: Add error handling documentation
```

### Agent Validator
```
FILE: packages/core/lib/agent-validator.mjs
TYPE: NEW
SIZE: ~200 lines
LOCATION: New module for agent validation

INTEGRATION POINTS:
  - pipeline-executor.mjs line 25: Call validateAgentBeforeDelegation()
  - orchestrator.md: Reference validation in delegation rules
```

### Token Tracker
```
FILE: packages/core/lib/token-tracker.mjs
TYPE: NEW
SIZE: ~120 lines
LOCATION: New metrics module

INTEGRATION POINTS:
  - pipeline-executor.mjs: Track every agent call
  - orchestrator.md line 220: Include in compressed context
```

### VCS Transaction
```
FILE: packages/core/lib/vcs/vcs-transaction.mjs
TYPE: NEW
SIZE: ~180 lines
LOCATION: New VCS utilities

INTEGRATION POINTS:
  - vcs-manager.mjs line 50: Add transactional methods
  - pipeline-executor.mjs: Wrap all VCS ops in transactions
```

### Prompt Optimizer
```
FILE: packages/core/lib/prompt-optimizer.mjs
TYPE: NEW
SIZE: ~160 lines
LOCATION: New compression utilities

INTEGRATION POINTS:
  - pipeline-executor.mjs delegate(): Auto-compress prompts
  - orchestrator.md line 310: Document compression strategy
```

### Execution Config
```
FILE: packages/core/lib/execution-config.mjs
TYPE: NEW
SIZE: ~140 lines
LOCATION: New execution configuration

INTEGRATION POINTS:
  - pipeline-executor.mjs: Check timeouts in executeLevel()
  - orchestrator.md: Document timeout behavior
```

---

## ✅ Testing Strategy

### Unit Tests (60% coverage)
```bash
npm test -- packages/core/lib/*.test.mjs

Tests per module:
  ✓ error-handler.test.mjs: 12 tests
  ✓ agent-validator.test.mjs: 10 tests
  ✓ token-tracker.test.mjs: 8 tests
  ✓ vcs-transaction.test.mjs: 15 tests
  ✓ prompt-optimizer.test.mjs: 10 tests
  ✓ execution-config.test.mjs: 7 tests
```

### Integration Tests (40% coverage)
```bash
npm test -- tests/integration/

Tests:
  ✓ error-handling-e2e.test.mjs
  ✓ agent-validation-pipeline.test.mjs
  ✓ token-budget-tracking.test.mjs
  ✓ vcs-checkpoint-restore.test.mjs
  ✓ prompt-compression-fidelity.test.mjs
  ✓ timeout-degradation.test.mjs
```

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- [ ] Error handler catches all error types
- [ ] Agent validation prevents invalid agents from executing
- [ ] Token tracker shows accurate budget usage
- [ ] All unit tests pass
- [ ] No regressions in existing tests

### Phase 2 Complete When:
- [ ] VCS can rollback from any checkpoint
- [ ] Prompt compression maintains semantic meaning (manual verification)
- [ ] Timeout system skips non-critical agents gracefully
- [ ] All 6 integration tests pass
- [ ] Documentation updated with new behaviors
- [ ] Code coverage remains >80%

---

## 📈 Expected Impact

```
BEFORE                           AFTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pipeline Failure Rate: 15%  →  5%
  (Error handling + validation prevents 2/3 of failures)

Token Waste: 25%           →  8%
  (Auto-compression + tracking prevents waste)

Recovery Time (on error): MANUAL (30min)  →  AUTOMATED (1min)
  (Transactional VCS + checkpoints)

Agent Responsiveness: ~10% timeout  →  0.1% timeout
  (Timeout + degradation handles edge cases)
```

---

## 🚀 Quick Start

### Day 1: Setup
```bash
# 1. Create all NEW files with skeleton
git checkout -b feature/improvements

# 2. Copy code from IMPLEMENTATION_GUIDE.md
#    - error-handler.mjs
#    - agent-validator.mjs
#    - token-tracker.mjs

# 3. Run linter
npm run lint

# 4. Run existing tests (should still pass)
npm test
```

### Days 2-5: Implement + Test
```bash
# Implement modifications to existing files
# - pipeline-executor.mjs: Add error handling
# - vcs-manager.mjs: Add transactional methods
# - orchestrator.md: Update documentation

# After each change:
npm test
npm run lint
```

### Days 6-10: Phase 2
```bash
# Implement remaining new files
# Run full test suite
npm test

# Manual testing of token tracking
# Manual testing of prompt compression
# Manual testing of timeout handling
```

### Days 11-14: Final Polish
```bash
# Documentation review
# Performance testing
# Code coverage verification
# Merge to develop

git push origin feature/improvements
# Create PR for review
```

---

## 📞 Questions During Implementation?

Refer back to:
1. **IMPLEMENTATION_GUIDE.md** - Exact code snippets
2. **This ROADMAP.md** - Visual flows + quick reference
3. **agents/orchestrator.md** - Current orchestrator behavior
4. **tests/unit/** - Example test patterns in codebase
