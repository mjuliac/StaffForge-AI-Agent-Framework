import { execFileSync } from 'node:child_process';

export class PerforceProvider {
  name = 'perforce';
  version = '1.0.0';
  description = 'Perforce (p4) version control provider';

  async detect(_path) {
    try {
      execFileSync('p4', ['info'], { stdio: 'pipe' });
      return { available: true };
    } catch {
      return { available: false, error: 'p4 CLI not found on PATH or not connected' };
    }
  }

  async checkout(path, _opts = {}) {
    execFileSync('p4', ['edit', path], { stdio: 'pipe' });
    return { success: true };
  }

  async commit(message, opts = {}) {
    execFileSync('p4', ['submit', '-d', message], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async status(opts = {}) {
    const out = execFileSync('p4', ['opened'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async log(opts = {}) {
    const args = ['changes'];
    if (opts.maxCount) args.push('-m', String(opts.maxCount));
    const out = execFileSync('p4', args, { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async diff(opts = {}) {
    const out = execFileSync('p4', ['diff'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async branch(name, opts = {}) {
    execFileSync('p4', ['branch', '-o', name], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async merge(source, target, opts = {}) {
    execFileSync('p4', ['integrate', source, target], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  getCapabilities() {
    return ['checkout', 'commit', 'status', 'log', 'diff', 'branch', 'merge'];
  }

  _cwd(opts) {
    return opts.cwd || process.cwd();
  }
}
