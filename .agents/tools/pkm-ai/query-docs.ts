#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildIndex, CACHE_PATH, filterEntries, formatRows, parseArgs } from "./lib/frontmatter.mjs";
import { hasGlossaryTerm } from "./lib/glossary.mjs";
import { recordMetric } from "./lib/metrics.mjs";
import { bm25Search, hybridSearch, loadRetrievalIndex } from "./lib/retrieval.mjs";
import { HashEmbeddingProvider } from "./retrieval/embedding-provider.mjs";
import { TransformersEmbeddingProvider } from "./retrieval/transformers-provider.mjs";
import { OramaVectorStore } from "./retrieval/orama-store.mjs";
import { semanticSearch } from "./retrieval/semantic.mjs";

interface DocEntry {
  [key: string]: unknown;
}

interface RankHit {
  path: string;
  title: string;
  lifecycle: string;
  score: number;
  rawScore?: number;
  fusedScore?: number;
}

interface RankArgs {
  terms: string[];
  limit: number | undefined;
  json: boolean;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/query-docs.ts [filters] [search terms]
       node .agents/tools/pkm-ai/query-docs.ts --rank [--limit N] [--json] <terms...>

Filters:
  --id VM-0001
  --type feature
  --status planned
  --initiative pkm-ai
  --tag agent/item
  --glossary term
  --json

Ranking:
  --rank        BM25 over .agents/cache/retrieval-index.json (built in-memory if
                absent), lifecycle-weighted (active > deferred > … > archived).
  --hybrid      BM25 + local hash embedding fused via Reciprocal Rank Fusion,
                lifecycle-weighted (zero-dep stub embedding).
  --semantic    BM25 + real transformers.js MiniLM embeddings (Orama vector
                store) fused via RRF, lifecycle-weighted. Requires embed-docs
                first (run: node .agents/tools/pkm-ai/embed-docs.ts).
  --limit N     cap ranked results (default: all matches).`);
  process.exit(0);
}

const root = process.cwd();

if (process.argv.includes("--semantic")) {
  const rankArgs = parseRankArgs(process.argv.slice(2));
  const index = loadRetrievalIndex(root);
  const provider = new TransformersEmbeddingProvider();
  const store = new OramaVectorStore({ dims: provider.dims });
  const hits: RankHit[] = await semanticSearch(index, rankArgs.terms, { provider, store, limit: rankArgs.limit });
  if (hits.length === 0) {
    console.error("query-docs --semantic: no embeddings found. Run: node .agents/tools/pkm-ai/embed-docs.ts");
    process.exit(2);
  }
  if (rankArgs.json) {
    console.log(JSON.stringify(hits, null, 2));
  } else {
    console.log(formatRankHits(hits));
  }
  process.exit(0);
}

if (process.argv.includes("--hybrid")) {
  const rankArgs = parseRankArgs(process.argv.slice(2));
  const index = loadRetrievalIndex(root);
  const provider = new HashEmbeddingProvider();
  const hits: RankHit[] = hybridSearch(index, rankArgs.terms, { provider, limit: rankArgs.limit });
  if (rankArgs.json) {
    console.log(JSON.stringify(hits, null, 2));
  } else {
    console.log(formatRankHits(hits));
  }
  process.exit(0);
}

if (process.argv.includes("--rank")) {
  const rankArgs = parseRankArgs(process.argv.slice(2));
  const index = loadRetrievalIndex(root);
  const hits: RankHit[] = bm25Search(index, rankArgs.terms, { limit: rankArgs.limit });
  if (rankArgs.json) {
    console.log(JSON.stringify(hits, null, 2));
  } else {
    console.log(formatRankHits(hits));
  }
  process.exit(0);
}
const glossaryIndex = process.argv.indexOf("--glossary");
if (glossaryIndex !== -1) {
  const term = process.argv[glossaryIndex + 1] ?? "";
  recordMetric(root, "glossary_checked", { path: ".agents/docs/architecture/glossary.md", detail: term });
  if (hasGlossaryTerm(root, term)) {
    console.log(`${term} está en el glosario.`);
    process.exit(0);
  }

  recordMetric(root, "glossary_miss", { path: ".agents/docs/architecture/glossary.md", detail: term });
  console.log(`${term} no está en el glosario. Añádelo o márcalo como external/test term.`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const cachePath = path.join(root, CACHE_PATH);
const entries: DocEntry[] = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8")).entries
  : buildIndex(root, { excludeArchiveRaw: false, excludeTemplates: true });
const rows: DocEntry[] = filterEntries(entries, args.filters, args.search);

if (args.json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(formatRows(rows));
}

function parseRankArgs(argv: string[]): RankArgs {
  const parsed: RankArgs = { terms: [], limit: undefined, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--rank") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--limit") {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      parsed.limit = Number.isInteger(value) && value > 0 ? value : undefined;
      index += 1;
    } else if (!arg.startsWith("--")) {
      parsed.terms.push(arg);
    }
  }
  return parsed;
}

function formatRankHits(hits: RankHit[]): string {
  if (hits.length === 0) return "No ranked matches.";
  return hits
    .map((hit) => `${hit.score.toFixed(4)}\t${hit.lifecycle || "-"}\t${hit.path}`)
    .join("\n");
}
