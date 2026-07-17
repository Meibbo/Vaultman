#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildIndex, CACHE_PATH } from "./lib/frontmatter.mjs";
import { buildRetrievalIndex, RETRIEVAL_CACHE_PATH } from "./lib/retrieval.mjs";

interface DocEntry {
  [key: string]: unknown;
}

interface CachedEmbedding {
  contentHash?: string;
  vector?: number[];
  embedHash?: string;
  embedModel?: string;
}

interface CachedRetrievalIndex {
  embedModel?: string;
  embedDims?: number;
  docs?: CachedEmbedding[];
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

const retrievalPath = path.join(root, RETRIEVAL_CACHE_PATH);
const cachedRetrieval = readCachedRetrievalIndex(retrievalPath);
const embeddingsByContentHash = new Map<string, CachedEmbedding>();
for (const doc of cachedRetrieval?.docs ?? []) {
  if (
    typeof doc.contentHash === "string" &&
    doc.embedHash === doc.contentHash &&
    Array.isArray(doc.vector)
  ) {
    embeddingsByContentHash.set(doc.contentHash, doc);
  }
}

const retrievalIndex = buildRetrievalIndex(root) as {
  generated_at: string;
  embedModel?: string;
  embedDims?: number;
  docs: Array<DocEntry & CachedEmbedding>;
};
let reusedEmbeddings = 0;
for (const doc of retrievalIndex.docs) {
  const cached = typeof doc.contentHash === "string" ? embeddingsByContentHash.get(doc.contentHash) : undefined;
  if (!cached) continue;
  doc.vector = cached.vector;
  doc.embedHash = cached.embedHash;
  doc.embedModel = cached.embedModel;
  reusedEmbeddings += 1;
}
if (reusedEmbeddings > 0) {
  retrievalIndex.embedModel = cachedRetrieval?.embedModel;
  retrievalIndex.embedDims = cachedRetrieval?.embedDims;
}

fs.mkdirSync(path.dirname(retrievalPath), { recursive: true });
fs.writeFileSync(retrievalPath, `${JSON.stringify(retrievalIndex, null, 2)}\n`);
console.log(
  `retrieval-indexed ${retrievalIndex.docs.length} docs (${reusedEmbeddings} embeddings reused) -> ${RETRIEVAL_CACHE_PATH}`,
);

function readCachedRetrievalIndex(retrievalPath: string): CachedRetrievalIndex | undefined {
  if (!fs.existsSync(retrievalPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(retrievalPath, "utf8")) as CachedRetrievalIndex;
  } catch {
    return undefined;
  }
}
