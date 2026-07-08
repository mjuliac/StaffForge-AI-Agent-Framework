import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { getAgentRegistry } from './lib/agent-registry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const schema = JSON.parse(readFileSync(join(root, 'schemas', 'agent.schema.json'), 'utf-8'));
const ajv = new Ajv();
const validate = ajv.compile(schema);

const registry = getAgentRegistry();
const agents = registry.all();

let errors = 0;

for (const agent of agents) {
  const valid = validate(agent.frontmatter);
  if (!valid) {
    console.error(`FAIL  ${agent.file}:`);
    for (const err of validate.errors) {
      console.error(`  ${err.instancePath} ${err.message}`);
    }
    errors++;
  } else {
    console.log(`OK    ${agent.file}`);
  }
}

if (errors) {
  console.error(`\n${errors} agent(s) failed validation`);
  process.exit(1);
} else {
  console.log(`\n${agents.length} agent(s) valid`);
}
