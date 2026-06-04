---
title: PKM-AI Orchestration Upgrade — implementation plan
type: plan-index
status: active
parent: "[[docs/work/pkm-ai/specs/2026-06-04-orchestration-upgrade/index|orchestration-upgrade spec]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/plan
  - initiative/pkm-ai
---

# PKM-AI Orchestration Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Implement spec S1–S6 — mandate agent coordination + memory lifecycle + cheap retrieval + typed,
versioned tooling — so PKM-AI stops being an unstructured sandbox.

**Architecture:** docs/config changes (AGENTS.md mandate, coordination policy) + `.ts` tooling (agent-room,
check-doc-health, traverse-graph, query-docs) + local retrieval (transformers.js + Orama adapters). Per
PKM-AI ADRs [[docs/work/pkm-ai/adr/README|0001–0006]].

**Tech stack:** Node 24 (native `.ts` type-stripping) · agent-room (smoke ✓) · transformers.js · Orama.

---

## Sub-plans (each = independent, testable slice; full step-shards written at pickup)

| Slice | Shard | Deps | Status |
|---|---|---|---|
| S1 runtime-startup mandate | [[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/01-S1-runtime-startup|01-S1]] | — | **DONE** `d974af2` |
| S2 coordination conventions | [[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/02-S2-coordination|02-S2]] | S1 | **IN PROGRESS** (Task 0 ✓ `fce12fb`) |
| S3 memory lifecycle | 03-S3 (at pickup) | S1 | outlined ↓ |
| S4 versioning | 04-S4 (at pickup) | S1 | outlined ↓ |
| S5 `.ts` migration | 05-S5 (at pickup) | — | outlined ↓ |
| S6 retrieval channel | 06-S6 (at pickup) | S3 | outlined ↓ |

**Critical path:** S1 → S2/S3 → S6. S4 + S5 parallel anytime.

## Slice outlines (plan-level; promote to full step-shard before executing each)

**S2 coordination conventions** (ADR 0003) — Files: create `docs/architecture/policies/coordination.md`;
modify `AGENTS.md` (link it); modify agent-room (add `--state-root` resolution via `git rev-parse
--git-common-dir` for the **cross-stream shared room** + atomic `ensure-run` join-or-create + `stream`/
`worktree` agent tags). Steps: document poll-at-turn-boundary, `dependsOn` usage, scope-claim before shared
edits, own-session-shard rule, mailbox `--body`; implement shared-state-root + ensure-run. Verify:
**cross-worktree** 2-agent live run (agents in different worktrees land in ONE room; B `dependsOn` A; B polls;
no double-room on simultaneous start). Acceptance: spec S2.

**S3 memory lifecycle** (ADR 0002) — Files: modify `docs/architecture/policies/docs.md` (lifecycle states);
modify `.agents/tools/pkm-ai/check-doc-health.mjs` (stale-active + lifecycle-state checks); prune pass over
current/. Steps (TDD on the health check): test → add `lifecycle` validation + stale-active flag → pass.
Verify: `node check-doc-health` flags violations; status/handoff hold only `active`; 121-FAIL backlog → 0.
Acceptance: spec S3.

**S4 versioning** (ADR 0005) — Files: create `.agents/pkm-ai.version.json` + `docs/work/pkm-ai/CHANGELOG.md`;
modify AGENTS.md step 0 (read version). Steps: write version.json (semver fields) → CHANGELOG v1 → startup
reads + major-bump re-read rule. Verify: startup reads version; CHANGELOG present. Acceptance: spec S4.

**S5 `.ts` migration** (ADR 0001) — Files: create `.agents/tools/pkm-ai/tsconfig.json`; modify
`package.json` (`engines.node>=22.18`, lint erasable-only); rename `agent-room.mjs`→`.ts` (then manage-tasks,
check-doc-health, split-shard, update-frontmatter, rest). Steps (per script): baseline-capture output → rename
+ add erasable types → `node x.ts` parity check → commit. Verify: `node x.ts` output == `.mjs` baseline; lint
erasable-only passes. Acceptance: spec S5.

**S6 retrieval channel** (ADR 0006) — Files: rewrite `.agents/tools/pkm-ai/traverse-graph.mjs` (wikilink→edge
graph); modify `query-docs.mjs` (BM25, lifecycle-weighted); create `.agents/tools/pkm-ai/retrieval/`
(`EmbeddingProvider` + `VectorStore` adapters; default transformers.js+Orama; embed-on-change). Steps (TDD):
graph-parse test → BM25 test → adapter contract test → local-embed smoke → hybrid query. Verify:
`query-docs <term>` lifecycle-ranked hybrid top-k; embeddings regenerate zero-network. Acceptance: spec S6.

## Issues (tracer-bullet; load into agent-room `task add` once S1/S2 land — dogfood ADR 0003)

- [x] **PKM-1** (S1): AGENTS.md runtime-startup mandate ✓ `d974af2`
- [ ] **PKM-2** (S2): `coordination.md` policy + agent-room wiring
- [ ] **PKM-3** (S3): lifecycle states + stale-active health check + working-surface filter + prune (clears P4)
- [ ] **PKM-4** (S4): `pkm-ai.version.json` + CHANGELOG + startup read
- [ ] **PKM-5** (S5): tsconfig + migrate agent-room→`.ts` (+ phased rest)
- [ ] **PKM-6** (S6): wikilink graph + BM25 + embedding/vector adapters (transformers.js + Orama)

## Verification (overall)
2-agent coordination smoke (S2) · `check-doc-health` green incl. lifecycle (S3) · `node x.ts` parity (S5) ·
fresh-agent cold-start obeys AGENTS.md 0–6 (S1) · hybrid `query-docs` returns lifecycle-ranked top-k (S6).

## Execution
Per slice, in critical-path order. AGENTS.md (S1) shown as a **diff before apply** (dev gate). Each slice:
promote its outline to a full step-shard → execute (subagent-driven or inline) → verify → commit → next.
