let _cachedModels = null;

async function discoverOpenCodeModels() {
  if (_cachedModels) return _cachedModels;

  const models = [];

  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const yaml = await import('js-yaml');

    const configDir = path.join(os.homedir(), '.config', 'opencode');
    const customModelsPath = path.join(configDir, 'custom_models.yaml');

    if (fs.existsSync(customModelsPath)) {
      const content = fs.readFileSync(customModelsPath, 'utf-8');
      const data = yaml.load(content);
      if (data && data.models) {
        models.push(...data.models);
      }
    }
  } catch {
    // config file not found or parse error — use defaults
  }

  if (models.length === 0) {
    models.push(
      {
        id: 'deepseek-v4-flash-free',
        provider: 'opencode',
        family: 'deepseek',
        name: 'DeepSeek V4 Flash Free',
        context_window: 131072,
        supports_tools: true,
        supports_reasoning: true,
        supports_json: true,
        supports_streaming: true,
        cost_per_1k_input: 0,
        cost_per_1k_output: 0,
        priority: 90,
        strengths: ['coding', 'architecture', 'reasoning', 'planning'],
        weaknesses: ['creative-writing', 'long-form'],
        metadata: { source: 'opencode-free' },
      },
      {
        id: 'miMo',
        provider: 'opencode',
        family: 'miMo',
        name: 'MiMo',
        context_window: 32768,
        supports_tools: true,
        supports_reasoning: true,
        supports_json: true,
        supports_streaming: true,
        cost_per_1k_input: 0,
        cost_per_1k_output: 0,
        priority: 75,
        strengths: ['coding', 'documentation', 'cost-efficient'],
        weaknesses: ['complex-reasoning', 'architecture'],
        metadata: { source: 'opencode-free' },
      },
      {
        id: 'north-mini-code',
        provider: 'opencode',
        family: 'north',
        name: 'North Mini Code',
        context_window: 32768,
        supports_tools: true,
        supports_reasoning: false,
        supports_json: true,
        supports_streaming: true,
        cost_per_1k_input: 0,
        cost_per_1k_output: 0,
        priority: 60,
        strengths: ['coding', 'fast', 'cost-efficient', 'review'],
        weaknesses: ['no-reasoning', 'architecture'],
        metadata: { source: 'opencode-free' },
      },
      {
        id: 'big-pickle',
        provider: 'opencode',
        family: 'big-pickle',
        name: 'Big Pickle',
        context_window: 32768,
        supports_tools: true,
        supports_reasoning: false,
        supports_json: true,
        supports_streaming: true,
        cost_per_1k_input: 0,
        cost_per_1k_output: 0,
        priority: 50,
        strengths: ['documentation', 'analysis', 'cost-efficient'],
        weaknesses: ['no-reasoning', 'coding'],
        metadata: { source: 'opencode-free' },
      },
    );
  }

  _cachedModels = models;
  return models;
}

export default discoverOpenCodeModels;
