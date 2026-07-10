export class GitLabFlowWorkflow {
  name = 'gitlab-flow';
  description = 'GitLab Flow: main + pre-production + environment branches, merge requests with rebase';

  getBranchName(type, name) {
    const prefixMap = {
      feature: 'feature',
      bugfix: 'fix',
      hotfix: 'hotfix',
    };
    const prefix = prefixMap[type] || type;
    return `${prefix}/${name}`;
  }

  getCommitPrefix(type) {
    const prefixMap = {
      feature: 'feat',
      bugfix: 'fix',
      hotfix: 'hotfix',
    };
    return prefixMap[type] || type;
  }

  getMergeFlags(target) {
    if (target === 'main' || target === 'pre-production') return ['--rebase'];
    return ['--no-ff'];
  }

  getBranchTypes() {
    return ['feature', 'bugfix', 'hotfix', 'pre-production'];
  }

  validate() {
    return { valid: true, errors: [] };
  }
}
