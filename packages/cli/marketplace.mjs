/**
 * StaffForge Marketplace CLI — search and install community pipelines.
 *
 * Uses MarketplaceLoader / RemoteLoader from @staffforge/core to fetch
 * pipeline definitions from a public catalog URL.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { MarketplaceLoader } from '@staffforge/core';

const DEFAULT_CATALOG = 'https://staffforge.dev/marketplace/catalog.json';

/**
 * Search available pipelines in the catalog.
 * @param {string} [query] - optional text filter
 * @param {string} [catalogUrl]
 * @returns {Promise<object[]>}
 */
export async function search(query = '', catalogUrl = DEFAULT_CATALOG) {
  const loader = new MarketplaceLoader({ registryUrl: catalogUrl });
  return loader.search(query);
}

/**
 * Install a pipeline from the catalog into the local pipelines directory.
 * @param {string} id - pipeline id
 * @param {object} [opts]
 * @param {string} [opts.out] - output directory for pipelines
 * @param {string} [opts.catalogUrl]
 */
export async function install(id, opts = {}) {
  const catalogUrl = opts.catalogUrl || DEFAULT_CATALOG;
  const loader = new MarketplaceLoader(catalogUrl);
  const def = await loader.load(id);
  if (!def) {
    throw new Error(`Pipeline "${id}" not found in marketplace`);
  }
  const outDir = opts.out || join(process.cwd(), 'pipelines');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${id}.yaml`);
  writeFileSync(outPath, def.raw || def.content || def, 'utf-8');
  return outPath;
}

export default { search, install };
