import { tokenize } from "../lib/retrieval.mjs";

// EmbeddingProvider contract (PKM-AI ADR 0006):
//   { id, dims, embed(texts) -> number[][], getMetadata() -> { dataPrivacy } }
// HashEmbeddingProvider is the zero-dependency, fully-local, deterministic default: a hashed
// bag-of-words embedding (FNV-1a token hash into `dims` buckets, then L2-normalized). It needs no
// model download and runs offline, so it backs the tests and the fallback path. The real semantic
// provider (transformers.js all-MiniLM-L6-v2) swaps in behind the same contract at S6d.

const DEFAULT_DIMS = 256;

export class HashEmbeddingProvider {
  constructor({ dims = DEFAULT_DIMS } = {}) {
    this.id = "hash-bow";
    this.dims = dims;
  }

  getMetadata() {
    return { id: this.id, dims: this.dims, dataPrivacy: "local" };
  }

  embed(texts) {
    return texts.map((text) => {
      const counts = new Array(this.dims).fill(0);
      for (const token of tokenize(text)) {
        counts[hashToken(token, this.dims)] += 1;
      }
      return normalize(counts);
    });
  }

  // Embed straight from a stored termFreq map (avoids re-tokenizing doc bodies at query time).
  embedCounts(termFreq) {
    const counts = new Array(this.dims).fill(0);
    for (const [token, freq] of Object.entries(termFreq ?? {})) {
      counts[hashToken(token, this.dims)] += freq;
    }
    return normalize(counts);
  }
}

function hashToken(token, dims) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % dims;
}

function normalize(vector) {
  let magnitude = 0;
  for (const value of vector) magnitude += value * value;
  magnitude = Math.sqrt(magnitude);
  if (magnitude === 0) return vector.slice();
  return vector.map((value) => value / magnitude);
}
