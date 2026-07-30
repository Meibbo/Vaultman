---
title: Vaultman recommendation
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/research
  - explorer/performance
  - explorer/implementation
---

# Vaultman Recommendation

## Decision

Do not perform a wholesale virtualizer migration now. The strongest route is:

1. harden the current TanStack Virtual adapters;
2. extract a shared layout/index service that makes view geometry cheap and deterministic;
3. add the live blank-frame detector and make it the acceptance gate;
4. run a bounded `virtua` spike only after the harness exists;
5. defer canvas/data-grid rendering to a future table-specific experiment.

This is the only route that addresses the user's actual symptom: repeated large jumps leaving the list blank for seconds. A library swap can still leave that bug intact if the app feeds it stale ranges, O(n) offsets, unstable heights, or hidden media work.

## Immediate Implementation Order

### Phase 0 - Measurement Gate

- Add the `plugin-dev` burst-scroll blank detector from the forensics spec.
- Record current failure against tree/list/table/grid/cards where available.
- Metrics must include blank windows over 100 ms, blank windows over 250 ms, max event-loop delay, rendered row count, target row text visibility, and total elapsed time.
- Run with explicit `vault=plugin-dev`.

### Phase 1 - Current Adapter Repair

- Remove all all-row fallbacks.
- Replace variable-height O(n) offset loops with a prefix/Fenwick layout index.
- Make fallback virtual rows come from `visibleRange(scrollTop, viewport)`.
- Keep last valid visible rows for one frame when the virtualizer briefly returns none during a jump.
- Ensure row text and identity paint even when media/decorations are deferred.
- Add unit tests that prove deep bottom jumps do not scan from row 0.

### Phase 2 - TanStack Knob Audit

Audit current adapters against TanStack primitives before considering replacement:

- `getItemKey` must be stable and row-composition-aware;
- `estimateSize` must be deterministic and CSS/token synced;
- `measureElement`/`resizeItem` must not fight for the same item indexes;
- `rangeExtractor` should cover sticky or pinned rows explicitly;
- `lanes` should be used only where the view model really maps to lanes;
- `shouldAdjustScrollPositionOnItemSizeChange` should preserve anchor stability when measured size differs from estimate;
- `isScrollingResetDelay`/native `scrollend` should govern reduced row internals, not row identity.

### Phase 3 - `virtua` Spike

Only after Phase 0 and Phase 1:

- build a separate adapter behind a dev flag for one fixed-height view and one variable-height view;
- run the same 50k/100k burst-scroll harness;
- compare blank windows, event-loop delay, mount count, jump latency, and memory;
- reject if it fails browser-pixel-limit behavior, Obsidian interaction semantics, Svelte integration stability, or row identity guarantees.

`virtua` should win by evidence, not by reputation.

### Phase 4 - Complex View Strategy

- Tree/list remain DOM virtualized.
- Grid/cards remain DOM virtualized with row/card layout indexing and media budgets.
- Table may later get a dense canvas/data-grid mode if rows/columns become too large for DOM cells, but that should be a named table variant, not the default Explorer renderer.
- Map/infinite canvas remains separate from linear scroll virtualization.

## Better-Than-NN Acceptance

Vaultman beats Notebook Navigator for this area only when:

- 50k top/middle/bottom burst jumps never blank for over 100 ms;
- no 250 ms blank window occurs;
- 100k proof runs preserve bounded DOM and no all-row fallback;
- list/tree/table/grid/cards all share the same blank-frame contract;
- future media descriptors do not block row identity/text paint;
- variable-height views use O(log n) or O(1) offset lookup;
- total spacer height has a browser-limit policy;
- candidate library spikes are compared with the same harness.

## What Not To Do

- Do not tune overscan as the first fix.
- Do not add IndexedDB for scroll performance unless a measurement proves startup/projection rebuild is dominant after in-memory layout is fixed.
- Do not hide the row shell during scroll; only defer expensive internals.
- Do not accept CPU-only projection bridge tests as scroll parity.
- Do not ship a candidate virtualizer without plugin-dev visual/DOM evidence.
