#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildIndex, CACHE_PATH } from "./lib/frontmatter.mjs";
import { buildRetrievalIndex, countPendingEmbeddings, embedPendingDocs, RETRIEVAL_CACHE_PATH } from "./lib/retrieval.mjs";

interface DocEntry {
  [key: string]: unknown;
}

interface IndexFailure {
  code: string;
  path: string;
  detail: string;
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
  console.log(`Usage: node .agents/tools/pkm-ai/index-docs.ts [--no-embed] [--embed-limit N]

Builds .agents/cache/search-index.json from .agents/docs Markdown frontmatter, then the
retrieval index. Changed docs are re-embedded with the local transformers.js provider so
semantic coverage stays current (2026-07-28 audit F5); the model loads only when there is
something to embed, so a no-op rebuild pays no embedding cost.

  --no-embed        skip embedding (fast; leaves changed docs without a vector).
  --embed-limit N   embed at most N changed docs this run (resumable for large deltas).`);
  process.exit(0);
}

const noEmbed = process.argv.includes("--no-embed");
const embedLimit = parseEmbedLimit(process.argv.slice(2));
const root = process.cwd();
// A doc with unparseable frontmatter is skipped by both builders and reported here, once per path
// (both passes hit the same file). Before this the exception escaped and the run wrote no index at
// all, so one bad doc blanked retrieval for every agent (2026-07-29).
const skipped = new Map<string, IndexFailure>();
const onFailure = (failure: IndexFailure) => {
  if (!skipped.has(failure.path)) skipped.set(failure.path, failure);
};

const entries: DocEntry[] = buildIndex(root, { excludeArchiveRaw: false, excludeTemplates: true, onFailure });
const outputPath = path.join(root, CACHE_PATH);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ generated_at: new Date().toISOString(), entries }, null, 2)}\n`,
);
console.log(`indexed ${entries.length} docs -> ${CACHE_PATH}${skipped.size > 0 ? ` (${skipped.size} skipped)` : ""}`);

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

const retrievalIndex = buildRetrievalIndex(root, { onFailure }) as {
  generated_at: string;
  embedModel?: string;
  embedDims?: number;
  docs: Array<DocEntry & CachedEmbedding>;
};

// Report before the (possibly long) embedding pass, in the check-doc-health failure format so the
// dev sees which file to fix and why instead of a stack trace. Exit stays 0: the index is complete
// for every doc that parses, and check-doc-health is the gate that fails the build.
if (skipped.size > 0) {
  console.error(`doc-index: skipped ${skipped.size} doc(s) with unparseable frontmatter`);
  for (const failure of skipped.values()) {
    console.error(`${failure.code}\t${failure.path}\t${failure.detail}`);
  }
}

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

// Embed docs whose content changed (new or edited since the last embed) so semantic coverage keeps
// up with the corpus. The transformers model is loaded lazily — only when there is a delta — so a
// no-op rebuild stays fast. --no-embed opts out entirely (F5: the dev-authorized runtime cost).
let embeddedNow = 0;
const pending = countPendingEmbeddings(retrievalIndex);
if (!noEmbed && pending > 0) {
  const { TransformersEmbeddingProvider } = await import("./retrieval/transformers-provider.mjs");
  const provider = new TransformersEmbeddingProvider();
  const tally = await embedPendingDocs(root, retrievalIndex, provider, { limit: embedLimit });
  embeddedNow = tally.embedded;
}

fs.mkdirSync(path.dirname(retrievalPath), { recursive: true });
fs.writeFileSync(retrievalPath, `${JSON.stringify(retrievalIndex, null, 2)}\n`);
const embedNote = noEmbed
  ? `, ${pending} unembedded (--no-embed)`
  : embeddedNow > 0
    ? `, ${embeddedNow} embedded`
    : "";
console.log(
  `retrieval-indexed ${retrievalIndex.docs.length} docs (${reusedEmbeddings} embeddings reused${embedNote}) -> ${RETRIEVAL_CACHE_PATH}`,
);

function parseEmbedLimit(argv: string[]): number | undefined {
  const flag = argv.indexOf("--embed-limit");
  if (flag === -1) return undefined;
  const value = Number.parseInt(argv[flag + 1] ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function readCachedRetrievalIndex(retrievalPath: string): CachedRetrievalIndex | undefined {
  if (!fs.existsSync(retrievalPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(retrievalPath, "utf8")) as CachedRetrievalIndex;
  } catch {
    return undefined;
  }
}
