import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const schema = JSON.parse(readFileSync(join(root, 'schemas', 'agent.schema.json'), 'utf-8'));
const ajv = new Ajv();
const validate = ajv.compile(schema);

const agentDir = join(root, 'agents');
const files = readdirSync(agentDir).filter(f => f.endsWith('.md'));

let errors = 0;

for (const file of files) {
  const content = readFileSync(join(agentDir, file), 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    console.error(`FAIL  ${file}: no frontmatter found`);
    errors++;
    continue;
  }
  const frontmatter = yaml.load(match[1]);
  const valid = validate(frontmatter);
  if (!valid) {
    console.error(`FAIL  ${file}:`);
    for (const err of validate.errors) {
      console.error(`  ${err.instancePath} ${err.message}`);
    }
    errors++;
  } else {
    console.log(`OK    ${file}`);
  }
}

if (errors) {
  console.error(`\n${errors} agent(s) failed validation`);
  process.exit(1);
} else {
  console.log(`\n${files.length} agent(s) valid`);
}
