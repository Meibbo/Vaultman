---
title: PKM-AI CHANGELOG
type: changelog
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-05T00:00:00
updated: 2026-06-05T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/pkm-ai
---

# PKM-AI CHANGELOG

Versions the PKM-AI **system** (agent protocol + state schema + `.agents/tools/` tooling), surfaced in
[`.agents/pkm-ai.version.json`](../../../pkm-ai.version.json) and read at Runtime Startup step 0 (ADR 0004).
Bump rule (ADR [[docs/work/pkm-ai/adr/0005-pkm-ai-versioning|0005]]): **MAJOR** = breaking protocol/schema
change → agents MUST re-read the protocol docs before acting; **MINOR** = additive; **PATCH** = fixes.
Doubles as the "new-since" delta surface for fresh agents. Newest at top.

## Unreleased

- **S3b** — recurring prune of the doc-health backlog (123 fails: line-limit/timestamp/parent) once a
  coordinated window opens (most fails are in another stream's contended docs).
- **S5** — phased `.ts` migration of the remaining `.mjs` tools (manage-tasks, check-doc-health,
  split-shard, update-frontmatter, …) → will bump `toolingVersion`.
- **S6** — local tri-layer retrieval (wikilink graph + BM25 + pluggable local embeddings) → likely a
  MINOR protocol bump (lifecycle-weighted ranking).

## 1.0.0 — 2026-06-05

First formally versioned PKM-AI contract — the protocol is now mandated and coordinated, not optional.

- **protocol 1.0.0** — mandatory Runtime Startup sequence (ADR 0004; `AGENTS.md`) + cross-stream
  shared-brain coordination (ADR 0003; [[docs/architecture/policies/coordination|coordination.md]]):
  presence (join + heartbeat + leave), `ensureRun` one-room-per-project across worktrees, scope-claim
  before shared edits, `task --depends-on` (poll-based), mailbox, poll-at-turn-boundary, stream/worktree tags.
- **stateSchema 1** — agent-room manifest/state schema (`schemaVersion: 1`): runs / agents / tasks /
  events.jsonl / mailbox / locks under the git-common-dir shared state root (`.git/vaultman-room`).
- **tooling 1.0.0** — `agent-room` migrated to `.ts` (ADR 0001; Node 24 type-stripping, no build);
  `check-doc-health` gained lifecycle-state + stale-active checks (ADR 0002). Remaining `.mjs` tools migrate in S5.
- **memory lifecycle (ADR 0002)** — additive `lifecycle:` frontmatter field
  (active/deferred/triaged/blocked/superseded/archived) + health enforcement; `status:` stays the
  free-form doc-workflow field.

Landed across commits `d974af2` (S1) · `0baad20`…`a778f48` (S2) · `40405a9`/`8d5aad2` (S3a) on `sandbox`.
