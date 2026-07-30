---
title: PKM-AI 0002 — Memory lifecycle states + pruning
type: adr
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/adr/README|pkm-ai adr]]"
created: 2026-06-04T00:00:00
updated: 2026-06-05T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/adr
  - initiative/pkm-ai
---

# PKM-AI 0002 — Memory Lifecycle States + Pruning

**Decision status:** Accepted (dev-directed 2026-06-04). **Date:** 2026-06-04.

## Context

Short-term memory (status / handoff / session-log / items / backlog) accumulates without a lifecycle.
Entries don't carry state, so deferred/triaged/superseded material stays in working memory and competes with live material → the "sandbox accumulation" the dev flagged. Evidence: the 2026-06-03 audit (121 health FAILs, status/handoff bloat, stale S-count). Better retrieval alone won't fix this — accumulation needs curation discipline.

## Decision

Every memory entry carries an explicit **lifecycle state**, and the system enforces transitions + pruning.

- **States:** `active` · `deferred` · `triaged` · `blocked` · `superseded` · `archived`, recorded in a dedicated frontmatter **`lifecycle:`** field. **Amended 2026-06-05 (ground truth):** the corpus has 818 docs using ~23 free-form `status` values (draft/active/done/completed/…), so lifecycle gets its OWN additive field rather than overloading `status` (which stays the free-form doc-workflow field). Enforced by `check-doc-health.mjs`: an invalid `lifecycle:` value = FAIL; `lifecycle:active` untouched past `--stale-active-days` (default 30) = WARN. Opt-in — absent `lifecycle:` is not flagged, so adoption is incremental.
- **Working-surface rule:** `status.md` / `handoff.md` / session-log surfaces show ONLY `active` items (+ compact pointers to the rest). Deferred/triaged/blocked live in their initiative source record + the registry, surfaced on QUERY, not inlined into active surfaces.
- **Supersede/archive:** `superseded`/`archived` → moved out via `archive-active-doc.mjs` (archive-FIRST, docs policy) and linked, never deleted.
- **Pruning cadence:** the P4 cleanup becomes **recurring** — a curation pass demotes stale `active` → `superseded`/`archived`; `check-doc-health.mjs` gains a **stale-active** check (active entries untouched past N days flagged for review).
- **Retrieval coupling:** rank/rerank weights state (`active` > `deferred` > `superseded`) so queries surface live material first (ties PKM-AI 0003 + the retrieval channel).

## Consequences

- Working memory stays lean + relevant → cheaper cold-start, less agent reading, no noise pile-up.
- Formalizes what partially exists (`status` frontmatter, `archive-active-doc.mjs`) into an enforced rule.
- Cost: a curation cadence + a health rule + author discipline to set/transition states.

## Alternatives considered

- **Status quo:** unbounded accumulation (the current failure).
- **Manual cleanup only:** doesn't scale; depends on someone remembering.
- **Delete instead of archive:** loses history — violates archive-first (706-file-deletion risk).
