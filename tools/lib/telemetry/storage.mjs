import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.staffforge',
  'telemetry'
);

export class TelemetryStorage {
  constructor(dir = null) {
    this._dir = dir || DEFAULT_DIR;
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this._dir)) {
      fs.mkdirSync(this._dir, { recursive: true });
    }
  }

  _filePath() {
    return path.join(this._dir, 'runs.jsonl');
  }

  save(runData) {
    const entry = {
      ...runData,
      _saved_at: new Date().toISOString(),
    };
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this._filePath(), line, 'utf-8');
    return entry;
  }

  load(runId) {
    const filePath = this._filePath();
    if (!fs.existsSync(filePath)) return null;

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.pipeline_id === runId) return entry;
      } catch {
        continue;
      }
    }
    return null;
  }

  list(limit = 10) {
    const filePath = this._filePath();
    if (!fs.existsSync(filePath)) return [];

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    const runs = [];
    for (let i = lines.length - 1; i >= 0 && runs.length < limit; i--) {
      try {
        runs.push(JSON.parse(lines[i]));
      } catch {
        continue;
      }
    }
    return runs;
  }

  deleteAll() {
    const filePath = this._filePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  count() {
    const filePath = this._filePath();
    if (!fs.existsSync(filePath)) return 0;

    return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean).length;
  }

  get directory() {
    return this._dir;
  }
}

export function getStorage(dir = null) {
  return new TelemetryStorage(dir);
}

export default TelemetryStorage;
