import { execFileSync } from 'node:child_process';

export class HgProvider {
  name = 'hg';
  version = '1.0.0';
  description = 'Mercurial (Hg) version control provider';

  async detect(_path) {
    try {
      execFileSync('hg', ['--version'], { stdio: 'pipe' });
      return { available: true };
    } catch {
      return { available: false, error: 'hg CLI not found on PATH' };
    }
  }

  async init(path) {
    execFileSync('hg', ['init'], { cwd: path, stdio: 'pipe' });
    return { success: true };
  }

  async clone(url, path, _opts = {}) {
    execFileSync('hg', ['clone', url, path], { stdio: 'pipe' });
    return { success: true };
  }

  async commit(message, opts = {}) {
    if (opts.all) {
      execFileSync('hg', ['addremove'], { cwd: this._cwd(opts), stdio: 'pipe' });
    }
    execFileSync('hg', ['commit', '-m', message], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async push(opts = {}) {
    execFileSync('hg', ['push'], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async pull(opts = {}) {
    execFileSync('hg', ['pull'], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async branch(name, opts = {}) {
    execFileSync('hg', ['branch', name], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async merge(source, target, opts = {}) {
    if (target) {
      execFileSync('hg', ['update', target], { cwd: this._cwd(opts), stdio: 'pipe' });
    }
    execFileSync('hg', ['merge', source], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async status(opts = {}) {
    const out = execFileSync('hg', ['status'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async log(opts = {}) {
    const args = ['log', '-l', String(opts.maxCount || 10)];
    const out = execFileSync('hg', args, { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async diff(opts = {}) {
    const out = execFileSync('hg', ['diff'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  getCapabilities() {
    return ['init', 'clone', 'commit', 'push', 'pull', 'branch', 'merge', 'status', 'log', 'diff'];
  }

  _cwd(opts) {
    return opts.cwd || process.cwd();
  }
}
