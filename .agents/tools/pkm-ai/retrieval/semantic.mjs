import { bm25Search, rrfFuse, LIFECYCLE_WEIGHTS, DEFAULT_LIFECYCLE_WEIGHT } from "../lib/retrieval.mjs";

// Semantic hybrid retrieval (async): real embeddings (provider) ranked via a VectorStore, fused with
// BM25 through RRF, then lifecycle-weighted. Mirrors the sync hybridSearch but for async providers
// (transformers.js) + async stores (Orama). Only docs that carry a persisted `vector` participate in
// the vector arm; BM25 still spans the whole index.
export async function semanticSearch(index, query, options = {}) {
  const { provider, store } = options;
  const limit = options.limit ?? 10;
  const rrfK = options.rrfK ?? 60;
  const weights = options.lifecycleWeights ?? LIFECYCLE_WEIGHTS;
  const defaultWeight = options.defaultWeight ?? DEFAULT_LIFECYCLE_WEIGHT;
  const allDocs = Array.isArray(index?.docs) ? index.docs : [];
  const vectorDocs = allDocs.filter((doc) => Array.isArray(doc.vector));
  if (vectorDocs.length === 0 || !provider || !store) return [];

  await store.rebuild(vectorDocs.map((doc) => ({ id: doc.path, vector: doc.vector })));
  const queryText = Array.isArray(query) ? query.join(" ") : query;
  const [queryVector] = await provider.embed([queryText]);
  const vectorOrder = (await store.query(queryVector, vectorDocs.length)).map((hit) => hit.id);

  const bm25Order = bm25Search(index, query, {
    limit: allDocs.length,
    lifecycleWeights: weights,
    defaultWeight,
  }).map((hit) => hit.path);

  const fused = rrfFuse([bm25Order, vectorOrder].filter((list) => list.length > 0), { k: rrfK });
  const byPath = new Map(allDocs.map((doc) => [doc.path, doc]));
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
