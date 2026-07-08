import crypto from 'node:crypto';

export class TelemetryCollector {
  constructor(storage = null) {
    this._storage = storage;
    this._reset();
  }

  _reset() {
    this._run = null;
    this._agents = [];
    this._errors = [];
    this._startTime = null;
  }

  _now() {
    return Date.now();
  }

  _generateId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(4).toString('hex');
    return `run_${date}_${rand}`;
  }

  startRun(pipelineId, taskType, context = {}) {
    this._reset();
    this._run = {
      pipeline_id: pipelineId || this._generateId(),
      task_type: taskType,
      pipeline: context.pipeline || [],
      provider: context.provider || null,
      model: context.model || null,
      status: 'running',
      errors: [],
      timestamp: new Date().toISOString(),
    };
    this._startTime = this._now();
    return this._run;
  }

  recordAgentCall(agentId, { duration, tokens, model, provider, status = 'success' } = {}) {
    if (!this._run) throw new Error('No active run. Call startRun() first.');

    const entry = {
      id: agentId,
      duration_ms: duration || null,
      tokens: tokens || null,
      model: model || this._run.model || null,
      provider: provider || this._run.provider || null,
      status,
    };
    this._agents.push(entry);
    return entry;
  }

  recordError(agentId, error) {
    if (!this._run) throw new Error('No active run. Call startRun() first.');

    const entry = {
      agent_id: agentId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
    this._errors.push(entry);

    this.recordAgentCall(agentId, { status: 'error' });
    return entry;
  }

  endRun(status = 'completed') {
    if (!this._run) throw new Error('No active run. Call startRun() first.');

    const durationMs = this._now() - this._startTime;
    const totalTokens = this._agents.reduce((sum, a) => sum + (a.tokens || 0), 0);
    const providers = [...new Set(this._agents.map(a => a.provider).filter(Boolean))];
    const models = [...new Set(this._agents.map(a => a.model).filter(Boolean))];

    this._run.status = status;
    this._run.duration_ms = durationMs;
    this._run.total_tokens = totalTokens;
    this._run.agents = [...this._agents];
    this._run.errors = [...this._errors];
    this._run.provider = providers[0] || this._run.provider || null;
    this._run.model = models[0] || this._run.model || null;

    if (this._storage) {
      this._storage.save(this._run);
    }

    return this._run;
  }

  getReport() {
    if (!this._run) return null;
    return {
      ...this._run,
      agent_count: this._agents.length,
      error_count: this._errors.length,
      agent_summary: {
        success: this._agents.filter(a => a.status === 'success').length,
        error: this._agents.filter(a => a.status === 'error').length,
        total: this._agents.length,
      },
    };
  }

  isRunning() {
    return this._run !== null && this._run.status === 'running';
  }
}

export function getCollector(storage = null) {
  return new TelemetryCollector(storage);
}

export default TelemetryCollector;
