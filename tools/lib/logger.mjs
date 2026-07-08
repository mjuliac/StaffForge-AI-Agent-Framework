const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

const PREFIXES = { debug: 'DEBUG', info: 'INFO ', warn: 'WARN ', error: 'ERROR' };

export class Logger {
  constructor(level = process.env.STAFFFORGE_LOG_LEVEL || 'info') {
    this._level = LEVELS[level] ?? LEVELS.info;
  }

  debug(...args) {
    if (this._level <= LEVELS.debug) {
      console.error(PREFIXES.debug, ...args);
    }
  }

  info(...args) {
    if (this._level <= LEVELS.info) {
      console.error(PREFIXES.info, ...args);
    }
  }

  warn(...args) {
    if (this._level <= LEVELS.warn) {
      console.error(PREFIXES.warn, ...args);
    }
  }

  error(...args) {
    if (this._level <= LEVELS.error) {
      console.error(PREFIXES.error, ...args);
    }
  }

  setLevel(level) {
    this._level = LEVELS[level] ?? LEVELS.info;
  }

  getLevel() {
    return Object.keys(LEVELS).find(k => LEVELS[k] === this._level) || 'info';
  }
}

let _defaultInstance = null;
export function getLogger() {
  if (!_defaultInstance) {
    _defaultInstance = new Logger();
  }
  return _defaultInstance;
}

export default getLogger;
