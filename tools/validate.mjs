import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import { getAgentRegistry } from '@staffforge/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const ajv = new Ajv();

let totalErrors = 0;

// Validate agents
const agentSchema = JSON.parse(readFileSync(join(root, 'schemas', 'agent.schema.json'), 'utf-8'));
const validateAgent = ajv.compile(agentSchema);

const registry = getAgentRegistry();
const agents = registry.all();

for (const agent of agents) {
  const valid = validateAgent(agent.frontmatter);
  if (!valid) {
    console.error(`FAIL  agent: ${agent.file}:`);
    for (const err of validateAgent.errors) {
      console.error(`  ${err.instancePath} ${err.message}`);
    }
    totalErrors++;
    continue;
  }

  const fm = agent.frontmatter;
  const tools = fm.tools || {};
  const isFull = tools.write === true && tools.bash === true && tools.edit === true;

  // Governance rule: only the orchestrator may hold full tool permissions.
  // The orchestrator is the sole agent allowed to write, run shell, and edit freely.
  if (isFull && agent.id !== 'orchestrator') {
    console.error(`FAIL  agent: ${agent.file}:`);
    console.error(`  only 'orchestrator' may have write+bash+edit all true (got full permissions for '${agent.id}')`);
    totalErrors++;
    continue;
  }

  // Governance rule: every agent must declare its governance constraints in the
  // body (reference the orchestrator / escalation / no direct user contact).
  const body = (agent.body || '').toLowerCase();
  const mentionsGovernance = body.includes('orchestrator') || body.includes('escalate') || body.includes('never talk');
  if (!mentionsGovernance) {
    console.error(`FAIL  agent: ${agent.file}:`);
    console.error(`  agent body must reference the orchestrator / escalation / 'never talk to the user' constraints`);
    totalErrors++;
    continue;
  }

  console.log(`OK    ${agent.file}`);
}

// Validate models
const modelSchema = JSON.parse(readFileSync(join(root, 'schemas', 'model.schema.json'), 'utf-8'));
const validateModel = ajv.compile(modelSchema);
const modelFiles = readdirSync(join(root, 'models')).filter((f) => f.endsWith('.yaml') && f !== 'profiles.yaml');

for (const file of modelFiles) {
  const raw = readFileSync(join(root, 'models', file), 'utf-8');
  const model = yaml.load(raw);
  const valid = validateModel(model);
  if (!valid) {
    console.error(`FAIL  model: ${file}:`);
    for (const err of validateModel.errors) {
      console.error(`  ${err.instancePath} ${err.message}`);
    }
    totalErrors++;
  } else {
    console.log(`OK    models/${file}`);
  }
}

if (totalErrors) {
  console.error(`\n${totalErrors} file(s) failed validation`);
  process.exit(1);
} else {
  console.log(`\n${agents.length} agent(s), ${modelFiles.length} model(s) valid`);
}
