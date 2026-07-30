---
title: "PKM-AI 0006 — Retrieval channel: pluggable embeddings + vector store (default local)"
type: adr
status: active
parent: "[[docs/work/pkm-ai/adr/README|pkm-ai adr]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/adr
  - initiative/pkm-ai
---

# PKM-AI 0006 — Retrieval Channel: Pluggable Embeddings + Vector Store

**Decision status:** Accepted (dev-directed 2026-06-04; provider swappable by config — inherently reversible).
**Date:** 2026-06-04. Research: [[docs/work/pkm-ai/items/2026-06-04-embedding-vectorstore-research|R-EMBED]].

## Context

Spec S6's retrieval channel needs semantic vectors, but: (a) no paid API budget (free tiers ok), (b) the dev's vault is private/sensitive (MD-K1), (c) the dev wants a **switch**, not a rigid single pick. Research confirms free hosted tiers exist but Google's free embeddings carry a data-training ToS risk; the dev's own plugins (Smart Connections, Copilot) default to LOCAL.

## Decision

Retrieval embeddings + vector store are **pluggable adapters behind a config switch**, defaulting to local.

- **Interfaces:** `EmbeddingProvider { id, dims, embed(texts), getMetadata{dataPrivacy} }` + `VectorStore { upsert, query, delete, rebuild, clear }` + `EmbeddingConfig { provider, model?, apiKey?, endpoint?, vectorStore, storePath?, enableFallback }`.
- **Default (zero-key, offline, private):** `local-transformers` = transformers.js `all-MiniLM-L6-v2` (384-dim, MIT, in-Node, no daemon) + vector store **Orama** (MIT, no native deps, JSON snapshot) — or `flat-json` + cosine for minimal deps.
- **Swappable by config/env:** `local-ollama` (daemon, GPU) · `google-gemini` (free-tier) · paid — user opt-in.
- **Fallback chain:** configured → on hosted fail/quota → **revert to local**; never force paid.
- **Storage:** vector store + embedding cache = **device-local, regenerable, NOT synced** (sync-boundary, watch-list §1); embed **on doc-change** (content-hash; soft-delete on git rm).
- **Privacy guardrail:** `getMetadata().dataPrivacy` is surfaced; default LOCAL for the private vault; hosted providers (esp. Google free = `training_risk`) only on explicit opt-in for public-safe content.

## Consequences

- Zero-key / zero-cost / offline / private by default; swap to free-tier or paid anytime via config — no rewrite (satisfies the dev's "switch" requirement + S-29 "wrap behind a contract").
- Matches the proven Smart Connections / Copilot pattern; scales to ~10k docs in-memory.
- Cost: transformers.js adds ~200–400 MB RAM + a 30–60 s first-load; new deps (transformers.js + Orama).

## Alternatives considered

- **Hard-pick one provider:** rigid — rejected by the dev.
- **Hosted-default (Google free):** cost-free but data-training risk on a private vault + network dependency.
- **No vectors (BM25 + graph only):** loses semantic recall (the "find by meaning" win).
