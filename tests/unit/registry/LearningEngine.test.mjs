import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { LearningEngine, getLearningEngine } from '../../../tools/lib/learning-engine.mjs';
import { TelemetryStorage } from '../../../tools/lib/telemetry/storage.mjs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Test 1: Constructor and singleton
{
  const engine1 = new LearningEngine();
  assert(engine1 instanceof LearningEngine, 'constructor creates instance');

  const engine2 = getLearningEngine();
  const engine3 = getLearningEngine();
  assert(engine2 === engine3, 'getLearningEngine returns same instance');
}

// Test 2: recordExecution stores data
{
  const engine = new LearningEngine();
  engine.recordExecution({
    modelId: 'gpt-4o',
    agentId: 'coder',
    taskType: 'coding',
    duration: 100,
    tokens: 500,
    cost: 0.01,
    success: true,
    error: null,
    retries: 0,
  });
  engine.recordExecution({
    modelId: 'gpt-4o',
    agentId: 'coder',
    taskType: 'reasoning',
    duration: 200,
    tokens: 1000,
    cost: 0.02,
    success: true,
    error: null,
    retries: 1,
  });
  assert(engine.getTotalRuns('gpt-4o', 'coding') === 1, 'recordExecution stores coding run');
  assert(engine.getTotalRuns('gpt-4o', 'reasoning') === 1, 'recordExecution stores reasoning run');
}

// Test 3: getSuccessRate after successful runs
{
  const engine = new LearningEngine();
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  assert(engine.getSuccessRate('m1', 't') === 1, 'getSuccessRate all successful');
}

// Test 4: getSuccessRate after mixed success/failure
{
  const engine = new LearningEngine();
  engine.recordExecution({ modelId: 'm2', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'm2', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: false, error: 'err', retries: 2 });
  engine.recordExecution({ modelId: 'm2', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  assert(engine.getSuccessRate('m2', 't') === 2 / 3, 'getSuccessRate mixed');
}

// Test 5: getSuccessRate for unknown model returns 0
{
  const engine = new LearningEngine();
  assert(engine.getSuccessRate('unknown', 't') === 0, 'getSuccessRate unknown model');
}

// Test 6: getModelRanking returns sorted by score
{
  const engine = new LearningEngine();
  // Model A: 3/3 success, fast, few tokens
  engine.recordExecution({ modelId: 'A', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'A', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  // Model B: 1/3 success, slow, many tokens
  engine.recordExecution({ modelId: 'B', agentId: 'a', taskType: 't', duration: 100, tokens: 1000, cost: 0.05, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'B', agentId: 'a', taskType: 't', duration: 100, tokens: 1000, cost: 0.05, success: false, error: 'err', retries: 1 });
  engine.recordExecution({ modelId: 'B', agentId: 'a', taskType: 't', duration: 100, tokens: 1000, cost: 0.05, success: false, error: 'err', retries: 1 });

  const rankings = engine.getModelRanking('t');
  assert(rankings.length === 2, 'getModelRanking returns 2 models');
  assert(rankings[0].modelId === 'A', 'getModelRanking best model first');
  assert(rankings[0].score > rankings[1].score, 'getModelRanking sorted descending');
  assert(rankings[0].totalRuns === 2, 'getModelRanking totalRuns correct');
  assert(rankings[1].totalRuns === 3, 'getModelRanking totalRuns correct');
}

// Test 7: getModelRanking topN limit
{
  const engine = new LearningEngine();
  engine.recordExecution({ modelId: 'X', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'Y', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'Z', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });

  const rankings = engine.getModelRanking('t', { topN: 2 });
  assert(rankings.length === 2, 'getModelRanking topN=2');
}

// Test 8: getAverageCost calculation
{
  const engine = new LearningEngine();
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.03, success: true, error: null, retries: 0 });
  assert(engine.getAverageCost('m1') === 0.02, 'getAverageCost correct');
}

// Test 9: getTotalRuns count
{
  const engine = new LearningEngine();
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't1', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't1', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't2', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  assert(engine.getTotalRuns('m1', 't1') === 2, 'getTotalRuns correct');
  assert(engine.getTotalRuns('m1', 't2') === 1, 'getTotalRuns different taskType');
}

// Test 10: clearHistory resets
{
  const engine = new LearningEngine();
  engine.recordExecution({ modelId: 'm1', agentId: 'a', taskType: 't', duration: 1, tokens: 10, cost: 0.01, success: true, error: null, retries: 0 });
  assert(engine.getTotalRuns('m1', 't') === 1, 'clearHistory has data before clear');
  engine.clearHistory();
  assert(engine.getTotalRuns('m1', 't') === 0, 'clearHistory resets data');
  assert(engine.getSuccessRate('m1', 't') === 0, 'clearHistory resets success rate');
}

// Test 11: Integration: record → ranking → clear
{
  const engine = new LearningEngine();
  engine.recordExecution({ modelId: 'gpt-4', agentId: 'a', taskType: 'chat', duration: 50, tokens: 200, cost: 0.005, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'gpt-4', agentId: 'a', taskType: 'chat', duration: 60, tokens: 250, cost: 0.006, success: true, error: null, retries: 0 });
  engine.recordExecution({ modelId: 'claude-3', agentId: 'a', taskType: 'chat', duration: 30, tokens: 150, cost: 0.003, success: false, error: 'timeout', retries: 2 });
  engine.recordExecution({ modelId: 'claude-3', agentId: 'a', taskType: 'chat', duration: 20, tokens: 100, cost: 0.002, success: true, error: null, retries: 0 });

  const rankings = engine.getModelRanking('chat');
  assert(rankings.length === 2, 'integration ranking includes 2 models');
  assert(typeof rankings[0].score === 'number', 'integration ranking has score');
  assert(rankings[0].score > 0, 'integration ranking score positive');

  const rateGpt = engine.getSuccessRate('gpt-4', 'chat');
  assert(rateGpt === 1, 'integration success rate gpt-4');

  const rateClaude = engine.getSuccessRate('claude-3', 'chat');
  assert(rateClaude === 0.5, 'integration success rate claude-3');

  engine.clearHistory();
  assert(engine.getTotalRuns('gpt-4', 'chat') === 0, 'integration clear resets');
}

// Test 12: recordExecution with storage integration
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learn-engine-test-'));
  const storage = new TelemetryStorage(dir);
  const engine = new LearningEngine(storage);

  engine.recordExecution({
    modelId: 'gpt-4o',
    agentId: 'coder',
    taskType: 'coding',
    duration: 150,
    tokens: 800,
    cost: 0.015,
    success: true,
    error: null,
    retries: 0,
  });

  const saved = storage.list(10);
  assert(saved.length === 1, 'storage integration saved one entry');
  assert(saved[0].modelId === 'gpt-4o', 'storage integration modelId matches');
  assert(saved[0].taskType === 'coding', 'storage integration taskType matches');
  assert(saved[0].success === true, 'storage integration success matches');
  assert(saved[0]._saved_at !== undefined, 'storage integration has saved timestamp');

  engine.recordExecution({
    modelId: 'claude-3',
    agentId: 'coder',
    taskType: 'coding',
    duration: 200,
    tokens: 600,
    cost: 0.012,
    success: false,
    error: 'rate_limit',
    retries: 3,
  });

  const savedAll = storage.list(10);
  assert(savedAll.length === 2, 'storage integration saved two entries');
  assert(engine.getTotalRuns('gpt-4o', 'coding') === 1, 'storage integration in-memory works');
  assert(engine.getTotalRuns('claude-3', 'coding') === 1, 'storage integration in-memory works for second');

  fs.rmSync(dir, { recursive: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
