export class GitFlowWorkflow {
  name = 'git-flow';
  description = 'Classic Git Flow: main + develop + feature/bugfix/hotfix/release branches, --no-ff merges';

  getBranchName(type, name) {
    const prefixMap = {
      feature: 'feature',
      bugfix: 'bugfix',
      hotfix: 'hotfix',
      release: 'release',
      support: 'support',
    };
    const prefix = prefixMap[type] || type;
    return `${prefix}/${name}`;
  }

  getCommitPrefix(type) {
    const prefixMap = {
      feature: 'feat',
      bugfix: 'fix',
      hotfix: 'hotfix',
      release: 'release',
      refactor: 'refactor',
      docs: 'docs',
      test: 'test',
      chore: 'chore',
    };
    return prefixMap[type] || type;
  }

  getMergeFlags(target) {
    if (target === 'develop' || target === 'main') return ['--no-ff'];
    return ['--no-ff'];
  }

  getBranchTypes() {
    return ['feature', 'bugfix', 'hotfix', 'release', 'support'];
  }

  validate() {
    return { valid: true, errors: [] };
  }
}
