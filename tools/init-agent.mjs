import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const USAGE = `Usage: node tools/init-agent.mjs <agent-name>

Creates a new agent file at agents/<agent-name>.md from the template.
Agent names should be kebab-case (e.g. async-patterns).
`;

function main() {
  const name = process.argv[2];
  if (!name || name === '--help' || name === '-h') {
    console.log(USAGE);
    process.exit(name ? 0 : 1);
  }

  const template = readFileSync(join(root, 'templates', 'agent.md'), 'utf-8');
  const title = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
  const content = template
    .replace(/__NAME__/g, name)
    .replace(/__TITLE__/g, title);

  const outPath = join(root, 'agents', `${name}.md`);
  writeFileSync(outPath, content, 'utf-8');
  console.log(`Created ${outPath}`);
}

main();
