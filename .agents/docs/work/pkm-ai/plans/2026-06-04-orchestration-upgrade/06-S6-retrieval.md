---
title: S6 — local tri-layer retrieval (graph + BM25 + vectors) — plan shard
type: plan-shard
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/index|orchestration-upgrade plan]]"
created: 2026-06-05T16:20:00
updated: 2026-06-05T16:20:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/plan
  - initiative/pkm-ai
---

# S6 — Retrieval Channel (ADR 0006), plan shard

Promotes the spec S6 outline + ADR [[docs/work/pkm-ai/adr/0006-retrieval-channel-pluggable-embeddings|0006]]
into executable sub-slices. Spec acceptance: `query-docs <term>` returns lifecycle-ranked **hybrid** top-k ·
`traverse-graph <node>` returns linked entities/edges · embeddings regenerate **zero-network** · cold-rebuild
documented. Research: [[docs/work/pkm-ai/items/2026-06-04-embedding-vectorstore-research|R-EMBED]].

## Locked decisions (dev grill, 2026-06-05)

1. **Vector deps — install for real.** Default provider = `transformers.js` (`@xenova/transformers`)
   `all-MiniLM-L6-v2` (384-dim) + vector store = **Orama** (`@orama/orama`). Adds `node_modules` to the
   shared worktree; model downloads on first embed (one-time network). Still behind the ADR 0006 adapter
   contract (swappable; fallback-to-local; never force paid). Zero-network applies to *re-embedding /
   query*, not the one-time install + model fetch.
2. **BM25 corpus — separate retrieval index.** New `.agents/cache/retrieval-index.json` (per-doc: body
   tokens + content-hash + lifecycle + vector) built by `index-docs`. The existing
   `search-index.json` + `query-docs` frontmatter-filter path stays untouched (zero ripple).
3. **Order — graph first.** S6a graph → S6b retrieval-index + BM25 → S6c contracts + flat-json + RRF +
   lifecycle weighting → S6d real transformers.js + Orama (install-gated).

## Sub-slices

- [x] **S6a — graph** (`0c2b7b3`): `traverse-graph.mjs`→`.ts`, wikilink/typed-edge graph over
  `.agents/docs`. Edge types `parent` (frontmatter) + `link` (body `[[...]]`); `<node>` normalizes
  wiki-path/file/slug; `--depth` BFS into `reachable`; `--direction out|in|both`; `--json`. TDD
  (`test/traverse-graph.test.mjs`, 4 tests). tsc 47, suite 52. Real corpus: index = 30 out / 47 backlinks.
- [x] **S6b — retrieval index + BM25** (`96adba1`): `lib/retrieval.mjs` (`buildRetrievalIndex` = termFreq +
  sha1 content-hash + lifecycle + length; `bm25Search` k1=1.5/b=0.75 + lifecycle weight; `loadRetrievalIndex`
  cache-or-in-memory). `index-docs` writes `retrieval-index.json`; `query-docs --rank [--limit N] [--json]`
  (filter mode untouched). TDD 4 tests; suite 56. Real corpus 824 docs, ranking surfaces the right S6 docs.
- [x] **S6c — adapter contracts + zero-dep store + fusion** (`f8857c0`): `retrieval/embedding-provider.mjs`
  (`HashEmbeddingProvider` — deterministic FNV-1a BoW, L2-norm, `dataPrivacy:local`; `embed` + `embedCounts`)
  + `retrieval/vector-store.mjs` (`FlatJsonVectorStore` — cosine query + JSON snapshot). `lib/retrieval.mjs`
  `rrfFuse` + `hybridSearch` (BM25 + vector via RRF, lifecycle-weighted). `query-docs --hybrid`. TDD 5 tests;
  suite 61. **Caveat:** the hash stub is non-semantic → on the full corpus `--hybrid` dilutes BM25 precision;
  `--rank` stays the strong path until S6d swaps in real MiniLM behind the same `EmbeddingProvider` contract.
- [ ] **S6d — real local provider (install-gated).** `npm i @xenova/transformers @orama/orama`;
  `local-transformers` provider (MiniLM-L6-v2, 384) + Orama store adapter; embed-on-change (content-hash;
  soft-delete on `git rm`); fallback-to-local. Smoke-gated (model download) — not in the default
  `node --test` path. Document cold-rebuild.

## Verify gates (every slice)

`tsc -p .agents/tools/pkm-ai/tsconfig.json --noEmit` stays **47** · the slice's `node --test` suite green ·
full suite green · `--help`/CLI parity for touched tools · no NUL/binary artifacts (post-Write check).

## Guardrails

Branch `sandbox`. Commit per sub-slice. `git status --short` before each (only intended files; renames OK).
Never touch `current/status.md` · `current/handoff.md` · `work/hardening/*` · `metrics/*` (parallel Codex).
`.agents/cache/*` is gitignored (regenerable) — never commit the index artifacts.
