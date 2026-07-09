/**
 * StaffForge Registry CLI — start a registry server or sync from a remote.
 *
 * Usage:
 *   staffforge registry start [--port 3737] [--host 127.0.0.1] [--api-key <key>]
 *   staffforge registry sync <url> [--agents-dir <dir>] [--pipelines-dir <dir>]
 */

import { createRegistryServer } from '@staffforge/core';
import { createRegistryClient } from '@staffforge/core';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--port') opts.port = parseInt(args[++i], 10);
    else if (a === '--host') opts.host = args[++i];
    else if (a === '--api-key') opts.apiKey = args[++i];
    else if (a === '--agents-dir') opts.agentsDir = args[++i];
    else if (a === '--pipelines-dir') opts.pipelinesDir = args[++i];
    else if (a === '--yes' || a === '-y') opts.yes = true;
    else if (!opts.command) {
      opts.command = a;
      opts._rest = args.slice(i + 1);
      break;
    }
  }
  return opts;
}

export async function startServer(options = {}) {
  const server = createRegistryServer({
    port: options.port || 3737,
    host: options.host || '127.0.0.1',
    apiKey: options.apiKey || null,
  });

  await server.start();
  console.log(`Registry server running at http://${options.host || '127.0.0.1'}:${options.port || 3737}`);

  // Keep alive
  return new Promise(() => {});
}

export async function syncFrom(url, options = {}) {
  const agentsDir = options.agentsDir || join(process.cwd(), 'agents');
  const pipelinesDir = options.pipelinesDir || join(process.cwd(), 'pipelines');

  if (!existsSync(agentsDir)) mkdirSync(agentsDir, { recursive: true });
  if (!existsSync(pipelinesDir)) mkdirSync(pipelinesDir, { recursive: true });

  const client = createRegistryClient({
    registryUrl: url,
    apiKey: options.apiKey || null,
  });

  // Check health
  const health = await client.checkHealth();
  if (!health || health.status !== 'ok') {
    throw new Error(`Cannot connect to registry at ${url}`);
  }
  console.log(`Connected to registry at ${url} (${health.timestamp})`);

  // Sync
  const result = await client.sync({ agentsDir, pipelinesDir });

  console.log(`\nSync complete:`);
  console.log(
    `  Agents: ${result.agentsDownloaded} downloaded, ${result.agentsSkipped} skipped, ${result.agentsFailed} failed`,
  );
  console.log(
    `  Pipelines: ${result.pipelinesDownloaded} downloaded, ${result.pipelinesSkipped} skipped, ${result.pipelinesFailed} failed`,
  );

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    for (const err of result.errors.slice(0, 5)) {
      console.log(`  - ${err}`);
    }
  }

  return result;
}

export async function main(args) {
  const opts = parseArgs(args || process.argv.slice(2));

  if (!opts.command) {
    console.log(`Usage:
  registry start [--port <port>] [--host <host>] [--api-key <key>]
  registry sync <url> [--agents-dir <dir>] [--pipelines-dir <dir>]`);
    process.exit(1);
  }

  switch (opts.command) {
    case 'start':
      await startServer(opts);
      break;

    case 'sync': {
      const url = opts._rest?.[0];
      if (!url) {
        console.error('Usage: registry sync <url>');
        process.exit(1);
      }
      await syncFrom(url, opts);
      break;
    }

    default:
      console.error(`Unknown registry command: ${opts.command}`);
      process.exit(1);
  }
}

export default { startServer, syncFrom, main };
