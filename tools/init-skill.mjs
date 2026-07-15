#!/usr/bin/env node

/**
 * init-skill.mjs — Scaffolds a new skill definition.
 * Usage: node tools/init-skill.mjs <skill-name>
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const USAGE = `Usage: node tools/init-skill.mjs <skill-name>

Creates a new skill file at skills/<skill-name>.md from the template.
Skill names should be kebab-case (e.g. database-review).
`;

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

  const outPath = join(root, 'skills', `${name}.md`);
  if (existsSync(outPath)) {
    console.error(`ERROR: skill already exists at ${outPath}`);
    process.exit(1);
  }

  console.log(`\nCreating skill "${name}" — fill in the details:\n`);

  const title = await ask('Title', toTitle(name));
  const description = await ask('Description', `${name} specialist skill.`);
  const keywordsRaw = await ask('Keywords (comma-separated, optional)', '');
  const keywords = keywordsRaw
    ? keywordsRaw
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  const template = readFileSync(join(root, 'templates', 'skill.md'), 'utf-8');
  let content = template
    .replace(/__NAME__/g, name)
    .replace(/__TITLE__/g, title)
    .replace(/__DESCRIPTION__/g, description)
    .replace(/__DOMAIN__/g, title);

  if (keywords.length) {
    const keywordsYaml = keywords.map((k) => `  - ${k}`).join('\n');
    content = content.replace(/^keywords: \[\]/m, `keywords:\n${keywordsYaml}`);
  }

  writeFileSync(outPath, content, 'utf-8');
  console.log(`\nCreated ${outPath}`);
  console.log('Next steps:');
  console.log('  1. Edit the file to add detailed skill instructions');
  console.log('  2. Run `npm run validate` to ensure the skill definition is valid');
  console.log('  3. Run `npm run export` to generate platform-specific output');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
