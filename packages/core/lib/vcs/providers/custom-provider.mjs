import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export class CustomProvider {
  name = 'custom';
  version = '1.0.0';
  description = 'Custom version control provider (user-defined shell commands)';

  constructor(commands = {}) {
    this._commands = commands;
  }

  async detect(path) {
    return { available: true };
  }

  async init(path) {
    return this._run('init', path);
  }

  async clone(url, path, opts = {}) {
    return this._run('clone', url, path);
  }

  async commit(message, opts = {}) {
    return this._run('commit', message);
  }

  async status(opts = {}) {
    const out = this._run('status');
    return { success: true, data: String(out) };
  }

  async log(opts = {}) {
    const out = this._run('log');
    return { success: true, data: String(out) };
  }

  async push(opts = {}) {
    return this._run('push');
  }

  async pull(opts = {}) {
    return this._run('pull');
  }

  setCommand(name, command) {
    this._commands[name] = command;
  }

  _run(name, ...args) {
    const cmd = this._commands[name];
    if (!cmd) throw new Error(`Custom provider has no command defined for: ${name}`);
    const fullCmd = typeof cmd === 'string' ? cmd.replace(/\{args\}/g, args.join(' ')) : cmd;
    return execFileSync(fullCmd, args, { stdio: 'pipe', shell: true });
  }

  getCapabilities() {
    return Object.keys(this._commands);
  }
}
