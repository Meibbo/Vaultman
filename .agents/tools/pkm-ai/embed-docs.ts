#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { embedPendingDocs, loadRetrievalIndex, RETRIEVAL_CACHE_PATH } from "./lib/retrieval.mjs";
import { TransformersEmbeddingProvider } from "./retrieval/transformers-provider.mjs";

interface IndexedDoc {
  path: string;
  title?: string;
  contentHash?: string;
  vector?: number[];
  embedHash?: string;
  embedModel?: string;
  [key: string]: unknown;
}

interface RetrievalIndex {
  generated_at?: string;
  embedModel?: string;
  embedDims?: number;
  docs: IndexedDoc[];
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/embed-docs.ts [--limit N]

Embeds .agents/docs into the retrieval index (.agents/cache/retrieval-index.json) with the local
transformers.js all-MiniLM-L6-v2 provider (384-dim). Embed-on-change: a doc is (re)embedded only when
its content hash differs from the stored embedHash, so re-runs are incremental. The model downloads
once (then offline). Run after index-docs (which writes the termFreq/lifecycle index).

  --limit N   embed at most N changed docs this run (resumable for large corpora).`);
  process.exit(0);
}

const limit = parseLimit(process.argv.slice(2));
const root = process.cwd();
const index = loadRetrievalIndex(root) as RetrievalIndex;
const provider = new TransformersEmbeddingProvider();

const { embedded, skipped } = await embedPendingDocs(root, index, provider, { limit });

const outputPath = path.join(root, RETRIEVAL_CACHE_PATH);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`embedded ${embedded}, skipped ${skipped} unchanged -> ${RETRIEVAL_CACHE_PATH} (model ${provider.model})`);

function parseLimit(argv: string[]): number | undefined {
  const flag = argv.indexOf("--limit");
  if (flag === -1) return undefined;
  const value = Number.parseInt(argv[flag + 1] ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}
