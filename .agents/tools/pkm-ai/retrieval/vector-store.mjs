import fs from "node:fs";
import path from "node:path";

// VectorStore contract (PKM-AI ADR 0006):
//   { upsert(id, vector), query(vector, k) -> [{id, score}], delete(id), rebuild(entries), clear() }
// FlatJsonVectorStore is the zero-dependency default: an in-memory id->vector map with cosine query
// and an optional JSON snapshot (device-local, regenerable, NOT synced — sync-boundary). Orama swaps
// in behind the same contract at S6d.

export class FlatJsonVectorStore {
  constructor() {
    this.vectors = new Map();
  }

  upsert(id, vector) {
    this.vectors.set(id, Array.from(vector));
  }

  delete(id) {
    this.vectors.delete(id);
  }

  clear() {
    this.vectors.clear();
  }

  rebuild(entries) {
    this.clear();
    for (const entry of entries) {
      this.upsert(entry.id, entry.vector);
    }
  }

  query(vector, k = 10) {
    const hits = [];
    for (const [id, stored] of this.vectors) {
      hits.push({ id, score: cosine(vector, stored) });
    }
    hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return hits.slice(0, k);
  }

  save(filePath) {
    const data = { entries: [...this.vectors.entries()].map(([id, vector]) => ({ id, vector })) };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data));
  }

  static load(filePath) {
    const store = new FlatJsonVectorStore();
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    store.rebuild(Array.isArray(data.entries) ? data.entries : []);
    return store;
  }
}

function cosine(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
