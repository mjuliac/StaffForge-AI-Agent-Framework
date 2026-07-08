const TASK_TO_PROFILE = {
  feature: 'coding',
  bugfix: 'coding',
  refactor: 'architecture',
  security: 'security',
  deployment: 'coding',
  hotfix: 'quick',
};

const PROFILE_SIGNALS = {
  documentation: ['document', 'readme', 'docs', 'api-ref', 'manual', 'guide'],
  testing: ['test', 'test-suite', 'coverage', 'spec', 'assert'],
  review: ['review', 'audit', 'pr-review', 'code-review', 'inspect'],
  reasoning: ['architect', 'design', 'ddd', 'planning', 'analyze'],
};

export class TaskMapper {
  constructor() {
    this._mapping = { ...TASK_TO_PROFILE };
  }

  mapTaskType(taskType, prompt = '') {
    const mapped = this._mapping[taskType] || 'coding';
    if (mapped === 'coding' && prompt) {
      const fromPrompt = this._detectFromPrompt(prompt);
      if (fromPrompt) return fromPrompt;
    }
    return mapped;
  }

  _detectFromPrompt(prompt) {
    const lower = prompt.toLowerCase();
    for (const [profile, signals] of Object.entries(PROFILE_SIGNALS)) {
      for (const signal of signals) {
        if (lower.includes(signal.replace('-', ' '))) {
          return profile;
        }
      }
    }
    return null;
  }

  getAllMappings() {
    return { ...this._mapping, ...Object.fromEntries(Object.keys(PROFILE_SIGNALS).map((k) => [k, k])) };
  }
}

let _defaultInstance = null;
export function getTaskMapper() {
  if (!_defaultInstance) {
    _defaultInstance = new TaskMapper();
  }
  return _defaultInstance;
}

export default getTaskMapper;
