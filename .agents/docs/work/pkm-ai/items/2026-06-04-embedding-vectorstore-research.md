---
title: R-EMBED — embedding + vector-store landscape (local-first, free)
type: research-record
status: active
parent: "[[docs/work/pkm-ai/specs/2026-06-04-orchestration-upgrade/index|orchestration-upgrade spec]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/research
  - initiative/pkm-ai
---

# R-EMBED — Embedding + Vector-Store Landscape

Read-only Explore research 2026-06-04. Feeds spec S6 + ADR 0006. Default = local, swappable by config.

## Local embedders (free, zero network)

- **transformers.js** (`@xenova/transformers`, MIT, in-Node ONNX, **no daemon**) — **DEFAULT**.
  `all-MiniLM-L6-v2` 22 MB / **384-dim** (~<100 ms/doc after a 30–60 s first-load; 200–400 MB RAM); alts `nomic-embed-text` 768, `bge-small-en` 384. ★★★★★ (proven in Smart Connections + Copilot, 10k+ users).
- **Ollama** (local daemon, free, GPU accel) — `nomic-embed-text` 768 / `mxbai-embed-large` 1024. ★★★★☆ optional/scale.
- node-llama-cpp = skip (LLM-focused, heavy). LM Studio = dev-only (GUI, not headless).

## Hosted free-tier + PRIVACY

- **Google Gemini** `text-embedding-004` free (≈60 rpm, ~100k tok/day, 768-dim): **🚩 DATA-TRAINING RISK** — ToS "may be used to improve services." NOT for private vaults; public-safe content only.
- **OpenAI** `text-embedding-3-small`: NO free tier (trial credits only); but explicit no-training policy.
- **Cohere** 100 calls/month (useless); Jina/Mistral/Voyage = no usable free tier.
- → free hosted exists, but Gemini's = privacy-risky for a PRIVATE vault (ties MD-K1). **Local = safe default.**

## What the dev's plugins teach (Smart Connections, Copilot)

- DEFAULT = **local transformers.js** (all-MiniLM 384); OpenAI/Ollama opt-in.
- Vector store = **flat JSON** (`.obsidian/smart-connections/embeddings.json`), **regenerable, NOT synced**, in-memory cosine. Lessons: local-default non-negotiable · store regenerable + device-local · flat JSON is enough at 1k–10k · hosted strictly opt-in.

## Vector stores (Node/local)

| store | persist | perf 1k–10k | native deps | fit |
|---|---|---|---|---|
| **Orama** (MIT) | JSON snapshot | 10–50 ms | none | ✓✓ best MVP (hybrid FT+vector) |
| flat-JSON + cosine | JSON | 50–100 ms O(n) | none | ✓✓ simplest/transparent |
| sqlite-vec (MIT) | sqlite | 1–10 ms | better-sqlite3 | scale > 10k |
| hnswlib-node (Apache) | bin | <1 ms | optional | speed-critical |
| LanceDB (Apache) | lance | fast | none | overkill < 100k |

## Adapter design (recommended)

```ts
interface EmbeddingProvider { id: string; dims: number; embed(texts: string[]): Promise<number[][]>;
  isAvailable?(): Promise<boolean>; getMetadata?(): { model: string; dataPrivacy: "local"|"training_risk"|"no_training" } }
interface VectorStore { upsert(...); query(q, limit?, minSim?); delete(ids); rebuild(file); clear() }
interface EmbeddingConfig { provider: "local-transformers"|"local-ollama"|"google-gemini"; model?; apiKey?;
  endpoint?; vectorStore: "orama"|"flat-json"|"sqlite-vec"|"hnswlib"; storePath?; enableFallback?: boolean }
```

- **DEFAULT** = `local-transformers` (all-MiniLM-L6-v2) + `orama` (or `flat-json`), `storePath` device-local, `enableFallback: true`. Fallback chain: configured → on hosted fail/quota → revert local; **never force paid**.
- Embed **on doc-change** (content-hash); soft-delete on git rm.

## Sources
- transformers.js github.com/xenova/transformers.js · Ollama ollama.ai · Google ai.google.dev/pricing
- Smart Connections github.com/brianpetro/obsidian-smart-connections · Copilot github.com/logancyang/obsidian-copilot
- Orama github.com/OramaSearch/orama · sqlite-vec github.com/asg017/sqlite-vec · hnswlib github.com/nmslib/hnswlib
