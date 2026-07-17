import {
  GitFlowWorkflow,
  GitHubFlowWorkflow,
  GitLabFlowWorkflow,
  TrunkBasedWorkflow,
  CustomWorkflow,
} from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// ── GitFlowWorkflow ──
{
  const wf = new GitFlowWorkflow();
  assert(wf.name === 'git-flow', 'GitFlow name');

  const bn = wf.getBranchName('feature', 'auth');
  assert(bn === 'feature/auth', 'GitFlow branch name feature');

  const bn2 = wf.getBranchName('bugfix', 'login');
  assert(bn2 === 'bugfix/login', 'GitFlow branch name bugfix');

  const bn3 = wf.getBranchName('hotfix', 'urgent');
  assert(bn3 === 'hotfix/urgent', 'GitFlow branch name hotfix');

  const bn4 = wf.getBranchName('release', 'v1.0');
  assert(bn4 === 'release/v1.0', 'GitFlow branch name release');

  const cp = wf.getCommitPrefix('feature');
  assert(cp === 'feat', 'GitFlow commit prefix feature');

  const cp2 = wf.getCommitPrefix('bugfix');
  assert(cp2 === 'fix', 'GitFlow commit prefix bugfix');

  const cp3 = wf.getCommitPrefix('hotfix');
  assert(cp3 === 'hotfix', 'GitFlow commit prefix hotfix');

  const mf = wf.getMergeFlags('develop');
  assert(mf[0] === '--no-ff', 'GitFlow merge flags');

  const bt = wf.getBranchTypes();
  assert(bt.includes('feature'), 'GitFlow branch types feature');
  assert(bt.includes('bugfix'), 'GitFlow branch types bugfix');
  assert(bt.includes('hotfix'), 'GitFlow branch types hotfix');
  assert(bt.includes('release'), 'GitFlow branch types release');
  assert(bt.includes('support'), 'GitFlow branch types support');

  const v = wf.validate();
  assert(v.valid === true, 'GitFlow validate');
}

// ── GitHubFlowWorkflow ──
{
  const wf = new GitHubFlowWorkflow();
  assert(wf.name === 'github-flow', 'GitHubFlow name');

  const bn = wf.getBranchName('feature', 'auth');
  assert(bn === 'feature/auth', 'GitHubFlow branch name');

  const cp = wf.getCommitPrefix('feature');
  assert(cp === 'feat', 'GitHubFlow commit prefix');

  const mf = wf.getMergeFlags('main');
  assert(mf[0] === '--squash', 'GitHubFlow merge flags squash');

  const bt = wf.getBranchTypes();
  assert(bt.length === 1, 'GitHubFlow only feature branches');
  assert(bt[0] === 'feature', 'GitHubFlow branch type feature');

  const v = wf.validate();
  assert(v.valid === true, 'GitHubFlow validate');
}

// ── GitLabFlowWorkflow ──
{
  const wf = new GitLabFlowWorkflow();
  assert(wf.name === 'gitlab-flow', 'GitLabFlow name');

  const bn = wf.getBranchName('feature', 'auth');
  assert(bn === 'feature/auth', 'GitLabFlow branch name feature');

  const bn2 = wf.getBranchName('bugfix', 'login');
  assert(bn2 === 'fix/login', 'GitLabFlow branch name bugfix');

  const mf = wf.getMergeFlags('main');
  assert(mf[0] === '--rebase', 'GitLabFlow merge flags rebase');

  const mf2 = wf.getMergeFlags('develop');
  assert(mf2[0] === '--no-ff', 'GitLabFlow merge flags no-ff for non-main');

  const bt = wf.getBranchTypes();
  assert(bt.includes('pre-production'), 'GitLabFlow branch types pre-production');
}

// ── TrunkBasedWorkflow ──
{
  const wf = new TrunkBasedWorkflow();
  assert(wf.name === 'trunk-based', 'TrunkBased name');

  const bn = wf.getBranchName('feat', 'auth');
  assert(bn === 'feat-auth', 'TrunkBased branch name format');

  const cp = wf.getCommitPrefix('feat');
  assert(cp === 'feat', 'TrunkBased commit prefix');

  const mf = wf.getMergeFlags('main');
  assert(mf[0] === '--ff-only', 'TrunkBased merge flags ff-only');

  const bt = wf.getBranchTypes();
  assert(bt.includes('feat'), 'TrunkBased branch types feat');
  assert(bt.includes('fix'), 'TrunkBased branch types fix');
  assert(bt.includes('chore'), 'TrunkBased branch types chore');
}

// ── CustomWorkflow ──
{
  const wf = new CustomWorkflow({ branchTypes: ['custom-a', 'custom-b'] });
  assert(wf.name === 'custom', 'CustomWorkflow name');

  const bn = wf.getBranchName('custom-a', 'task-1');
  assert(bn.includes('custom-a'), 'CustomWorkflow branch name');

  const cp = wf.getCommitPrefix('custom-a');
  assert(cp === 'custom-a', 'CustomWorkflow commit prefix fallback');

  const bt = wf.getBranchTypes();
  assert(bt.includes('custom-a'), 'CustomWorkflow branch types');
  assert(bt.includes('custom-b'), 'CustomWorkflow branch types');
}

// ── CustomWorkflow with custom config ──
{
  const wf = new CustomWorkflow();
  wf.setConfig({
    branchTypes: ['feature', 'chore'],
    prefixMap: { feature: 'feat', chore: 'chore' },
    mergeFlags: ['--squash'],
  });
  assert(wf.getBranchTypes().includes('feature'), 'CustomWorkflow after setConfig');
  const mf = wf.getMergeFlags('main');
  assert(mf[0] === '--squash', 'CustomWorkflow merge flags after setConfig');
  const v = wf.validate();
  assert(v.valid === true, 'CustomWorkflow validate');
}

console.log(`\nWorkflows: ${passed} passed, ${failed} failed`);
