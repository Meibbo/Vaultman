---
title: Acceptance Matrix
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/03-repro-and-acceptance|Repro And Acceptance Criteria]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T12:52:54-05:00
tags:
  - agent/spec
  - explorer/performance
  - plugin-dev
---

# Acceptance Matrix

## Acceptance Thresholds

For 50k rows in plugin-dev:

- no blank window over 100 ms;
- zero blank windows over 250 ms;
- max event-loop delay under 100 ms for normal list/tree;
- max event-loop delay under 150 ms for grid/cards/table until variable-height
  offset indexing is fully optimized;
- rendered row count bounded to visible rows plus overscan;
- no fallback may return all rows;
- direct jump from top to bottom must not process every intermediate row;
- repeated top/middle/bottom bursts must leave visible rows after each jump.

For 100k proof:

- same invariants, with thresholds allowed to be recorded separately before
  release gating;
- no all-row rendering;
- no O(total rows) fallback scan per jump.

## Required Unit/Component Tests

Fixed-height list/tree:

- `fallbackFixedVirtualRows()` returns bounded ranges for 50k and 100k.
- For bottom scrollTop, start index is near the bottom, not zero.
- Repeated jump simulation never returns zero rows while count > 0.

Cards:

- when TanStack virtual rows are empty, fallback returns bounded rows near
  current scrollTop;
- fallback does not call `cardRows.map(...)` over the full dataset;
- rowTop for a deep row is computed through offset index, not slice/reduce.

Grid:

- fallback visible range is found by offset index or binary search;
- a bottom jump over 50k rows does not loop through every prior row.

Table:

- row top lookup uses offset index/prefix data;
- fallback range starts near current scrollTop, not always at row 0;
- measured row changes update the offset index without full scroll-time scans.

Scroll intent queue:

- lower-priority pending scrolls are replaced by higher-priority ones;
- pending scroll waits for minimum projection revision;
- stale target is dropped when selected id changes;
- execution waits for visible non-zero scroll container rect.

Media:

- visible row text paints when media descriptor exists but blob/image is not
  loaded;
- media placeholder height is stable;
- image/GIF load updates media content without full-list remeasure;
- repeated jump burst with media descriptors remains bounded.

## Definition Of NN-Level Scroll For Vaultman

Vaultman can be considered NN-level for this issue only when:

1. 50k row top/middle/bottom repeated jumps do not blank the viewport.
2. 50k rows with media descriptors do not blank the viewport.
3. Tree/list/table/grid/cards all keep rendered rows bounded.
4. No scroll path performs O(total rows) work per jump.
5. Scroll requests are coalesced and revision-gated.
6. Row labels/text remain paintable during scroll.
7. Unit/component tests and plugin-dev live probe pass.
8. `obsidian dev:errors vault=plugin-dev` reports no new errors after the live
   run.

## Immediate Next Plan

1. [x] Implement the burst-scroll blank detector first.
2. [x] Run it against the current code to capture the failing baseline.
3. [x] Fix cards all-row fallback.
4. [x] Add shared offset index for variable-height grid/cards/table.
5. [ ] Add scroll intent/revision queue where direct local effects still exist.
6. [x] Re-run the live plugin-dev burst probe.
7. [ ] Consider the scroll issue fixed only after the latency residuals and
   confirmed 50k/100k matrix are closed.

## 2026-05-16 Implementation Progress

Implementation record:
[[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]].

Live `plugin-dev` burst smoke now passes with zero blank frames and no dev
errors for Tree, List, Table, Grid, and Cards. This verifies the bounded
visible-row invariant for the current selectable modes. Residual event-loop
delay spikes remain, especially Table and Grid, so the next pass should target
remeasure/projection latency rather than the blank fallback path.
