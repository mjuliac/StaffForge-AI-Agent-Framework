/**
 * SQLiteStorage — Enterprise telemetry storage backed by SQLite.
 *
 * Implements ITelemetryStorage from @staffforge/plugin-sdk.
 * Requires Node.js >= 22 (built-in node:sqlite). If node:sqlite is unavailable,
 * it falls back to an in-memory store so the module still loads.
 *
 * LICENSE: Commercial (Licencia Comercial StaffForge). Not covered by GPL-3.0.
 */

let sqliteModule = null;
try {
  sqliteModule = await import('node:sqlite');
} catch {
  sqliteModule = null;
}

class MemoryFallback {
  constructor() {
    this._rows = [];
  }
  save(runData) {
    const id = runData.id || `run-${this._rows.length + 1}`;
    const savedAt = new Date().toISOString();
    const entry = { ...runData, id, savedAt };
    this._rows.push(entry);
    return { id, savedAt };
  }
  load(runId) {
    return this._rows.find((e) => e.id === runId) || null;
  }
  list(limit = 10) {
    return this._rows.slice(-limit);
  }
  count() {
    return this._rows.length;
  }
  query(filter = {}) {
    return this._rows.filter((e) => {
      if (filter.taskType && e.taskType !== filter.taskType) return false;
      if (filter.status && e.status !== filter.status) return false;
      return true;
    });
  }
  deleteAll() {
    this._rows = [];
    return true;
  }
}

export class SQLiteStorage {
  /**
   * @param {string} dbPath - Path to the SQLite database file (':memory:' for in-memory)
   */
  constructor(dbPath = ':memory:') {
    if (!sqliteModule) {
      this._fallback = new MemoryFallback();
      this._usingFallback = true;
      return;
    }
    this._usingFallback = false;
    this._db = new sqliteModule.DatabaseSync(dbPath);
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id TEXT PRIMARY KEY,
        task_type TEXT,
        status TEXT,
        saved_at TEXT,
        payload TEXT
      );
    `);
  }

  get isFallback() {
    return this._usingFallback === true;
  }

  save(runData) {
    if (this._usingFallback) return this._fallback.save(runData);
    const id = runData.id || `run-${Date.now()}`;
    const savedAt = new Date().toISOString();
    this._db
      .prepare('INSERT OR REPLACE INTO telemetry (id, task_type, status, saved_at, payload) VALUES (?, ?, ?, ?, ?)')
      .run(id, runData.taskType || null, runData.status || null, savedAt, JSON.stringify(runData));
    return { id, savedAt };
  }

  load(runId) {
    if (this._usingFallback) return this._fallback.load(runId);
    const row = this._db.prepare('SELECT * FROM telemetry WHERE id = ?').get(runId);
    return row ? { ...JSON.parse(row.payload), id: row.id, savedAt: row.saved_at } : null;
  }

  list(limit = 10) {
    if (this._usingFallback) return this._fallback.list(limit);
    const rows = this._db.prepare('SELECT * FROM telemetry ORDER BY saved_at DESC LIMIT ?').all(limit);
    return rows.map((r) => ({ ...JSON.parse(r.payload), id: r.id, savedAt: r.saved_at }));
  }

  count() {
    if (this._usingFallback) return this._fallback.count();
    return this._db.prepare('SELECT COUNT(*) AS c FROM telemetry').get().c;
  }

  query(filter = {}) {
    if (this._usingFallback) return this._fallback.query(filter);
    let sql = 'SELECT * FROM telemetry WHERE 1=1';
    const params = [];
    if (filter.taskType) {
      sql += ' AND task_type = ?';
      params.push(filter.taskType);
    }
    if (filter.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    const rows = this._db.prepare(sql).all(...params);
    return rows.map((r) => ({ ...JSON.parse(r.payload), id: r.id, savedAt: r.saved_at }));
  }

  deleteAll() {
    if (this._usingFallback) return this._fallback.deleteAll();
    this._db.exec('DELETE FROM telemetry');
    return true;
  }

  close() {
    if (!this._usingFallback && this._db) this._db.close();
  }
}

export default SQLiteStorage;
