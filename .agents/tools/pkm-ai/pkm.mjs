#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commands = {
  health: 'check-doc-health.ts',
  index: 'index-docs.ts',
  query: 'query-docs.ts',
  metric: 'record-metric.mjs',
  archive: 'archive-active-doc.mjs',
  update: 'update-indexes.mjs',
  shard: 'shard-index.mjs',
  'code-index': 'code-index.mjs',
  room: 'agent-room.ts',
  'traverse-graph': 'traverse-graph.mjs',
};

const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
  console.log('Usage: node pkm.mjs <command> [args]');
  console.log('\nAvailable commands:');
  Object.keys(commands).forEach(cmd => console.log(`  - ${cmd}`));
  process.exit(1);
}

const scriptPath = path.join(__dirname, commands[command]);

const child = spawn('node', [scriptPath, ...args], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
