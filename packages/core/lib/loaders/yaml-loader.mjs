import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

export class YamlLoader {
  async load(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    return this.parse(content);
  }

  parse(content) {
    const lines = content.split('\n');
    const result = { levels: [] };
    let currentLevel = null;

    for (const line of lines) {
      const trimmed = line.replace(/^#.*$/, '').trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('name:')) {
        result.name = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('description:')) {
        result.description = trimmed.split(':').slice(1).join(':').trim();
      } else if (trimmed.startsWith('version:')) {
        result.version = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('- name:') || trimmed.match(/^- name:/)) {
        currentLevel = { name: trimmed.split(':')[1].trim(), agents: [], parallel: false };
        result.levels.push(currentLevel);
      } else if (trimmed.startsWith('agents:') && currentLevel) {
      } else if (trimmed.startsWith('parallel:') && currentLevel) {
        currentLevel.parallel = trimmed.split(':')[1].trim() === 'true';
      } else if (trimmed.startsWith('- ') && currentLevel && !trimmed.includes(':')) {
        currentLevel.agents.push(trimmed.slice(2).trim());
      }
    }

    return result;
  }

  canLoad(filePath) {
    const ext = extname(filePath);
    return ext === '.yaml' || ext === '.yml';
  }
}

export default YamlLoader;
