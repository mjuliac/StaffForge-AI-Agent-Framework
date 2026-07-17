# StaffForge-AI: Quick Reference Checklist

## 🎯 At a Glance

| Mejora | Archivos | Líneas | Tipo | Prioridad |
|--------|----------|--------|------|-----------|
| Error Handler | 3 files | NEW + ~50 mod | P0 | Sem 1-2 |
| Agent Validator | 2 files | NEW + ~25 mod | P0 | Sem 1-2 |
| Token Logger | 2 files | NEW + ~220 mod | P1 | Sem 1-2 |
| VCS Transactions | 2 files | NEW + ~50 mod | P1 | Sem 3-4 |
| Prompt Compressor | 2 files | NEW + ~310 mod | P2 | Sem 3-4 |
| Timeout Handler | 2 files | NEW + ~850 mod | P2 | Sem 3-4 |

---

## 📋 Phase 1: Critical (Sem 1-2)

### ✅ ERROR HANDLER

**Files to create/modify:**
```
CREATE:
  ✨ packages/core/lib/error-handler.mjs

MODIFY:
  📝 packages/core/lib/pipeline-executor.mjs (line ~50)
  📝 agents/orchestrator.md (line ~35)
```

**Quick code:**
```javascript
// error-handler.mjs - NEW FILE
export const ERROR_LEVELS = {
  CRITICAL: 'critical',    // ABORT
  WARNING: 'warning',      // CONTINUE_ALERT
  INFO: 'info'             // CONTINUE
};

// pipeline-executor.mjs - MODIFY executeLevel()
try {
  results[task.name] = await this.executeTask(task, context);
} catch (error) {
  const severity = await handlePipelineError(error, task.name);
  if (severity.action === 'ABORT') throw error;
}
```

**Test:**
```bash
npm test -- tests/unit/error-handler.test.mjs
```

---

### ✅ AGENT VALIDATOR

**Files to create/modify:**
```
CREATE:
  ✨ packages/core/lib/agent-validator.mjs

MODIFY:
  📝 packages/core/lib/pipeline-executor.mjs (line ~25)
```

**Quick code:**
```javascript
// agent-validator.mjs - NEW FILE
export async function validateAgent(agentName, agentPath) {
  const content = await readFile(agentPath, 'utf-8');
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const agentSpec = parseYAML(yamlMatch[1]);
  
  // Check required fields
  const missing = SCHEMA.required.filter(f => !agentSpec[f]);
  if (missing.length > 0) throw new AgentValidationError(...);
  
  return { valid: true, spec: agentSpec };
}

// pipeline-executor.mjs - ADD METHOD
async validateAgentBeforeDelegation(agentName) {
  const spec = await validateAgent(agentName, path);
  return spec;
}
```

**Test:**
```bash
npm test -- tests/unit/agent-validator.test.mjs
```

---

### ✅ TOKEN LOGGER (Setup)

**Files to create/modify:**
```
CREATE:
  ✨ packages/core/lib/token-tracker.mjs

MODIFY:
  📝 agents/orchestrator.md (line ~220)
```

**Quick code:**
```javascript
// token-tracker.mjs - NEW FILE
export class TokenTracker {
  constructor(initialBudget = 190000) {
    this.used = 0;
    this.remaining = initialBudget;
    this.byAgent = {};
  }
  
  trackAgentCall(agentName, tokensUsed) {
    this.used += tokensUsed;
    this.remaining -= tokensUsed;
    this.byAgent[agentName] = (this.byAgent[agentName] || 0) + tokensUsed;
  }
  
  getCompressedContextBlock() {
    return {
      TOKEN_BUDGET: {
        used: this.used,
        remaining: this.remaining,
        by_agent: this.byAgent
      }
    };
  }
}

// orchestrator.md - ADD TO CONTEXT
TOKEN_BUDGET
- Initial: 190,000
- Used: [X]
- Remaining: [Y]
```

---

## 📋 Phase 2: Architecture (Sem 3-4)

### ✅ VCS TRANSACTIONS

**Files to create/modify:**
```
CREATE:
  ✨ packages/core/lib/vcs/vcs-transaction.mjs

MODIFY:
  📝 packages/core/lib/vcs/vcs-manager.mjs (line ~50)
```

