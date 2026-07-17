import { VCSConfig } from './vcs-config.mjs';
import { getVCSRegistry } from './vcs-registry.mjs';

export class VCSManager {
  constructor(configPath = null, registry = null) {
    this._config = new VCSConfig(configPath);
    this._registry = registry || getVCSRegistry();
    this._providerCache = null;
  }

  getConfig() {
    return this._config.getEffectiveConfig();
  }

  getActiveProvider() {
    if (this._providerCache) return this._providerCache;
    const cfg = this._config.getEffectiveConfig();
    this._providerCache = this._registry.getProvider(cfg.provider);
    return this._providerCache;
  }

  clearCache() {
    this._providerCache = null;
  }

  async detect() {
    const provider = this.getActiveProvider();
    if (!provider) return { available: false, error: `Provider ${this.getConfig().provider} not registered` };
    try {
      return await provider.detect();
    } catch (e) {
      return { available: false, error: e.message };
    }
  }

  async init(path, opts) {
    return this._exec('init', path, opts);
  }

  async clone(url, path, opts) {
    return this._exec('clone', url, path, opts);
  }

  async checkout(ref, opts) {
    return this._exec('checkout', ref, opts);
  }

  async commit(message, opts) {
    return this._exec('commit', message, opts);
  }

  async push(remote, opts) {
    return this._exec('push', remote, opts);
  }

  async pull(remote, opts) {
    return this._exec('pull', remote, opts);
  }

  async merge(source, target, opts) {
    return this._exec('merge', source, target, opts);
  }

  async branch(name, opts) {
    return this._exec('branch', name, opts);
  }

  async tag(name, message, opts) {
    return this._exec('tag', name, message, opts);
  }

  async status(opts) {
    return this._exec('status', opts);
  }

  async log(opts) {
    return this._exec('log', opts);
  }

  async diff(from, to, opts) {
    return this._exec('diff', from, to, opts);
  }

  async addRemote(name, url, opts) {
    return this._exec('addRemote', name, url, opts);
  }

  getActiveWorkflow() {
    const cfg = this._config.getEffectiveConfig();
    return this._registry.getWorkflow(cfg.workflow);
  }

  formatBranchName(type, name) {
    const wf = this.getActiveWorkflow();
    if (!wf) return `${type}/${name}`;
    return wf.getBranchName(type, name);
  }

  formatCommitPrefix(type) {
    const wf = this.getActiveWorkflow();
    if (!wf) return type;
    return wf.getCommitPrefix(type);
  }

  getMergeFlags(target) {
    const wf = this.getActiveWorkflow();
    if (!wf) return ['--no-ff'];
    return wf.getMergeFlags(target);
  }

  async _exec(method, ...args) {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error(`No active VCS provider (${this.getConfig().provider} not registered)`);
    const fn = provider[method];
    if (typeof fn !== 'function') throw new Error(`Provider ${provider.name} does not support ${method}`);
    return fn.call(provider, ...args);
  }
}
