#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildIndex, CACHE_PATH } from "./lib/frontmatter.mjs";

interface DocEntry {
  [key: string]: unknown;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/index-docs.ts

Builds .agents/cache/search-index.json from .agents/docs Markdown frontmatter.`);
  process.exit(0);
}

const root = process.cwd();
const entries: DocEntry[] = buildIndex(root, { excludeArchiveRaw: false, excludeTemplates: true });
const outputPath = path.join(root, CACHE_PATH);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ generated_at: new Date().toISOString(), entries }, null, 2)}\n`,
);
console.log(`indexed ${entries.length} docs -> ${CACHE_PATH}`);