**Quick code:**
```javascript
// vcs-transaction.mjs - NEW FILE
export class VCSTransaction {
  async createCheckpoint(name) {
    const tag = `vcs/checkpoint-${name}-${Date.now()}`;
    await this.vcsManager.createTag(tag);
    return tag;
  }
  
  async executeWithCheckpoint(type, operation) {
    let checkpoint = await this.createCheckpoint(type);
    try {
      return await operation();
    } catch (error) {
      await this.rollbackToCheckpoint(checkpoint);
      throw error;
    }
  }
}

// vcs-manager.mjs - ADD METHODS
async createTagWithCheckpoint(name) {
  const tag = `git tag -a ${name} -m "Checkpoint"`;
  return await this.executeCommand(tag);
}

async mergeBranchWithTransaction(src, dst) {
  const backup = await this.createTagWithCheckpoint('pre-merge');
  try {
    return await this.mergeBranch(src, dst);
  } catch (error) {
    await this.checkoutTag(backup);
    throw error;
  }
}
```

---

### ✅ PROMPT COMPRESSOR

**Files to create/modify:**
```
CREATE:
  ✨ packages/core/lib/prompt-optimizer.mjs

MODIFY:
  📝 agents/orchestrator.md (line ~310)
```

**Quick code:**
```javascript
// prompt-optimizer.mjs - NEW FILE
export class PromptOptimizer {
  async optimize(prompt, options = {}) {
    const { targetReduction = 0.70 } = options;
    
    let optimized = prompt;
    
    // Remove boilerplate
    optimized = optimized
      .replace(/Please help me/gi, '')
      .replace(/I need you to/gi, '')
      .replace(/Can you help/gi, '');
    
    // Normalize whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    const ratio = optimized.length / prompt.length;
    return {
      optimized,
      ratio,
      achieved: ratio <= (1 - targetReduction)
    };
  }
}

// pipeline-executor.mjs - AUTO-COMPRESS
async delegate(agentName, prompt) {
  const compressed = await this.promptOptimizer.optimize(prompt);
  return await this.task(agentName, compressed.optimized);
}
```

---

### ✅ TIMEOUT HANDLER

**Files to create/modify:**
```
CREATE:
  ✨ packages/core/lib/execution-config.mjs

MODIFY:
  📝 agents/orchestrator.md (before "## Deliverables")
```

**Quick code:**
```javascript
// execution-config.mjs - NEW FILE
export const EXECUTION_TIMEOUTS = {
  perAgent: 30000,      // 30s
  perLevel: 120000,     // 2min
  totalPipeline: 600000 // 10min
};

export class ExecutionLimiter {
  async checkTimeout(agentName) {
    const elapsed = Date.now() - this.agentStartTimes[agentName];
    
    if (elapsed > EXECUTION_TIMEOUTS.perAgent) {
      const priority = AGENT_PRIORITY[agentName];
      
      if (priority === 'CRITICAL') {
        throw new Error(`Timeout: ${agentName}`);
      } else if (priority === 'HIGH') {
        // Continue but flag
      } else {
        // Skip with fallback
      }
    }
  }
}

// orchestrator.md - ADD SECTION
## Timeout & Graceful Degradation

**Configuration:**
- Per Agent: 30 seconds
- Per Level: 2 minutes
- Total: 10 minutes

**On Timeout:**
- CRITICAL agents (@security, @testing): ABORT
- HIGH agents (@code-review): CONTINUE + ALERT
- LOW agents (@performance): SKIP + FALLBACK
```

---

## 🔍 Validation Checklist

### Before Committing Phase 1:
- [ ] error-handler.mjs created and imports correctly
- [ ] pipeline-executor.mjs updated with try-catch
- [ ] orchestrator.md has error handling section
- [ ] agent-validator.mjs validates schema correctly
- [ ] token-tracker.mjs tracks tokens per agent
- [ ] All lint errors cleared: `npm run lint`
- [ ] Existing tests still pass: `npm test`

