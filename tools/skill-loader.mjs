/**
 * Skill loader — reads skill definitions from the skills/ directory.
 * Follows the same pattern as AgentRegistry but simpler.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function toTitle(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseSkill(file, content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${file}: no valid frontmatter`);
  }

  const frontmatter = yaml.load(match[1]) || {};
  const body = (match[2] || '').trim();

  const name = frontmatter.name || file.replace(/\.md$/, '');
  const title = toTitle(name);

  return {
    name,
    title,
    file,
    frontmatter,
    body,
  };
}

export class SkillRegistry {
  constructor(skillDir = null) {
    this._skillDir = skillDir || join(root, 'skills');
    this._skills = null;
  }

  load() {
    if (this._skills) return this;
    const files = readdirSync(this._skillDir).filter((f) => f.endsWith('.md'));
    this._skills = [];
    for (const file of files.sort()) {
      const content = readFileSync(join(this._skillDir, file), 'utf-8');
      try {
        this._skills.push(parseSkill(file, content));
      } catch (err) {
        console.warn(`skill-loader: ${file}: ${err.message}`);
      }
    }
    return this;
  }

  all() {
    this.load();
    return this._skills;
  }

  count() {
    this.load();
    return this._skills.length;
  }

  findByName(name) {
    this.load();
    return this._skills.find((s) => s.name === name) || null;
  }
}

let _defaultInstance = null;
export function getSkillRegistry() {
  if (!_defaultInstance) {
    _defaultInstance = new SkillRegistry();
  }
  return _defaultInstance;
}

export default getSkillRegistry;
