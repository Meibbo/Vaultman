---
title: Vaultman Gap Analysis Against Notebook Navigator Scroll
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator Scroll Forensics]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - vaultman
---

# Vaultman Gap Analysis Against Notebook Navigator Scroll

## Current Vaultman Scroll Surfaces

Vaultman Explorer view components currently use `@tanstack/svelte-virtual`.

Observed constants:

- `viewTree.svelte`: `TREE_OVERSCAN = 10`, fixed row height, bounded fallback.
- `ViewNodeList.svelte`: `LIST_OVERSCAN = 5`, fixed row height, bounded fallback.
- `ViewNodeTable.svelte`: `TABLE_OVERSCAN = 14`, variable row heights.
- `ViewNodeGrid.svelte`: `GRID_OVERSCAN = 6`, variable row heights by grid row.
- `ViewNodeCards.svelte`: `CARD_OVERSCAN = 4`, variable row heights by card row.

The fixed-height list/tree fallback helper is good in isolation:

- `serviceScroll.fallbackFixedVirtualRows()` computes visible start from
  `scrollTop / rowHeight`.
- It returns only visible rows plus overscan.
- It is O(visible rows) for fixed heights.

The issue is that this pattern is not consistently applied across modes, and
the live repro is a repeated jump/render starvation problem, not a single
mathematical scrollTop problem.

## Gap 1: Cards Can Render Every Row When Virtual Rows Are Empty

`ViewNodeCards.svelte`:

```ts
const renderedRows = $derived.by(() => {
    const visibleRows = virtualRows
        .filter((row) => row.index < cardRows.length)
        .map((row) => ({ key: row.key, index: row.index, start: row.start }));
    if (visibleRows.length > 0 || cardRows.length === 0) return visibleRows;
    let start = CARD_GAP;
    return cardRows.map((row, index) => {
        const out = { key: row.key, index, start };
        start += row.height + CARD_GAP;
        return out;
    });
});
```

This is the exact class of fallback Notebook Navigator avoids. For a large
dataset, a transient empty virtualizer result can materialize all card rows.
That can block the main thread and produce a blank visible list while Svelte
reconciles a huge render set.

Required change:

- Cards fallback must become bounded by current scrollTop/viewport/overscan.
- It must never return `cardRows.map(...)` for large row counts.

## Gap 2: Grid Fallback Scans The Whole Row Set

`ViewNodeGrid.svelte` fallback:

- first loop scans from index 0 until it finds the first row whose bottom
  crosses `scrollTop`;
- second loop walks all rows while checking whether each is in the render
  window.

That makes the fallback O(total rows), even though it only returns visible rows.
Repeated jumps near the bottom of a 50k set repeatedly traverse almost the whole
array.

Notebook Navigator avoids this for fixed nav/list rows by direct index math.
For variable-height grid rows, Vaultman needs a prefix-sum/height-map strategy
or a bounded approximation that does not scan from zero on every fallback.

Required change:

- variable-height fallbacks must use a prefix offset model with binary search,
  or a fixed bucket approximation that is later corrected by TanStack.
- repeated jumps near the bottom must not walk every prior row.

## Gap 3: Cards Scroll-To-Row Uses O(n) Prefix Sum

`ViewNodeCards.svelte`:

```ts
const rowTop = cardRows
    .slice(0, rowIndex)
    .reduce((top, item) => top + item.height + CARD_GAP, CARD_GAP);
```

That is O(rowIndex) per reveal. It is not necessarily the direct cause of
manual scrollbar blanking, but it is the same anti-pattern that fails under
rapid repeated deep jumps.

Required change:

- use a prefix offset model for cards;
- compute row top in O(1) or O(log n);
- keep total height from the same offset model.

## Gap 4: Table Offset Calculation Is O(n)

`ViewNodeTable.svelte`:

```ts
function tableRowTopFromMap(measuredRows, rowIndex) {
    let top = 0;
    for (let index = 0; index < rowIndex; index += 1) {
        top += tableEstimateSizeFromMap(measuredRows, index);
    }
    return top;
}
```

The table fallback returns only top rows rather than all rows, but row-top
calculation is still O(rowIndex). Repeated reveal or deep measured-row
fallbacks can accumulate expensive work.

Required change:

- move table variable heights to a shared height-index/prefix-sum service;
- binary-search visible range from scrollTop;
- compute top offsets from prefix arrays.

## Gap 5: Fallbacks Are Treated As Rendering Strategy, Not Last-Frame Retention

Notebook Navigator does not devirtualize when virtual rows are empty. Vaultman
uses fallbacks to hide TanStack readiness gaps. A bounded fallback is acceptable
as an emergency guard, but the invariant should be:

- keep the last non-empty visible range while the new virtualizer range is not
  ready, or
- compute a bounded range from scrollTop without scanning total rows.

What must not happen:

- return zero visible rows for a visible non-empty viewport;
- return all rows;
- run O(total rows) work during the scroll event.

The current blank-list symptom after many jumps is consistent with a starvation
window where scroll events queue state changes faster than visible rows can be
computed/reconciled.