### Before Committing Phase 2:
- [ ] vcs-transaction.mjs creates checkpoints
- [ ] vcs-manager.mjs has transactional methods
- [ ] prompt-optimizer.mjs compresses to 70%+
- [ ] execution-config.mjs handles timeouts
- [ ] pipeline-executor.mjs integrates all features
- [ ] All new unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage >= 80%

---

## 🧪 Test Commands

```bash
# Run all unit tests
npm test -- packages/core/lib/*.test.mjs

# Run specific module test
npm test -- tests/unit/error-handler.test.mjs

# Run integration tests
npm test -- tests/integration/

# Check code coverage
npm test -- --coverage

# Lint all files
npm run lint

# Fix lint errors
npm run lint --fix
```

---

## 📝 Documentation Files

Your implementation guide includes:

1. **IMPLEMENTATION_GUIDE.md** (1000+ lines)
   - Exact code for each improvement
   - Line-by-line integration points
   - Detailed sections per feature

2. **ROADMAP.md** (800+ lines)
   - Visual flows and diagrams
   - Timeline and phases
   - Testing strategy

3. **QUICK_REFERENCE.md** (this file)
   - At-a-glance summary
   - Quick code snippets
   - Validation checklist

---

## 🚀 30-Day Implementation Plan

### Week 1: Error Handling
```
MON: Create error-handler.mjs skeleton
TUE: Write error level definitions + handlers
WED: Modify pipeline-executor.mjs
THU: Write unit tests
FRI: Review + fix lint errors
```

### Week 2: Validation + Tokens
```
MON: Create agent-validator.mjs
TUE: Write YAML parser + schema validator
WED: Create token-tracker.mjs
THU: Integration testing + documentation
FRI: All Phase 1 tests passing
```

### Week 3: VCS + Prompts
```
MON: Create vcs-transaction.mjs
TUE: Modify vcs-manager.mjs with transactional ops
WED: Create prompt-optimizer.mjs
THU: Write compression tests + validation
FRI: Integration testing
```

### Week 4: Timeouts + Polish
```
MON: Create execution-config.mjs
TUE: Integrate timeout handling
WED: Complete all documentation
THU: Full integration testing
FRI: Final review + merge
```

---

## 🎓 Learning Resources

### Key Concepts Explained:

**Transactional Programming**
→ Operations either fully succeed or fully rollback
→ No partial states left behind
→ Use checkpoints/tags to save before risky operations

**Prompt Compression**
→ Remove unnecessary words while preserving meaning
→ ~70% reduction target
→ Measure: length ratio before/after

**Error Levels**
→ CRITICAL: Stop pipeline completely
→ WARNING: Continue but mark for review
→ INFO: Log only, no action needed

**Graceful Degradation**
→ When service fails, use fallback
→ Skip non-critical features on timeout
→ Keep core functionality working

---

## ⚠️ Common Pitfalls

### ❌ Don't:
- Skip unit tests before integration tests
- Modify multiple files without testing each
- Use absolute paths instead of relative paths
- Forget to update orchestrator.md documentation
- Commit code with lint errors

### ✅ Do:
- Test incrementally after each change
- Use the IMPLEMENTATION_GUIDE for exact code
- Keep file paths relative to project root
- Update docs as you implement
- Run `npm run lint --fix` before committing

---

## 📞 When Stuck

1. **Check IMPLEMENTATION_GUIDE.md** for exact code
2. **Check ROADMAP.md** for visual flows
3. **Review tests/** for patterns
4. **Search existing files** for similar patterns
5. **Compare with Git history** for similar changes

---

## 🎉 Success Metrics

After implementation, you should see:

✅ **0 VCS recovery incidents** (from 2-3 per month)
✅ **Error response time: <5min** (from 30min manual debug)
✅ **Token waste reduction: 25% → 8%**
✅ **Pipeline timeout: 10% → 0.1%**
✅ **Code quality: 80%+ coverage maintained**

---

**Ready to start? Begin with:**
1. Read IMPLEMENTATION_GUIDE.md (skim first)
2. Review ROADMAP.md (understand flows)
3. Create error-handler.mjs (copy from guide)
4. Test it: `npm test`
5. Move to next improvement

Good luck! 🚀
