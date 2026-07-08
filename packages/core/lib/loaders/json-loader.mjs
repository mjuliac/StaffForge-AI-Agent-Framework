import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

export class JsonLoader {
  async load(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  canLoad(filePath) {
    const ext = extname(filePath);
    return ext === '.json';
  }
}

export default JsonLoader;
