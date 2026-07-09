import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { TelemetryCollector, TelemetryStorage, TelemetryReporter } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
}

// --- Collector Tests ---

// Test 1: startRun creates a run
{
  const c = new TelemetryCollector();
  const run = c.startRun('pipe-1', 'feature');
  assert(run.pipeline_id === 'pipe-1', 'startRun sets id');
  assert(run.task_type === 'feature', 'startRun sets task_type');
  assert(run.status === 'running', 'startRun sets running status');
  assert(run.timestamp, 'startRun sets timestamp');
}

// Test 2: recordAgentCall
{
  const c = new TelemetryCollector();
  c.startRun('pipe-2', 'bugfix');
  const entry = c.recordAgentCall('architect', { duration: 500, tokens: 100 });
  assert(entry.id === 'architect', 'recordAgentCall sets id');
  assert(entry.duration_ms === 500, 'recordAgentCall sets duration');
  assert(entry.tokens === 100, 'recordAgentCall sets tokens');
  assert(entry.status === 'success', 'recordAgentCall default status');
}

// Test 3: recordAgentCall without active run throws
{
  const c = new TelemetryCollector();
  try {
    c.recordAgentCall('architect');
    assert(false, 'should throw without startRun');
  } catch (e) {
    assert(e.message.includes('No active run'), 'throws without startRun');
  }
}

// Test 4: recordError creates error entry
{
  const c = new TelemetryCollector();
  c.startRun('pipe-3', 'feature');
  const err = c.recordError('security', 'timeout connecting to API');
  assert(err.agent_id === 'security', 'recordError sets agent_id');
  assert(err.error === 'timeout connecting to API', 'recordError sets message');
}

// Test 5: endRun produces report
{
  const c = new TelemetryCollector();
  c.startRun('pipe-4', 'feature');
  c.recordAgentCall('architect', { duration: 300, tokens: 50 });
  c.recordAgentCall('security', { duration: 700, tokens: 120, status: 'error' });
  const report = c.endRun('completed');
  assert(report.status === 'completed', 'endRun status');
  assert(report.duration_ms >= 0, 'endRun duration');
  assert(report.total_tokens === 170, 'endRun total tokens');
  assert(report.agents.length === 2, 'endRun agents');
}

// Test 6: getReport returns enriched data
{
  const c = new TelemetryCollector();
  c.startRun('pipe-5', 'refactor');
  c.recordAgentCall('refactor', { duration: 200, tokens: 80 });
  c.endRun('completed');
  const r = c.getReport();
  assert(r.agent_count === 1, 'getReport agent_count');
  assert(r.error_count === 0, 'getReport error_count');
  assert(r.agent_summary.success === 1, 'getReport summary success');
  assert(r.agent_summary.total === 1, 'getReport summary total');
}

// Test 7: isRunning
{
  const c = new TelemetryCollector();
  assert(c.isRunning() === false, 'isRunning false before start');
  c.startRun('pipe-6', 'feature');
  assert(c.isRunning() === true, 'isRunning true after start');
  c.endRun('completed');
  assert(c.isRunning() === false, 'isRunning false after end');
}

// Test 8: auto-generated pipeline_id
{
  const c = new TelemetryCollector();
  const run = c.startRun(null, 'feature');
  assert(run.pipeline_id.startsWith('run_'), 'auto-generated id prefix');
}

// Test 9: multiple agent calls accumulate
{
  const c = new TelemetryCollector();
  c.startRun('pipe-7', 'feature');
  c.recordAgentCall('a', { tokens: 10 });
  c.recordAgentCall('b', { tokens: 20 });
  c.recordAgentCall('c', { tokens: 30 });
  const report = c.endRun();
  assert(report.agents.length === 3, 'multiple agents');
  assert(report.total_tokens === 60, 'accumulated tokens');
}

// --- Storage Tests ---

// Test 10: save and load
{
  const dir = tmpDir();
  const s = new TelemetryStorage(dir);
  const data = { pipeline_id: 'stest-1', task_type: 'feature', agents: [] };
  s.save(data);
  const loaded = s.load('stest-1');
  assert(loaded !== null, 'storage load found');
  assert(loaded.task_type === 'feature', 'storage load data');
  fs.rmSync(dir, { recursive: true });
}

// Test 11: list returns recent runs
{
  const dir = tmpDir();
  const s = new TelemetryStorage(dir);
  s.save({ pipeline_id: 'r1', task_type: 'a', agents: [] });
  s.save({ pipeline_id: 'r2', task_type: 'b', agents: [] });
  s.save({ pipeline_id: 'r3', task_type: 'c', agents: [] });
  const list = s.list(2);
  assert(list.length === 2, 'storage list limit');
  assert(list[0].pipeline_id === 'r3', 'storage list newest first');
  fs.rmSync(dir, { recursive: true });
}

