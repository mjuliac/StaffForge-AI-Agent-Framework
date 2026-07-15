import { execFileSync } from 'node:child_process';

export class GitProvider {
  name = 'git';
  version = '1.0.0';
  description = 'Git version control provider';

  async detect(_path) {
    try {
      execFileSync('git', ['--version'], { stdio: 'pipe' });
      return { available: true };
    } catch {
      return { available: false, error: 'git CLI not found on PATH' };
    }
  }

  async init(path) {
    execFileSync('git', ['init'], { cwd: path, stdio: 'pipe' });
    return { success: true };
  }

  async clone(url, path, opts = {}) {
    const args = ['clone', url];
    if (opts.branch) args.push('--branch', opts.branch);
    if (opts.depth) args.push('--depth', String(opts.depth));
    args.push(path);
    execFileSync('git', args, { stdio: 'pipe' });
    return { success: true };
  }

  async checkout(ref, opts = {}) {
    const args = ['checkout', ref];
    if (opts.create) args.splice(1, 0, '-b');
    execFileSync('git', args, { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async commit(message, opts = {}) {
    if (opts.all) execFileSync('git', ['add', '-A'], { cwd: this._cwd(opts), stdio: 'pipe' });
    if (opts.files) execFileSync('git', ['add', ...opts.files], { cwd: this._cwd(opts), stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', message], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async push(remote = 'origin', opts = {}) {
    const args = ['push', remote];
    if (opts.branch) args.push(opts.branch);
    if (opts.tags) args.push('--tags');
    if (opts.force) args.push('--force');
    execFileSync('git', args, { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async pull(remote = 'origin', opts = {}) {
    const args = ['pull', remote];
    if (opts.branch) args.push(opts.branch);
    if (opts.rebase) args.push('--rebase');
    else args.push('--ff-only');
    execFileSync('git', args, { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async merge(source, target, opts = {}) {
    if (target) {
      execFileSync('git', ['checkout', target], { cwd: this._cwd(opts), stdio: 'pipe' });
    }
    const args = ['merge', source];
    if (opts.noFF !== false) args.push('--no-ff');
    if (opts.squash) args.push('--squash');
    if (opts.message) args.push('-m', opts.message);
    execFileSync('git', args, { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async branch(name, opts = {}) {
    const args = ['branch'];
    if (opts.from) {
      args.push(name, opts.from);
    } else {
      args.push(name);
    }
    execFileSync('git', args, { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async tag(name, message, opts = {}) {
    execFileSync('git', ['tag', '-a', name, '-m', message], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  async status(opts = {}) {
    const out = execFileSync('git', ['status', '--porcelain'], { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async log(opts = {}) {
    const args = ['log', '--oneline'];
    if (opts.maxCount) args.push(`-${opts.maxCount}`);
    const out = execFileSync('git', args, { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async diff(from, to, opts = {}) {
    const args = ['diff'];
    if (from) args.push(from);
    if (to) args.push(to);
    const out = execFileSync('git', args, { cwd: this._cwd(opts), encoding: 'utf-8' });
    return { success: true, data: out.trim() };
  }

  async addRemote(name, url, opts = {}) {
    execFileSync('git', ['remote', 'add', name, url], { cwd: this._cwd(opts), stdio: 'pipe' });
    return { success: true };
  }

  getCapabilities() {
    return [
      'init',
      'clone',
      'checkout',
      'commit',
      'push',
      'pull',
      'merge',
      'branch',
      'tag',
      'status',
      'log',
      'diff',
      'addRemote',
    ];
  }

  _cwd(opts) {
    return opts.cwd || process.cwd();
  }
}
