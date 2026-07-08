import { getPipelineExecutor } from './lib/pipeline-executor.mjs';

const USAGE = `
Usage: node tools/run-pipeline.mjs --task <type> --prompt <text> [options]

Options:
  --task <type>      Task type (feature, bugfix, refactor, security, deployment, hotfix)
  --prompt <text>    User prompt for technology and profile detection
  --model <id>       Force a specific model (skip ModelSelector)
  --provider <name>  Filter models by provider
  --no-model         Skip model selection
  --dry-run          Show pipeline plan without executing
  --telemetry        Enable telemetry recording
  --json             Output as JSON
  --help, -h         Show this help

Examples:
  node tools/run-pipeline.mjs --task feature --prompt "Add Flask REST API" --dry-run
  node tools/run-pipeline.mjs --task feature --prompt "Add auth" --json
  node tools/run-pipeline.mjs --task security --prompt "Audit tokens" --dry-run --telemetry
`;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help': case '-h': console.log(USAGE); process.exit(0);
      case '--task': opts.task = args[++i]; break;
      case '--prompt': opts.prompt = args[++i]; break;
      case '--model': opts.model = args[++i]; break;
      case '--provider': opts.provider = args[++i]; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--telemetry': opts.telemetry = true; break;
      case '--json': opts.json = true; break;
      case '--no-model': opts.noModel = true; break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        console.log(USAGE);
        process.exit(1);
    }
  }

  if (!opts.task) {
    console.error('ERROR: --task is required');
    console.log(USAGE);
    process.exit(1);
  }

  return opts;
}

function main() {
  const opts = parseArgs();
  const taskType = opts.task;
  const prompt = opts.prompt || '';

  const executor = getPipelineExecutor();
  const result = executor.execute(taskType, prompt, {
    selectModel: !opts.noModel,
    provider: opts.provider || null,
    enableTelemetry: opts.telemetry || false,
  });

  if (opts.model) {
    result.model = { id: opts.model, provider: 'manual' };
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\nTask:     ${result.taskType}`);
  console.log(`Profile:  ${result.modelProfile || 'none'}`);
  console.log(`Pipeline: ${result.description || 'none'}`);

  if (result.model) {
    console.log(`Model:    ${result.model.id} (${result.model.provider})`);
  }

  if (result.summary.length > 0) {
    console.log(`\nExecution Plan (${result.summary.length} level(s)):`);
    for (const line of result.summary) {
      console.log(`  ${line}`);
    }
  }

  if (result.telemetry) {
    console.log(`\nTelemetry: run ${result.telemetry.runId}`);
  }

  console.log(`\nAgents: ${result.agents.length}`);
  console.log('');
}

main();
