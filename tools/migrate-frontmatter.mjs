import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const agentDir = join(root, 'agents');
const files = readdirSync(agentDir).filter(f => f.endsWith('.md'));

function toTitle(id) {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

let updated = 0;
let skipped = 0;

for (const file of files) {
  const content = readFileSync(join(agentDir, file), 'utf-8');
  const id = file.replace(/\.md$/, '');
  const name = toTitle(id);

  if (content.includes('\nid:')) {
    skipped++;
    continue;
  }

  const newContent = content.replace(/^---\n/, `---\nid: ${id}\nname: ${name}\n`);
  writeFileSync(join(agentDir, file), newContent, 'utf-8');
  updated++;
}

console.log(`Updated ${updated} agents (skipped ${skipped} — already have id)`);
