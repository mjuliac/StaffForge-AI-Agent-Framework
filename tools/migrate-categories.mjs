import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

const CORE = new Set([
  'orchestrator', 'architect', 'git', 'security',
  'testing', 'performance', 'documentation', 'code-review',
]);

const DOMAIN = new Set([
  'database', 'data-science', 'machine-learning', 'deployment',
  'networking', 'ui-ux', 'i18n', 'a11y', 'microservices',
  'clean-architecture', 'ddd', 'cqrs', 'api-design', 'sre',
  'monitoring', 'logging', 'build', 'release', 'plan',
  'requirements', 'impact-analysis', 'knowledge', 'integration',
]);

const UTILITY = new Set([
  'refactor', 'debugging', 'dependency-audit', 'secrets',
  'pentest', 'linux', 'windows', 'macos', 'bash',
  'powershell', 'e2e',
]);

function classify(name) {
  if (CORE.has(name)) return 'core';
  if (DOMAIN.has(name)) return 'domain';
  if (UTILITY.has(name)) return 'utility';
  return 'technology';
}

const CATEGORIES = ['core', 'technology', 'domain', 'platform', 'utility'];

function insertCategoryAfterMode(fm, category) {
  const keys = Object.keys(fm);
  const modeIdx = keys.indexOf('mode');
  const result = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = fm[key];
    if (key === 'mode') {
      result.category = category;
    }
  }
  return result;
}

let updated = 0;
let skipped = 0;
let errors = [];

for (const file of fs.readdirSync(AGENTS_DIR)) {
  if (!file.endsWith('.md')) continue;

  const filePath = path.join(AGENTS_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    errors.push(`${file}: no frontmatter`);
    continue;
  }

  const raw = fmMatch[1];
  let fm;
  try {
    fm = yaml.load(raw);
  } catch (err) {
    errors.push(`${file}: yaml parse error - ${err.message}`);
    continue;
  }

  const name = file.replace(/\.md$/, '');

  if (fm.category && CATEGORIES.includes(fm.category)) {
    skipped++;
    continue;
  }

  const category = classify(name);
  fm = insertCategoryAfterMode(fm, category);

  const yamlStr = yaml.dump(fm, {
    indent: 2,
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: false,
    noRefs: true,
    sortKeys: false,
  });

  const newFrontmatter = `---\n${yamlStr}---\n`;
  const body = content.slice(fmMatch[0].length);
  const newContent = newFrontmatter + body;

  fs.writeFileSync(filePath, newContent, 'utf-8');
  updated++;
}

console.log(`Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors.length}`);
if (errors.length > 0) {
  for (const e of errors) console.log(`  - ${e}`);
}
