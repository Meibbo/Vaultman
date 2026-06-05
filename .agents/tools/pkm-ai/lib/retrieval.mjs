import fs from "node:fs";
import crypto from "node:crypto";
import { listMarkdownFiles, parseMarkdown, relativePath } from "./frontmatter.mjs";
import { FlatJsonVectorStore } from "../retrieval/vector-store.mjs";

export const RETRIEVAL_CACHE_PATH = ".agents/cache/retrieval-index.json";

// Lifecycle ranking weights (PKM-AI ADR 0002 + 0006): active surfaces above demoted memory.
// Docs without the opt-in `lifecycle:` field use DEFAULT_LIFECYCLE_WEIGHT (neutral, == active) so the
// large pre-lifecycle corpus is not penalized.
export const LIFECYCLE_WEIGHTS = {
  active: 1.0,
  triaged: 0.85,
  deferred: 0.7,
  blocked: 0.6,
  superseded: 0.4,
  archived: 0.3,
};
export const DEFAULT_LIFECYCLE_WEIGHT = 1.0;

export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length >= 2);
}

// Build the retrieval corpus: one entry per active doc with body term frequencies, a content hash
// (for re-embed-on-change in S6d), lifecycle, and length. Pure-local, zero network.
export function buildRetrievalIndex(root = process.cwd(), options = {}) {
  const docs = listMarkdownFiles(root, ".agents/docs", { excludeArchive: true, ...options }).map((file) => {
    const rel = relativePath(root, file);
    const raw = fs.readFileSync(file, "utf8");
    const parsed = parseMarkdown(raw);
    const frontmatter = parsed.frontmatter ?? {};
    const title = frontmatter.title ?? rel;
    const lifecycle = typeof frontmatter.lifecycle === "string" ? frontmatter.lifecycle : "";
    const updated = typeof frontmatter.updated === "string" ? frontmatter.updated : "";
    const tokens = tokenize(`${title} ${parsed.body}`);
    const termFreq = {};
    for (const token of tokens) {
      termFreq[token] = (termFreq[token] ?? 0) + 1;
    }
    const contentHash = crypto.createHash("sha1").update(raw).digest("hex");
    return {
      path: rel,
      title: String(title),
      lifecycle,
      updated,
      contentHash,
      length: tokens.length,
      termFreq,
    };
  });
  return { generated_at: new Date().toISOString(), docs };
}

export function loadRetrievalIndex(root = process.cwd()) {
  const cachePath = `${root}/${RETRIEVAL_CACHE_PATH}`;
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch {
      // Corrupt cache -> rebuild in-memory below.
    }
  }
  return buildRetrievalIndex(root);
}

// BM25 over the retrieval index, then multiply by the lifecycle weight. Returns ranked hits
// (highest score first); docs that match no query term are dropped.
export function bm25Search(index, query, options = {}) {
  const k1 = options.k1 ?? 1.5;
  const b = options.b ?? 0.75;
  const weights = options.lifecycleWeights ?? LIFECYCLE_WEIGHTS;
  const defaultWeight = options.defaultWeight ?? DEFAULT_LIFECYCLE_WEIGHT;
  const docs = Array.isArray(index?.docs) ? index.docs : [];
  const terms = (Array.isArray(query) ? query.join(" ") : query) ?? "";
  const queryTerms = [...new Set(tokenize(terms))];
  if (docs.length === 0 || queryTerms.length === 0) return [];

  const docCount = docs.length;
  const avgLength = docs.reduce((sum, doc) => sum + (doc.length ?? 0), 0) / docCount || 1;

  const documentFrequency = {};
  for (const term of queryTerms) {
    let df = 0;
    for (const doc of docs) {
      if (doc.termFreq && doc.termFreq[term]) df += 1;
    }
    documentFrequency[term] = df;
  }

  const results = [];
  for (const doc of docs) {
    let score = 0;
    for (const term of queryTerms) {
      const freq = (doc.termFreq && doc.termFreq[term]) || 0;
      if (freq === 0) continue;
      const df = documentFrequency[term];
      const idf = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
      const denominator = freq + k1 * (1 - b + b * ((doc.length ?? 0) / avgLength));
      score += idf * ((freq * (k1 + 1)) / denominator);
    }
    if (score <= 0) continue;
    const weight = doc.lifecycle && weights[doc.lifecycle] !== undefined ? weights[doc.lifecycle] : defaultWeight;
    results.push({
      path: doc.path,
      title: doc.title,
      lifecycle: doc.lifecycle,
      score: score * weight,
      rawScore: score,
    });
  }

  results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const limit = options.limit ?? results.length;
  return results.slice(0, limit);
}

// Reciprocal Rank Fusion: merge several ranked id-lists into one. Each list contributes
// 1 / (k + rank) per id; ids ranked high across lists win. Ties broken by id for determinism.
export function rrfFuse(rankings, options = {}) {
  const k = options.k ?? 60;
  const scores = new Map();
  for (const ranking of rankings) {
    ranking.forEach((id, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

// Hybrid retrieval: BM25 keyword ranking + (optional) vector ranking via an EmbeddingProvider,
// fused with RRF, then lifecycle-weighted. Zero-network when the provider is local (default
// HashEmbeddingProvider). The real semantic provider swaps in behind the same signature at S6d.
export function hybridSearch(index, query, options = {}) {
  const provider = options.provider;
  const limit = options.limit ?? 10;
  const rrfK = options.rrfK ?? 60;
  const weights = options.lifecycleWeights ?? LIFECYCLE_WEIGHTS;
  const defaultWeight = options.defaultWeight ?? DEFAULT_LIFECYCLE_WEIGHT;
  const docs = Array.isArray(index?.docs) ? index.docs : [];
  if (docs.length === 0) return [];

  const bm25Order = bm25Search(index, query, {
    limit: docs.length,
    lifecycleWeights: weights,
    defaultWeight,
  }).map((hit) => hit.path);

  let vectorOrder = [];
  if (provider) {
    const store = options.vectorStore ?? new FlatJsonVectorStore();
    store.rebuild(docs.map((doc) => ({ id: doc.path, vector: provider.embedCounts(doc.termFreq) })));
    const queryText = Array.isArray(query) ? query.join(" ") : query;
    const queryVector = provider.embed([queryText])[0];
    vectorOrder = store.query(queryVector, docs.length).map((hit) => hit.id);
  }

  const fused = rrfFuse([bm25Order, vectorOrder].filter((list) => list.length > 0), { k: rrfK });
  const byPath = new Map(docs.map((doc) => [doc.path, doc]));
  const results = fused.map((entry) => {
    const doc = byPath.get(entry.id) ?? {};
    const weight = doc.lifecycle && weights[doc.lifecycle] !== undefined ? weights[doc.lifecycle] : defaultWeight;
    return {
      path: entry.id,
      title: doc.title,
      lifecycle: doc.lifecycle,
      score: entry.score * weight,
      fusedScore: entry.score,
    };
  });
  results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return results.slice(0, limit);
}
