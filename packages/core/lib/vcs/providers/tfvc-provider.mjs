import { execFileSync } from 'node:child_process';

export class TfvcProvider {
  name = 'tfvc';
  version = '1.0.0';
  description = 'Azure DevOps TFVC version control provider';

  async detect(_path) {
    try {
      execFileSync('tf', ['version'], { stdio: 'pipe' });
      return { available: true };
    } catch {
      return { available: false, error: 'tf CLI not found on PATH' };
    }
  }

  async checkout(path, _opts = {}) {
    const args = ['vc', 'checkout', path];
    execFileSync('tf', args, { stdio: 'pipe' });
    return { success: true };
  }

  async commit(message, opts = {}) {
    const args = ['vc', 'checkin', '-c', message];
    if (opts.recursive) args.push('-r');
    execFileSync('tf', args, { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async status(opts = {}) {
    const out = execFileSync('tf', ['vc', 'status'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async log(opts = {}) {
    const args = ['vc', 'history'];
    if (opts.maxCount) args.push('-stop', String(opts.maxCount));
    const out = execFileSync('tf', args, { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async diff(opts = {}) {
    const out = execFileSync('tf', ['vc', 'diff'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async branch(name, opts = {}) {
    const args = ['vc', 'branch', name];
    if (opts.from) args.push(opts.from);
    execFileSync('tf', args, { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async merge(source, target, opts = {}) {
    execFileSync('tf', ['vc', 'merge', source, target], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  getCapabilities() {
    return ['checkout', 'commit', 'status', 'log', 'diff', 'branch', 'merge'];
  }

  _cwd(opts) {
    return opts.cwd || process.cwd();
  }
}
