import { pipeline } from "@xenova/transformers";

// EmbeddingProvider (PKM-AI ADR 0006), real local semantic default: transformers.js
// all-MiniLM-L6-v2 (384-dim, MIT), in-Node ONNX, no daemon, no API key. The model downloads
// once (cached under node_modules/@xenova/transformers/.cache — gitignored, device-local, NOT
// synced); re-embedding is then fully offline. `embed` is async (model inference); callers await.

const MODEL = "Xenova/all-MiniLM-L6-v2";

export class TransformersEmbeddingProvider {
  constructor({ model = MODEL } = {}) {
    this.id = "local-transformers";
    this.model = model;
    this.dims = 384;
    this._extractor = null;
  }

  getMetadata() {
    return { id: this.id, model: this.model, dims: this.dims, dataPrivacy: "local" };
  }

  async _getExtractor() {
    if (!this._extractor) {
      this._extractor = await pipeline("feature-extraction", this.model);
    }
    return this._extractor;
  }

  async embed(texts) {
    const extractor = await this._getExtractor();
    const vectors = [];
    for (const text of texts) {
      const output = await extractor(text, { pooling: "mean", normalize: true });
      vectors.push(Array.from(output.data));
    }
    return vectors;
  }
}
