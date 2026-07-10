export class GitHubFlowWorkflow {
  name = 'github-flow';
  description = 'GitHub Flow: single main branch, feature branches with PRs, squash merges';

  getBranchName(type, name) {
    return `feature/${name}`;
  }

  getCommitPrefix(type) {
    return 'feat';
  }

  getMergeFlags(target) {
    return ['--squash'];
  }

  getBranchTypes() {
    return ['feature'];
  }

  validate() {
    return { valid: true, errors: [] };
  }
}
