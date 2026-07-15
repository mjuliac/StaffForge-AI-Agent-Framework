export class TrunkBasedWorkflow {
  name = 'trunk-based';
  description = 'Trunk Based Development: short-lived branches, continuous merge to main, no develop';

  getBranchName(type, name) {
    return `${type}-${name}`;
  }

  getCommitPrefix(_type) {
    return 'feat';
  }

  getMergeFlags(_target) {
    return ['--ff-only'];
  }

  getBranchTypes() {
    return ['feat', 'fix', 'chore'];
  }

  validate() {
    return { valid: true, errors: [] };
  }
}
