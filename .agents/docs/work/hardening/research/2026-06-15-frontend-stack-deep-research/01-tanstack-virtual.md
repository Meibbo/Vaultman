---
title: 01 — TanStack Virtual deep dive + shared-runtime orchestration
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: opus-4-8
updated_by: opus-4-8
tags:
  - agent/research
  - explorer/virtualization
  - explorer/performance
---

# 01 — TanStack Virtual (`@tanstack/svelte-virtual` 3.13.24)

PRIORITY shard. Goal: understand the virtualizer well enough to orchestrate a SHARED render-runtime correctly — NOT to trust it blindly (the 1.1.0 beta.1 perf disaster is the cautionary tale). Confidence tags inline; `flag` items need upstream re-check before they gate code.

## 1. Core mechanics

- **Range computation.** From `scrollOffset` + viewport size, the Virtualizer finds the first/last item index whose pixel band intersects the viewport, then expands by `overscan` in both directions.
  - **Fixed height** = `O(1)` (offset ÷ itemHeight).
  - **Variable height** = `O(log n)` via a **Fenwick/binary-indexed-tree prefix sum**, NOT an O(n) scan.
    This is the single most important fact: the beta.1 bug was effectively O(total-rows) offset scans.
- **Total size.** Fixed: `count * estimateSize`. Variable: cumulative-sum query at `count` (Fenwick), updated incrementally as items measure.
- **Per-item offset.** Sum of sizes before index `i`; `O(log n)` with the Fenwick tree.
- **Measurement paths.**
  - Fixed mode (tree/list): all rows = `estimateSize`, zero measurement overhead.
  - Dynamic mode (table/grid/cards): each rendered row reports its real size via `measureElement` (ResizeObserver path); deltas patch the Fenwick tree. Measurements are **deferred/batched** to avoid synchronous layout thrash.
- **scrollToIndex / scrollToOffset.** Compute target pixel offset → apply `align: start|center|end` → call `scrollToFn(offset, {behavior})` → reconcile sub-pixel drift after measurement.
  **Gotcha:** not blocking. It schedules; if sizes change before it lands, you can scroll to the wrong place unless you coordinate with measurement.

## 2. Svelte 5 specifics

- `createVirtualizer<TScroll, TItem>({...})` returns a rune-backed store; read state via methods (`getVirtualItems()`, `getTotalSize()`, `scrollOffset`, `isScrolling`). Every read is reactive.
- **`untrack` + `setOptions` is mandatory.** Updating options inside an `$effect` without `untrack` creates an infinite loop (setOptions → effect re-runs → setOptions …). Pattern (verified in our views):
  ```ts
  $effect(() => {
    untrack(() => $rowVirtualizer.setOptions({ count, getScrollElement, getItemKey, estimateSize }));
  });
  const virtualRows = $derived($rowVirtualizer.getVirtualItems());
  ```
- **`getVirtualItems()` drives `{#each}` keyed by `virtualRow.key`.** `virtualRow` = `{index, key, start, size, end}`.
  Position rows with `start` (we use a CSS var, e.g. `--vm-tree-y: {start}px`). viewTree renders the row body via `{@render treeRow(flatArray[virtualRow.index], virtualRow.start, false)}`.
- **`getItemKey(index)` MUST be stable per logical item.** An unstable key makes Svelte remount the row (loses focus, inline-rename input, scroll). Our row ids (namespaced `file.`/`note.`/`tag.`) are the keys.
- **Mount/teardown.** `observeElementRect` returns a cleanup; pending RAF/ResizeObserver callbacks can fire after unmount → guard every callback against a null scroll element (our `serviceScroll.ts` RAF observer does this).

## 3. Failure modes (the beta.1 class) + how to avoid

| Failure | Cause | Avoid |
|---|---|---|
| Blank window on big jump | overscan not applied during programmatic scroll; gap between rendered band and viewport | overscan sized to viewport: `Math.ceil(viewportH / estimateSize)`, not a magic constant |
| O(n) jank | naive per-item offset = sum of all prior sizes on every query | Fenwick/BIT prefix sums (we have `serviceExplorerScrollGeometry.ts`) |
| Stale measurements | measure cache not invalidated on `count` shrink / data swap | clear/snapshot the cache when count drops or provider changes |
| Wrong total size flicker | `max(virtualizer.total, estimatedTotal)` fighting the authoritative total | trust virtualizer total once any item measured; estimate only as cold fallback |
| Dynamic-height thrash | every scroll fires `measureElement`, queue backlog | debounce measurement to idle (RAF + idle), batch tree updates |