## Gap 6: Scroll Intents Are Not Centralized Like NN

Vaultman has targeted one-shot guards such as consumed scroll target serials,
and some direct `scrollToIndex(... behavior: 'auto')` calls. That is an
improvement over repeated reactive scrolls, but it is not Notebook Navigator's
full model.

Missing or incomplete compared with NN:

- central pending-scroll queue per surface;
- typed scroll reasons/intents;
- priority/coalescing;
- explicit index/revision gate;
- late target resolution after the current projection/rebuild version;
- stale pending rejection when selected target changes.

Vaultman has pieces of this in `serviceExplorerScrollGeometry` and projection
revision data, but the view components still perform local direct effects.

Required change:

- introduce one Explorer scroll coordinator contract used by tree/list/table/
  grid/cards;
- requests carry target id/path, reason, align, and minimum projection revision;
- execution happens only after the view has non-zero viewport rect and the
  projection/revision is current;
- lower priority pending scrolls are replaced by newer/higher priority ones.

## Gap 7: Current UI Suppression Is Broader Than NN

Recent Vaultman changes hide icons/badges/actions while scrolling:

- `viewTree.svelte` hides direct badges, child badges, hover badges, and row
  icons.
- `ViewNodeList.svelte` hides row icon, badges, and actions.

Notebook Navigator suppresses hover/quick action churn while scrolling. It does
not suppress core row content or row identity. Hiding non-essential adornments
may reduce work, but it is not the main NN trick and can make a starvation window
look worse if text/content paint is delayed elsewhere.

Required change:

- keep labels/text always paintable;
- suppress hover/action panels first;
- defer expensive icon/media hydration through memo/cache, not by making rows
  visually empty.

## Gap 8: Media Cache Semantics Are Not NN-Equivalent Yet

Notebook Navigator separates:

- synchronous row-height metadata in memory;
- preview text LRU;
- feature image blob LRU;
- async object URL creation after row mount.

Vaultman has media descriptor/cache work (`serviceExplorerMediaCache` and
synthetic media descriptors), but the scroll acceptance test currently does not
prove that:

- media metadata is available synchronously for row sizing;
- blob/image loading never blocks first text paint;
- visible rows can paint without media;
- repeated jumps with media descriptors stay bounded.

Required change:

- define the Explorer media row contract explicitly:
  - metadata can affect reserved size;
  - blob/content load cannot block row text;
  - unloaded media displays a stable placeholder;
  - image/GIF load may update content but must not trigger full-list remeasure.
- add tests for hidden media cost and visible media subscribe cost that include
  repeated scroll jumps, not only descriptor build timing.

## Gap 9: Existing NN Bridge Test Is Too Abstract

`test/unit/performance/explorerNotebookNavigatorComparison.test.ts` imports
Notebook Navigator builders and compares:

- list builder timing;
- tree builder timing;
- map lookup timing;
- a synthetic direct fixed-height scroll bridge.

This is useful but not sufficient for the live bug:

- it does not mount the Svelte Explorer views;
- it does not observe whether the viewport becomes blank;
- it does not run in Obsidian/plugin-dev;
- it models fixed-height fallback math, not cards/grid/table variable-height
  fallbacks;
- it repeats jumps in a tight CPU loop, not through actual scroll events and DOM
  paint;
- it does not assert long-frame thresholds after every jump.

The prior perfProbe bug also matters: the earlier `waitFrames()` style could
underreport by racing `requestAnimationFrame` with a timeout. The current
`setTimeout(0)` loop is better for event-loop delay, but the live scenario still
needs viewport content assertions.

Required change:

- keep the unit bridge, but treat it as a math/build benchmark only;
- add a plugin-dev DOM probe for repeated jump bursts and blank-frame detection;
- compare against NN's invariants, not just median CPU time.

## Ranked Root-Cause Hypotheses For The Current Blank Window

1. **High probability:** one or more fallback paths renders too much or scans too
   much after repeated jumps, starving Svelte/TanStack updates and leaving the
   viewport without painted rows.
2. **High probability:** repeated scroll events execute intermediate work rather
   than coalescing to the final intent. This matches the user-observed "as if it
   tried to load all intermediate steps" behavior.
3. **Medium probability:** current scroll-time suppression hides enough row
   adornment to amplify blank perception while row text is delayed by another
   bottleneck.
4. **Medium probability:** live plugin-dev still has a measurement blind spot:
   the perf probe can report one final jump as acceptable while burst scrolling
   creates blank frames between jumps.
5. **Lower probability but must test:** Obsidian itself was left busy by a prior
   long eval run; plugin-dev should be restarted before taking final timings.

## Implementation Direction Implied By The Gaps

The next implementation plan should be ordered:

1. Add the plugin-dev burst-scroll blank detector first.
2. Make all fallbacks bounded.
3. Add shared variable-height offset indexing for cards/grid/table.
4. Add centralized scroll intent queue/revision gate.
5. Restore or narrow scroll-time suppression so row identity is always visible.
6. Re-run live plugin-dev and unit bridge comparison before accepting.

