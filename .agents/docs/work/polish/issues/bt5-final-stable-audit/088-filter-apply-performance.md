---
title: BT5-088 — Filter apply performance
type: issue
status: in-progress
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-23T01:30:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: e1097b66
tags: [agent/issue, triage/in-progress, initiative/polish, release/1.2.1, performance, filters]
---

# BT5-088 — Filter apply performance

## Symptom

Adding a narrowing filter feels fast; removing a filter or adding an exclusion feels slow, even though a filter is a filter. The cost is not the evaluation (it scans the whole vault either way) but the work whose size follows the result — largest exactly when removing or excluding.

## Plan

- [x] **P2** — run the per-file pipeline once over the vault and derive the markdown result as a subset, instead of evaluating twice. (`e1097b66`)
- [x] **Linear order** — sort the whole vault into basename order once and filter that order per apply, instead of re-sorting the subset with the collator every time. (`e1097b66`)
- [ ] **P3 — differential render** *(deferred to 1.2.1)*. The remaining and dominant cost is the full Files rebuild + decoration on every apply. The fix is to touch only the rows that entered/left the set. It first requires separating position-independent decoration (icons, times, name) from the passes that depend on order (rainbow bucket, bubble dots, queue index); a per-node cache without that split would paint stale rainbow colours. P4 (memoize decoration by signature) folds into this same split.
- [ ] **P1 — debounce** *(dropped)*. Callers and tests read `filteredFiles` synchronously right after mutating, so deferring the apply serves stale results. Not pursued.

## Acceptance criteria

- [x] One evaluation pass per apply; markdown derived from vault.
- [x] Output order is unchanged (a subset of a basename sort stays sorted).
- [ ] Applying/removing a filter over a large vault does not stall the UI (requires P3).

## Outcome

P2 and the linear order shipped in `e1097b66` but are marginal on their own;
the dev confirmed the felt improvement depends on P3. The slice is retagged `release/1.2.1` and the differential render is tracked in [[../v1-2-1-polish/index|the 1.2.1 backlog]].