// Test 12: count
{
  const dir = tmpDir();
  const s = new TelemetryStorage(dir);
  assert(s.count() === 0, 'storage count empty');
  s.save({ pipeline_id: 'c1', task_type: 'x', agents: [] });
  s.save({ pipeline_id: 'c2', task_type: 'y', agents: [] });
  assert(s.count() === 2, 'storage count');
  fs.rmSync(dir, { recursive: true });
}

// Test 13: deleteAll
{
  const dir = tmpDir();
  const s = new TelemetryStorage(dir);
  s.save({ pipeline_id: 'd1', task_type: 'x', agents: [] });
  assert(s.count() === 1, 'storage delete before');
  assert(s.deleteAll() === true, 'storage deleteAll returns true');
  assert(s.count() === 0, 'storage deleteAll cleared');
  fs.rmSync(dir, { recursive: true });
}

// Test 14: load non-existent returns null
{
  const dir = tmpDir();
  const s = new TelemetryStorage(dir);
  const loaded = s.load('nonexistent');
  assert(loaded === null, 'storage load nonexistent');
  fs.rmSync(dir, { recursive: true });
}

// --- Reporter Tests ---

// Test 15: generateSummary stats
{
  const r = new TelemetryReporter();
  const agents = [
    { id: 'a', status: 'success', tokens: 100, duration_ms: 500 },
    { id: 'b', status: 'success', tokens: 200, duration_ms: 300 },
    { id: 'c', status: 'error', tokens: 50, duration_ms: 100 },
  ];
  const summary = r.generateSummary(agents);
  assert(summary.total === 3, 'summary total');
  assert(summary.stats.success === 2, 'summary success');
  assert(summary.stats.error === 1, 'summary error');
  assert(summary.stats.totalTokens === 350, 'summary tokens');
  assert(summary.stats.avgTokens === 117, 'summary avg tokens');
}

// Test 16: generateMarkdown
{
  const r = new TelemetryReporter();
  const report = {
    pipeline_id: 'md-1',
    task_type: 'feature',
    status: 'completed',
    duration_ms: 5000,
    total_tokens: 1500,
    provider: 'OpenAI',
    model: 'gpt-4o',
    timestamp: '2026-07-07T12:00:00Z',
    agents: [
      { id: 'architect', status: 'success', duration_ms: 2000, tokens: 800 },
    ],
    errors: [],
  };
  const md = r.generateMarkdown(report);
  assert(md.includes('Pipeline Report'), 'markdown title');
  assert(md.includes('architect'), 'markdown agent');
  assert(md.includes('gpt-4o'), 'markdown model');
}

// Test 17: generateMarkdown with null report
{
  const r = new TelemetryReporter();
  const md = r.generateMarkdown(null);
  assert(md === '# Pipeline Report\n\n_No data_', 'markdown null report');
}

// Test 18: generateJSON
{
  const r = new TelemetryReporter();
  const report = {
    pipeline_id: 'json-1',
    task_type: 'bugfix',
    status: 'completed',
    agents: [{ id: 'debugging', status: 'success', tokens: 50, duration_ms: 100 }],
  };
  const json = r.generateJSON(report);
  const parsed = JSON.parse(json);
  assert(parsed.pipeline_id === 'json-1', 'json pipeline_id');
  assert(parsed.agent_summary.total === 1, 'json agent_summary');
}

// Test 19: generateSummary empty agents
{
  const r = new TelemetryReporter();
  const summary = r.generateSummary([]);
  assert(Object.keys(summary).length === 0, 'summary empty agents');
}

// Test 20: generateSummary slowest and topTokens
{
  const r = new TelemetryReporter();
  const agents = [
    { id: 'slow1', status: 'success', duration_ms: 9999, tokens: 10 },
    { id: 'fast', status: 'success', duration_ms: 1, tokens: 5 },
    { id: 'slow2', status: 'success', duration_ms: 5000, tokens: 9999 },
  ];
  const summary = r.generateSummary(agents);
  assert(summary.slowest[0].id === 'slow1', 'slowest agent');
  assert(summary.topTokens[0].id === 'slow2', 'top tokens');
}

// Test 21: Storage using default dir
{
  const s = new TelemetryStorage();
  assert(s.directory.includes('.staffforge'), 'default dir path');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
