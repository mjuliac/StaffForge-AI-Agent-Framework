export class IVCSWorkflow {
  name = '';
  description = '';

  getBranchName(_type, _name) {
    throw new Error('IVCSWorkflow.getBranchName() must be implemented');
  }

  getCommitPrefix(_type) {
    throw new Error('IVCSWorkflow.getCommitPrefix() must be implemented');
  }

  getMergeFlags(_target) {
    throw new Error('IVCSWorkflow.getMergeFlags() must be implemented');
  }

  getBranchTypes() {
    throw new Error('IVCSWorkflow.getBranchTypes() must be implemented');
  }

  validate() {
    return { valid: true, errors: [] };
  }
}
