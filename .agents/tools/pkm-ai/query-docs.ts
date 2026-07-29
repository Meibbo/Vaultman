#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  assessCacheFreshness,
  buildIndex,
  CACHE_PATH,
  filterEntries,
  formatFreshnessWarning,
  formatRows,
  parseArgs,
  selectByStatusGroup,
  unrecognizedStatuses,
} from "./lib/frontmatter.mjs";
import { hasGlossaryTerm } from "./lib/glossary.mjs";
import { recordMetric } from "./lib/metrics.mjs";
import { bm25Search, embeddingCoverage, hybridSearch, loadRetrievalIndex } from "./lib/retrieval.mjs";
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
  --status planned          (comma list = OR: --status completed,done)
  --lifecycle active        (ADR 0002 curation state)
  --initiative pkm-ai       (falls back to the initiative/<x> tag)
  --parent bt5-audit        (substring of the parent wikilink → issue-set members)
  --tag agent/item
  --since 2026-07-23        (updated on or after this date)
  --until 2026-07-23        (updated on or before this date)
  --not status=completed    (exclude a field=value; repeatable)
  --glossary term
  --json

Status groups (the corpus spells each state several ways):
  --open        active, draft, needs-triage, in-progress, pending, … plus any
                unrecognized value, which is reported on stderr.
  --closed      completed, complete, done, closed, released, passed.
  Neither flag matches archived / superseded / historical.

Search terms match id, title, type, status, initiative AND path, so a folder
name filters by location:
  query-docs.ts --status needs-triage bt5-final-stable-audit

Cache freshness:
  (default)     warn on stderr when .agents/docs changed after the cache was
                generated, or when cached paths no longer exist on disk.
  --refresh     rebuild the frontmatter cache before querying (does not rebuild
                the retrieval/vector cache — use index-docs.ts for that).
  --strict      exit 1 instead of warning, for scripted callers.

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
  reportEmbeddingCoverage(index);
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
  reportEmbeddingCoverage(index);
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
const indexOptions = { excludeArchiveRaw: false, excludeTemplates: true };

let entries: DocEntry[];
if (args.refresh || !fs.existsSync(cachePath)) {
  entries = buildIndex(root, indexOptions) as DocEntry[];
  if (args.refresh) writeCache(cachePath, entries);
} else {
  const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  entries = cache.entries;
  const freshness = assessCacheFreshness(root, cache, indexOptions);
  if (freshness.stale) {
    console.error(formatFreshnessWarning(freshness));
    if (args.strict) process.exit(1);
  }
}

if (args.open && args.closed) {
  console.error("query-docs: --open and --closed are mutually exclusive.");
  process.exit(1);
}

let rows: DocEntry[] = filterEntries(entries, args.filters, args.search, {
  negations: args.negations,
  since: args.since,
  until: args.until,
});
if (args.open || args.closed) {
  const group = args.open ? "open" : "closed";
  rows = selectByStatusGroup(rows, group) as DocEntry[];
  const drifted = unrecognizedStatuses(rows);
  if (drifted.length > 0) {
    const sample = drifted.map((item) => `${item.status} (${item.count})`).join(", ");
    console.error(
      `query-docs: unrecognized status values counted as open: ${sample}.\n` +
        "Add them to CLOSED/OPEN/INACTIVE_STATUSES in lib/frontmatter.mjs, or fix the docs.",
    );
  }
}

if (args.json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(formatRows(rows));
}

// --refresh rewrites the frontmatter cache only. The retrieval/vector cache is a
// separate corpus (index-docs.ts builds both); rebuild that one with index-docs.
function writeCache(targetPath: string, entries: DocEntry[]): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(
    targetPath,
    `${JSON.stringify({ generated_at: new Date().toISOString(), entries }, null, 2)}\n`,
  );
}

// Semantic/hybrid modes silently ignore docs without a vector. Print coverage to stderr so a
// query over unembedded work (audit R3) cannot look complete. Warns hard below 90%.
function reportEmbeddingCoverage(index: unknown): void {
  const { embedded, total, ratio } = embeddingCoverage(index);
  const pct = (ratio * 100).toFixed(0);
  if (total === 0) return;
  const line = `query-docs: semantic coverage ${embedded}/${total} docs embedded (${pct}%).`;
  if (ratio < 0.9) {
    console.error(`${line} Docs without a vector are invisible to this mode; rebuild with node .agents/tools/pkm-ai/embed-docs.ts`);
  } else {
    console.error(line);
  }
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
