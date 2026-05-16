---
title: Repro And Acceptance Criteria
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator Scroll Forensics]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - plugin-dev
---

# Repro And Acceptance Criteria

## Non-Negotiable Test Environment

Use `plugin-dev` explicitly for Obsidian CLI commands.

Do not open or target the personal `vaultman` vault for this work.

Allowed shape:

```powershell
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian dev:errors vault=plugin-dev
obsidian eval code="<specific code>" vault=plugin-dev
```

If Obsidian CLI eval latency is already tens of seconds before the scroll test,
restart or reload plugin-dev before recording results. A slow control eval is a
bad measurement baseline.

## Required Repro: Repeated Jump Burst With Blank Detection

The current perfProbe scenarios are single-action final-state probes. The bug is
reported after many jumps. The live repro must model a burst.

Required sequence:

1. Load Explorer in plugin-dev with 50k visible rows.
2. Ensure the target scroller is visible and has non-zero width/height.
3. Record initial visible row count and first/last visible row labels.
4. Execute a deterministic burst of large jumps:
   - top;
   - 50%;
   - bottom;
   - 25%;
   - 75%;
   - repeat at least 100 times, preferably 1,000 for the stress run.
5. After each jump, observe the next animation frame and the next timeout tick.
6. Record:
   - visible row count;
   - blank frame count;
   - max blank duration;
   - max event-loop delay;
   - max time until first visible row after a jump;
   - rendered row count;
   - scrollTop;
   - total scrollHeight;
   - current view mode.

Blank means:

- row count is zero while dataset count is non-zero and scroller rect is visible;
- or row text content is absent for the virtual viewport while skeleton/loading
  is not expected;
- or `getVirtualItems()`/fallback returns rows but DOM row text is not painted.

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

Add or update tests that prove invariants, not just timing.

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

## Required Live Commands

Build and reload:

```powershell
pnpm run build
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian dev:errors vault=plugin-dev
```

Unit/component suite after implementation:

```powershell
pnpm check
pnpm exec vitest run --project unit test/unit/performance/explorerNotebookNavigatorComparison.test.ts
pnpm exec vitest run --project unit test/unit/services/serviceScroll.test.ts
pnpm exec vitest run --project component test/component/viewTreeScrollFallback.test.ts
```

The final suite must include new tests for cards/grid/table fallbacks and the
plugin-dev burst-scroll probe. The exact test filenames should be chosen during
implementation, but they must be named clearly enough that future agents do not
mistake a pure CPU bridge for the live scroll acceptance test.

## Notebook Navigator Comparison Standard

Do not accept "Vaultman is faster" from one median CPU bridge alone.

Acceptance requires both:

- Vaultman does no more work than NN on comparable scroll math/build paths; and
- Vaultman has no visible blank window under the live plugin-dev burst-scroll
  repro.

The bridge should keep importing NN source where useful:

- `buildListItems`;
- `buildFilePathToIndexMap`;
- `flattenFolderTree`;
- `listPaneMeasurements` invariants if we add equivalent measurement contracts.

But the bridge must not pretend to test what it does not mount. Its label should
say builder/math bridge, not final scroll parity.

## Definition Of "NN-Level Scroll" For Vaultman

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

1. Implement the burst-scroll blank detector first.
2. Run it against the current code to capture the failing baseline.
3. Fix cards all-row fallback.
4. Add shared offset index for variable-height grid/cards/table.
5. Add scroll intent/revision queue where direct local effects still exist.
6. Re-run the live plugin-dev burst probe.
7. Only then consider the scroll issue fixed.

