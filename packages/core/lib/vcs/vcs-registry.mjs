export class VCSRegistry {
  constructor() {
    this._providers = new Map();
    this._workflows = new Map();
  }

  registerProvider(name, provider) {
    this._providers.set(name, provider);
  }

  getProvider(name) {
    return this._providers.get(name) || null;
  }

  listProviders() {
    return Array.from(this._providers.keys());
  }

  hasProvider(name) {
    return this._providers.has(name);
  }

  unregisterProvider(name) {
    this._providers.delete(name);
  }

  registerWorkflow(name, workflow) {
    this._workflows.set(name, workflow);
  }

  getWorkflow(name) {
    return this._workflows.get(name) || null;
  }

  listWorkflows() {
    return Array.from(this._workflows.keys());
  }

  hasWorkflow(name) {
    return this._workflows.has(name);
  }

  unregisterWorkflow(name) {
    return this._workflows.delete(name);
  }

  clear() {
    this._providers.clear();
    this._workflows.clear();
  }
}

let _defaultInstance = null;
export function getVCSRegistry() {
  if (!_defaultInstance) _defaultInstance = new VCSRegistry();
  return _defaultInstance;
}
export default getVCSRegistry;