**Detection gate (already in repo).** `src/dev/perfProbe.ts` runs burst scrolls to `[0,50,100,25,75]%` and asserts: `blankFrameCount===0 && blankWindowOver100ms===0 && blankWindowOver250ms===0 && (!strictFlicker || flickerFrameCount===0)`.
Signals: `blank` (no visible text), `viewportGapPx` (empty band), `eventLoopDelayMs` (thrash), `flickerRowCount` (rows gaining/losing children mid-scroll). **No perf claim is accepted without this detector** (prior multiview rule).

## 4. Orchestration — the shared virtual-layout service (= the V.D blueprint)

Problem: 5 views each call `createVirtualizer` with their own scroll element, measurement, fallback → duplication = today's perf debt (`viewTree` ~1051ms p99). Fix from prior multiview research, now operationalized:

**Wrap TanStack under ONE shared service.** Division of ownership:

- **TanStack owns:** scroll-event handling, RAF observation, ResizeObserver wiring, sub-pixel reconciliation during smooth scroll, momentum-scroll DOM-write deferral.
- **Shared service owns:** per-provider Fenwick geometry (warm across view switches), fixed/variable strategy selection, range fallback (total=0 → `count*estimate`), total-size confidence policy (use measured once
  >~10% measured), lanes (grid/cards columns), and the blank-frame detector hook.

Sketch (consolidates the 5 views; this is N1→N2 work, not N.R):
```ts
interface SharedVirtualLayoutService {
  fixedVisibleRange(in: {scrollTop; viewportH; rowHeight; rowCount; overscan}): {startIndex; endIndex};
  variableVisibleRange(in: {providerId; scrollTop; viewportH; rowCount; overscan}): {startIndex; endIndex; top; bottom};
  measure(providerId: string, index: number, size: number): void; // patches per-provider Fenwick
  scrollToIndex(providerId, index, align): {offset; align};
  snapshot(providerId): LayoutSnapshot;  restore(providerId, snap): void;
  detectBlankFrame(providerId, in: {scrollTop; viewportH; renderedRowCount; hasVisibleText}): boolean;
}
```
Measurement feeds the service WITHOUT thrash: row ResizeObserver → `virtualizer.measureElement(i, size)` AND `service.measure(providerId, i, size)` → a second view on the same provider reuses the warm Fenwick tree instead of re-measuring. pretext (shard 02) supplies the pre-paint height estimate so the first frame is close.

## 5. Our current geometry (verified in repo)

- `serviceExplorerScrollGeometry.ts` — Fenwick variable-height geometry (`add/prefix/lowerBound` style ops);
  used by ViewNodeGrid/Table/Cards (the variable-height engines). This is the embryo of the shared service.
- `serviceNodeRowMeasure.ts` / `serviceNodeCardLayout.ts` / `serviceNodeCardStyle.ts` / `serviceNodeRowStyle.ts` — pretext-fed row/card height measurement + style resolution.
- `serviceScroll.ts` — RAF element-rect observation (avoids ResizeObserver loops); `serviceTextMeasure.ts` — pretext wrapper with 3-tier cache. `src/dev/perfProbe.ts` — blank-frame burst smoke.
- View usage: tree/list = fixed-height + overscan (10 / 5); table/grid/cards = variable-height via the geometry service + measured row cache.

## 6. API cheat-sheet (verify `flag` before relying)

```ts
createVirtualizer({
  count, getScrollElement, getItemKey, estimateSize,        // core (verified in our views)
  overscan, observeElementRect, observeElementOffset, scrollToFn,
  initialRect, enabled, initialOffset,
  horizontal, lanes,                                        // masonry/grid (lanes = real)
  // flag: anchorTo / followOnAppend (end-anchored) — verify upstream before use
});
// methods: getVirtualItems(), getTotalSize(), scrollToIndex(i,{align,behavior}),
//          scrollToOffset(), measureElement(el|i,size), setOptions() [untrack!],
//          resizeItem(i,size), takeSnapshot()/initialMeasurementsCache [snapshot/restore]
```
Don't: call `getTotalSize()` in a tight loop on 100k unmeasured rows (cache in `$derived`); mutate `getVirtualItems()` output; batch synchronous `measureElement` in a loop; trust scroll position as exact mid-measurement.

## 7. Citations

- https://tanstack.com/virtual/latest/docs/framework/svelte/svelte-virtual (+ `.md` variant) — Svelte adapter.
- https://tanstack.com/virtual/latest/docs/api/virtualizer — options/methods/state.
- TanStack/virtual GitHub (virtual-core) — Fenwick + reconciliation internals.
- In-repo: viewTree/ViewNodeList/Grid/Table/Cards.svelte, serviceExplorerScrollGeometry.ts, serviceNodeRowMeasure.ts, serviceTextMeasure.ts, serviceScroll.ts, src/dev/perfProbe.ts.
- Prior: [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|multiview-virtualization]].
</content>
