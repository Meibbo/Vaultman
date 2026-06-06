import fs from "node:fs";
import path from "node:path";
import { create, insert, searchVector, save, load } from "@orama/orama";

// VectorStore (PKM-AI ADR 0006), Orama backend (MIT, no native deps). Holds id->vector with cosine
// vector search; snapshots to a device-local JSON file (regenerable, NOT synced). Same contract as
// FlatJsonVectorStore; swapped in for the real semantic path at S6d.

export class OramaVectorStore {
  constructor({ dims = 384 } = {}) {
    this.dims = dims;
    this.db = null;
  }

  _schema() {
    return { id: "string", vector: `vector[${this.dims}]` };
  }

  async init() {
    this.db = await create({ schema: this._schema() });
    return this;
  }

  async upsert(id, vector) {
    if (!this.db) await this.init();
    await insert(this.db, { id, vector: Array.from(vector) });
  }

  async rebuild(entries) {
    this.db = await create({ schema: this._schema() });
    for (const entry of entries) {
      await insert(this.db, { id: entry.id, vector: Array.from(entry.vector) });
    }
  }

  async clear() {
    this.db = await create({ schema: this._schema() });
  }

  async query(vector, k = 10) {
    if (!this.db) return [];
    const result = await searchVector(this.db, {
      mode: "vector",
      vector: { value: Array.from(vector), property: "vector" },
      similarity: 0,
      limit: k,
    });
    return result.hits.map((hit) => ({ id: hit.document.id, score: hit.score }));
  }

  async save(filePath) {
    if (!this.db) await this.init();
    const raw = await save(this.db);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(raw));
  }

  async load(filePath) {
    this.db = await create({ schema: this._schema() });
    await load(this.db, JSON.parse(fs.readFileSync(filePath, "utf8")));
    return this;
  }
}
