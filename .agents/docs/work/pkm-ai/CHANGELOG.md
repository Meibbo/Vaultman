---
title: PKM-AI CHANGELOG
type: changelog
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-05T00:00:00
updated: 2026-06-06T04:48:09
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/pkm-ai
---

# PKM-AI CHANGELOG

Versions the PKM-AI **system** (agent protocol + state schema + `.agents/tools/` tooling), surfaced in [`.agents/pkm-ai.version.json`](../../../pkm-ai.version.json) and read at Runtime Startup step 0 (ADR 0004).
Bump rule (ADR [[docs/work/pkm-ai/adr/0005-pkm-ai-versioning|0005]]): **MAJOR** = breaking protocol/schema change → agents MUST re-read the protocol docs before acting; **MINOR** = additive; **PATCH** = fixes.
Doubles as the "new-since" delta surface for fresh agents. Newest at top.

## Unreleased

- **S3b** — recurring prune of the doc-health backlog (123 fails: line-limit/timestamp/parent) once a coordinated window opens (most fails are in another stream's contended docs).

## tooling 1.1.0 — 2026-06-06

**S6 complete** — local tri-layer retrieval channel (ADR [[docs/work/pkm-ai/adr/0006-retrieval-channel-pluggable-embeddings|0006]]), zero-API, lifecycle-weighted.
Additive (MINOR); protocol/state-schema untouched.

- **Graph** (`0c2b7b3`) — `traverse-graph.ts`: wikilink/typed-edge graph over `.agents/docs` (`parent` + body `[[link]]` edges), `<node>` normalization, `--depth` BFS, `--direction`, `--json`.
- **BM25** (`96adba1`) — `lib/retrieval.mjs` (`buildRetrievalIndex` termFreq + sha1 content-hash + lifecycle; `bm25Search` k1=1.5/b=0.75 + lifecycle weight active>…>archived; `loadRetrievalIndex`).
  `index-docs` writes `.agents/cache/retrieval-index.json`; `query-docs --rank`.
- **Hybrid + adapters** (`f8857c0`) — ADR-0006 contracts: `retrieval/embedding-provider.mjs` (`HashEmbeddingProvider` zero-dep stub) + `retrieval/vector-store.mjs` (`FlatJsonVectorStore`);
  `rrfFuse` (Reciprocal Rank Fusion) + `hybridSearch`; `query-docs --hybrid`.
- **Real semantic** (`9be984d`) — deps `@xenova/transformers` + `@orama/orama` (isolated to the tool package). `TransformersEmbeddingProvider` (MiniLM all-MiniLM-L6-v2, 384) + `OramaVectorStore` + async `semanticSearch`. `embed-docs.ts` = embed-on-change persist (content-hash gated); `query-docs --semantic`; `pkm embed`. Model caches to gitignored node_modules (device-local, not synced);
  re-embed offline. Cold-rebuild documented in the S6 plan shard.
- Verified: default `node --test` suite 48→61 green (model path gated to `test/semantic.smoke.mjs`, excluded from the glob); `tsc --noEmit` holds at the 47 baseline; per-slice TDD; end-to-end semantic smoke ranks by meaning. `--rank`/`--hybrid`/`traverse-graph` need no model.

## tooling 1.0.1 — 2026-06-05

**S5 complete** — phased `.mjs`→`.ts` migration of the remaining PKM-AI tools (ADR [[docs/work/pkm-ai/adr/0001-scripts-typescript-migration|0001]]; Node 24 native type-stripping, no build). Pure refactor — black-box CLI behavior unchanged (PATCH); protocol/state-schema untouched.

- Migrated, each with a full erasable-only type layer (interfaces + annotations + `as`/type-predicate;
  no enums/namespaces/parameter-properties): `manage-tasks` (prior session), `check-doc-health`, `split-shard`, `update-frontmatter`, `query-docs`, `index-docs`, `record-metric`, `pkm` dispatcher.
- `lib/*.mjs` (frontmatter/glossary/metrics) stay `.mjs` — `.ts` tools import them via tsconfig `allowJs`, so no rename ripple. `tsconfig.json` `erasableSyntaxOnly` enforces erasable-only types;
  `tsc --noEmit` holds at the 47-error pre-existing baseline (no new type debt).
- Fixed dangling `package.json` `tasks`/`pkm-ai-tasks` refs left pointing at the deleted `manage-tasks.mjs`.
- Verified per tool: `tsc` stays 47 · `--help`/CLI parity · the tool's `node --test` suite green · cross-suite callers green (full suite 48 green). Commits `b361484`…`f2a3143` on `sandbox`.

Remaining `.mjs` (archive-active-doc, update-indexes, shard-index, code-index, manage-memory, analyze-*, traverse-graph) are out of S5 scope — `traverse-graph` migrates with S6.

## 1.0.0 — 2026-06-05

First formally versioned PKM-AI contract — the protocol is now mandated and coordinated, not optional.

- **protocol 1.0.0** — mandatory Runtime Startup sequence (ADR 0004; `AGENTS.md`) + cross-stream shared-brain coordination (ADR 0003; [[docs/architecture/policies/coordination|coordination.md]]):
  presence (join + heartbeat + leave), `ensureRun` one-room-per-project across worktrees, scope-claim before shared edits, `task --depends-on` (poll-based), mailbox, poll-at-turn-boundary, stream/worktree tags.
- **stateSchema 1** — agent-room manifest/state schema (`schemaVersion: 1`): runs / agents / tasks / events.jsonl / mailbox / locks under the git-common-dir shared state root (`.git/vaultman-room`).
- **tooling 1.0.0** — `agent-room` migrated to `.ts` (ADR 0001; Node 24 type-stripping, no build);
  `check-doc-health` gained lifecycle-state + stale-active checks (ADR 0002). Remaining `.mjs` tools migrate in S5.
- **memory lifecycle (ADR 0002)** — additive `lifecycle:` frontmatter field (active/deferred/triaged/blocked/superseded/archived) + health enforcement; `status:` stays the free-form doc-workflow field.

Landed across commits `d974af2` (S1) · `0baad20`…`a778f48` (S2) · `40405a9`/`8d5aad2` (S3a) on `sandbox`.
