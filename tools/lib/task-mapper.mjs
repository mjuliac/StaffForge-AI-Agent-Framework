const TASK_TO_PROFILE = {
  feature: 'coding',
  bugfix: 'coding',
  refactor: 'architecture',
  security: 'security',
  deployment: 'coding',
  hotfix: 'quick',
};

export class TaskMapper {
  constructor() {
    this._mapping = { ...TASK_TO_PROFILE };
  }

  mapTaskType(taskType) {
    return this._mapping[taskType] || 'coding';
  }

  getAllMappings() {
    return { ...this._mapping };
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
