export class GitHubFlowWorkflow {
  name = 'github-flow';
  description = 'GitHub Flow: single main branch, feature branches with PRs, squash merges';

  getBranchName(type, name) {
    return `feature/${name}`;
  }

  getCommitPrefix(_type) {
    return 'feat';
  }

  getMergeFlags(_target) {
    return ['--squash'];
  }

  getBranchTypes() {
    return ['feature'];
  }

  validate() {
    return { valid: true, errors: [] };
  }
}
