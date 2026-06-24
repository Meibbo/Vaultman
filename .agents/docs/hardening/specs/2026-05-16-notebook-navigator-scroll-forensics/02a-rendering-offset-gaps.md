---
title: Rendering And Offset Gaps
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/02-vaultman-gap-analysis|Vaultman Gap Analysis]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - vaultman
---

# Rendering And Offset Gaps

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

## Gap 5: Fallbacks Are Rendering Strategy, Not Last-Frame Retention

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

