---
title: PKM-AI Orchestration Upgrade — spec
type: spec
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/spec
  - initiative/pkm-ai
---

# PKM-AI Orchestration Upgrade — Spec

HOW to implement the locked decisions so PKM-AI stops being an unstructured sandbox. WHY/decision detail lives in the ADRs — this spec is scope + vertical slices + acceptance. Hub:
[[docs/work/pkm-ai/items/2026-06-04-multi-agent-orchestration-upgrade|orchestration upgrade item]].

## Goal

Mandated agent registration + coordination, memory with lifecycle, cheap retrieval, typed + versioned tooling. Fixes the root-cause **discipline/routing gap** (tools existed — agent-room — but were never mandated → unused → accumulation).

## Locked inputs

ADR [[docs/work/pkm-ai/adr/0001-scripts-typescript-migration|0001]] (.ts) · [[docs/work/pkm-ai/adr/0002-memory-lifecycle-states|0002]] (lifecycle) · [[docs/work/pkm-ai/adr/0003-coordination-shared-brain|0003]] (coordination, smoke ✓) · [[docs/work/pkm-ai/adr/0004-runtime-startup-mandatory-protocol|0004]] (runtime-startup) · [[docs/work/pkm-ai/adr/0005-pkm-ai-versioning|0005]] (versioning).
Substrate verified 2026-06-04: agent-room.mjs works; `dependsOn[]`/`scope[]`/waiting-blocked statuses exist.

## Non-goals

- **Embedding + vector-store = pluggable provider behind a config switch.** Default = local / zero-key;
  hosted (free-tier Google/OpenAI, or paid) optional + swappable, NEVER required. (Corrected 2026-06-04:
  free hosted tiers exist — dev used them via Smart Connections/Copilot — so don't hard-pick; adapter + switch.)
- No big-bang `.ts` rename — phased.
- No product (Vaultman plugin) code changes.

## Slices (vertical, tracer-bullet — each independently shippable + verifiable)

### S1 — Runtime-startup mandate (0004) [highest leverage, do first]
- Rewrite `AGENTS.md` "Start Here" → the mandatory 0–6 sequence (identify → agent-room join+heartbeat → retrieval-first → status/handoff route-only → scope-claim / own-shard boundary → route → exit). Lean;
  point to detail docs. Add `start.md` pointer.
- **Acceptance:** a fresh agent following AGENTS.md does join + scope-claim + exit; `AGENTS.md` stays lean (≤ ~120 lines); dev reviews diff before apply.

### S2 — Coordination conventions (0003)
- New `docs/architecture/policies/coordination.md`: poll-at-turn-boundary; `dependsOn` usage; scope-claim before shared edits; own session-shard for own memory (S-12); mailbox `--body`.
- **Acceptance:** 2-agent run; B's task `dependsOn` A's; B sees A done via poll; scope conflict detected on overlap.

### S3 — Memory lifecycle (0002) [absorbs the P4 backlog]
- Add `lifecycle` states to frontmatter convention (active/deferred/triaged/blocked/superseded/archived) in docs policy.
- `check-doc-health.mjs`: add stale-active + lifecycle checks. Working-surface filter: status/handoff show only `active` + pointers. Run the recurring prune (clears the 121 health FAILs + 4 conflict files).
- **Acceptance:** health flags lifecycle/stale; status/handoff hold only active; a superseded item is archived-first + linked; health FAIL count → 0.

### S4 — Versioning (0005)
- `.agents/pkm-ai.version.json` {pkmAiVersion, protocolVersion, stateSchemaVersion, toolingVersion} + `docs/work/pkm-ai/CHANGELOG.md`; startup step 0 reads it.
- **Acceptance:** version file read at startup; CHANGELOG v1 entry; major-bump re-read rule documented.

### S5 — `.ts` migration (0001), phased
- Add `tsconfig.json` (strict · erasableSyntaxOnly · nodenext · allowImportingTsExtensions) + `engines.node >= 22.18`.
- Order: agent-room → manage-tasks → check-doc-health → split-shard → update-frontmatter → rest. Each: rename `.mjs`→`.ts`, add erasable types, `node x.ts` runs, behavior-preserved.
- **Acceptance:** migrated scripts run via `node x.ts` with output parity vs `.mjs` baseline; erasable-only lint passes.

### S6 — Retrieval channel: local tri-layer (vector + BM25 + graph), ZERO API
- **Graph:** grow `traverse-graph.mjs` → parse `[[wikilink]]` + typed links → typed-edge graph (gbrain zero-LLM pattern; free).
- **Keyword:** `query-docs.mjs` → BM25 over frontmatter + body.
- **Vector (pluggable, default local):** `EmbeddingProvider` + `VectorStore` ADAPTERS behind a config switch — swap provider when decided / if you change your mind, no rewrite. Default = **local zero-key** (transformers.js in-Node ONNX, or Ollama). Optional swap to **free-tier hosted** (Google/OpenAI free tier) or paid. Vector-store adapter: Orama / flat-JSON-cosine / sqlite-vec / hnswlib-node. **Default LOCKED ([[docs/work/pkm-ai/adr/0006-retrieval-channel-pluggable-embeddings|ADR 0006]], research [[docs/work/pkm-ai/items/2026-06-04-embedding-vectorstore-research|R-EMBED]]):** transformers.js `all-MiniLM-L6-v2` (384) + Orama (or flat-JSON), device-local regenerable, fallback-to-local, never force paid. ⚠️ Google free-tier = data-training risk → local default for the private vault. Note: `transformers.js` = library name (runs in Node); our code stays `.ts` (0001).
- **Fusion:** vector + BM25 via Reciprocal Rank Fusion; optional local cross-encoder rerank (transformers.js, heavier → optional). Lifecycle-weighted (0002: active > deferred > superseded).
- **Pipeline:** embed **on doc-change** (incremental; store vector + content-hash; re-embed on hash change;
  soft-delete on git rm — gbrain pattern). NOT a 24/7 service.
- **Storage:** vector store + embedding cache = regenerable → **device-local** (NOT synced — sync-boundary, watch-list §1), avoids `data.json`/Sync bloat.
- **Acceptance:** `query-docs <term>` returns lifecycle-ranked HYBRID top-k; `traverse-graph <node>` returns linked entities/edges; embeddings regenerate from Markdown with **zero network / zero API**; cold-rebuild documented.
- → candidate **PKM-AI ADR 0006** (retrieval-channel; embedder/store lib locked by prototype).

## Sequencing

S1 first (unblocks the mandate). S2/S3/S4 parallel after S1. S5 anytime (start agent-room.ts). S6 after S3 (lifecycle ranking) or parallel. Critical path: **S1 → S2/S3 → S6**.

## Verification

- 2-agent live coordination smoke (S2). · `check-doc-health` green incl. lifecycle (S3). · `node x.ts` parity for migrated scripts (S5). · fresh-agent cold-start obeys AGENTS.md 0–6 (S1).

## To plan

Each slice → plan shard + tracer-bullet issues. agent-room smoke already ✓ (2026-06-04).
Ties: P3 audit (P4 → S3) · gbrain/pi research · S-12/S-13.
