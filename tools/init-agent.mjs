import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const USAGE = `Usage: node tools/init-agent.mjs <agent-name>

Creates a new agent file at agents/<agent-name>.md from the template.
Agent names should be kebab-case (e.g. async-patterns).
`;

const CATEGORIES = ['core', 'technology', 'domain', 'platform', 'utility'];

function ask(query, defaultValue = '') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

function toTitle(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function main() {
  const name = process.argv[2];
  if (!name || name === '--help' || name === '-h') {
    console.log(USAGE);
    process.exit(name ? 0 : 1);
  }

  console.log(`\nCreating agent "${name}" — fill in the details:\n`);

  const title = await ask('Title', toTitle(name));
  const description = await ask('Description', `${name} specialist.`);
  const mode = await ask('Mode (primary/subagent/all)', 'subagent');
  const category = await ask(`Category (${CATEGORIES.join('/')})`, 'utility');
  const priority = await ask('Priority (0–100)', '50');
  const keywordsRaw = await ask('Keywords (comma-separated, optional)', '');
  const keywords = keywordsRaw
    ? keywordsRaw
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  const template = readFileSync(join(root, 'templates', 'agent.md'), 'utf-8');
  let content = template.replace(/__NAME__/g, name).replace(/__TITLE__/g, title);

  // Customize frontmatter values
  content = content
    .replace(/^description: .*/m, `description: ${description}`)
    .replace(/^mode: .*/m, `mode: ${mode}`)
    .replace(/^category: .*/m, `category: ${category}`)
    .replace(/^priority: .*/m, `priority: ${priority}`);

  if (keywords.length) {
    const keywordsYaml = keywords.map((k) => `  - ${k}`).join('\n');
    content = content.replace(/^keywords:.*\n?/m, '');
    content = content.replace(/^---\n/m, `---\nkeywords:\n${keywordsYaml}\n`);
  }

  const outPath = join(root, 'agents', `${name}.md`);
  writeFileSync(outPath, content, 'utf-8');
  console.log(`\nCreated ${outPath}`);
}

main();
