export class CustomWorkflow {
  name = 'custom';
  description = 'User-defined workflow with customizable branch naming, commit prefixes, and merge strategies';

  constructor(config = {}) {
    this._config = config;
    this._branchTypes = config.branchTypes || ['feature', 'bugfix', 'hotfix'];
    this._prefixMap = config.prefixMap || { feature: 'feat', bugfix: 'fix', hotfix: 'hotfix' };
    this._branchTemplate = config.branchTemplate || ((type) => type);
    this._mergeFlags = config.mergeFlags || ['--no-ff'];
    this._commitPrefix = config.commitPrefix || ((type) => this._prefixMap[type] || type);
  }

  getBranchName(type, name) {
    const prefix = typeof this._branchTemplate === 'function' ? this._branchTemplate(type, name) : `${type}/${name}`;
    return `${prefix}/${name}`;
  }

  getCommitPrefix(type) {
    return this._commitPrefix(type);
  }

  getMergeFlags(_target) {
    return this._mergeFlags;
  }

  getBranchTypes() {
    return [...this._branchTypes];
  }

  setConfig(config) {
    this._config = config;
    if (config.branchTypes) this._branchTypes = config.branchTypes;
    if (config.prefixMap) this._prefixMap = config.prefixMap;
    if (config.branchTemplate) this._branchTemplate = config.branchTemplate;
    if (config.mergeFlags) this._mergeFlags = config.mergeFlags;
    if (config.commitPrefix) this._commitPrefix = config.commitPrefix;
  }

  validate() {
    const errors = [];
    if (!this._branchTypes || !this._branchTypes.length) {
      errors.push('branchTypes must be a non-empty array');
    }
    return { valid: errors.length === 0, errors };
  }
}
