import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export class SvnProvider {
  name = 'svn';
  version = '1.0.0';
  description = 'Subversion (SVN) version control provider';

  async detect(path) {
    try {
      execFileSync('svn', ['--version'], { stdio: 'pipe' });
      return { available: true };
    } catch {
      return { available: false, error: 'svn CLI not found on PATH' };
    }
  }

  async init(path) {
    execFileSync('svnadmin', ['create', path], { stdio: 'pipe' });
    return { success: true };
  }

  async checkout(url, path, opts = {}) {
    const args = ['checkout', url, path];
    execFileSync('svn', args, { stdio: 'pipe' });
    return { success: true };
  }

  async commit(message, opts = {}) {
    if (opts.files || opts.all) {
      const targets = opts.files || ['.'];
      execFileSync('svn', ['add', '--force', ...targets], { cwd: this._cwd(opts), stdio: 'pipe' });
    }
    execFileSync('svn', ['commit', '-m', message], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async status(opts = {}) {
    const out = execFileSync('svn', ['status'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async log(opts = {}) {
    const args = ['log', '-l', String(opts.maxCount || 10)];
    const out = execFileSync('svn', args, { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async diff(opts = {}) {
    const out = execFileSync('svn', ['diff'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  getCapabilities() {
    return ['init', 'checkout', 'commit', 'status', 'log', 'diff'];
  }

  _cwd(opts) {
    return opts.cwd || process.cwd();
  }
}
