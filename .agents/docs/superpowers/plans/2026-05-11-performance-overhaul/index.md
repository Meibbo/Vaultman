# Vaultman Explorer Performance Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the File Explorer performance gap versus Obsidian Core Explorer by eliminating per-row event churn, moving search work to normalized indices, preserving per-id selection reactivity, using GPU-safe virtual row positioning, and supporting dynamic row geometry without DOM reflow.

**Architecture:** Keep TanStack Virtual as the owner of visible window math and total spacer height. Move hot-path work out of row/tile instances: one delegated event surface per view, precomputed index search buffers, reactive per-id selection lookups, compositor-only virtual row movement, and Pretext-backed memory measurement for variable heights.

**Tech Stack:** Svelte 5 runes, `svelte/reactivity`, TanStack Virtual, SCSS, Vitest component/unit tests, existing `PerfMeter`.

---

## Source Specs

- [[01-event-delegation|Phase 1 - Event Delegation]]
- [[02-data-normalization|Phase 2 - Data Normalization And Search Buffers]]
- [[03-granular-selection|Phase 3 - Granular Selection Reactivity]]
- [[04-gpu-positioning|Phase 4 - GPU Positioning]]
- [[05-dynamic-geometry|Phase 5 - Dynamic Geometry With Pretext]]
- [[06-implementation-log|Implementation Log]]

## Implementation Status

Completed 2026-05-11T01:12:30. Source verification record:
[[06-implementation-log|Performance Overhaul Implementation Log]].

## Current Findings

- `src/components/views/ViewNodeTable.svelte` has per-row `onclick`, `onauxclick`, `oncontextmenu`, `onkeydown` at the virtual row block and computes `selectedIds.has(id)` from a parent-created `Set`.
- `src/components/views/ViewNodeGrid.svelte` has per-tile `onclick`, `onauxclick`, `oncontextmenu`, `onkeydown`; drag/toggle/badge handlers are specialized and should remain local unless tested separately.
- `src/services/serviceExplorer.svelte.ts` lowercases the query and every node label inside `applyFilter()`. It is currently unused by the live `panelExplorer` route, so tests must protect its contract while provider/index work wires the same data shape into File Explorer.
- `src/components/containers/panelExplorer.svelte` snapshots `selectionService.snapshot(provider.id)` into `selectedNodeIds = new Set(...)`; this defeats the internal `SvelteSet` granularity and invalidates all visible table/grid rows.
- `src/styles/data/_table.scss` uses `transform: translateY(...)` but lacks `top: 0` and `will-change`. `src/styles/data/_grid.scss` already has `top: 0` and `will-change`, but still uses 2D translate.
- `src/services/serviceTextMeasure.ts` already wraps `@chenglou/pretext`; Phase 5 must reuse that service and must not import Pretext directly into Svelte view components.

## Cross-Phase Guardrails

- Do not change logical selection semantics, keyboard behavior, context menu scope, badge actions, manual DnD, or TanStack Virtual item keys.
- Do not commit unless explicitly asked; this repo policy overrides generic plan templates.
- Add `PerfMeter` labels before each implementation phase, keep the same labels after the phase, and compare `durationMs` in Ops Log or test subscribers.
- Use focused tests first, then `pnpm run check`, then `pnpm run build`. Run Vite/Svelte commands sequentially because the current handoff notes a transient combined resolver issue.

## Phase Order

1. **Event delegation:** remove virtual row/tile event listener churn while preserving mouse gesture routing and explicit control handlers.
2. **Data normalization:** extend `INodeIndex` with `flatIds` and `getSearchBuffer()`, then rewrite `ExplorerService` and file-provider filtering to consume those buffers.
3. **Granular selection:** expose a per-id reactive selection map and make table/grid rows read `selectedMap.get(id)` instead of a cloned `Set`.
4. **GPU positioning:** keep TanStack Virtual's spacer/absolute-positioning contract and switch row offsets to `translate3d`.
5. **Dynamic geometry:** feed Pretext-backed row heights into TanStack Virtual estimate callbacks and remeasure on column/tile width changes without remounting row components.

## Required Hot Files

- `src/components/views/ViewNodeTable.svelte`: Phases 1, 3, 4, 5.
- `src/components/views/ViewNodeGrid.svelte`: Phases 1, 3, 4, 5.
- `src/services/serviceExplorer.svelte.ts`: Phase 2.
- `src/services/serviceTextMeasure.ts`: Phase 5 dependency; extend only if the measurement interface cannot expose required style/cache hooks.

## Definition Of Done

- File Explorer table and grid scroll at 60 fps over 10,000+ nodes with normal labels.
- Variable height rows rendering at 60fps during column resizing.
- Multiline labels, including adopted header-like labels, do not clip and do not jump during fast scroll.
- No direct DOM height reads (`offsetHeight`, `clientHeight`, `getBoundingClientRect`) are introduced into scroll-time row measurement.

## Final Validation Matrix

- Phase 1: compare `explorer.table.delegate.*` and `explorer.grid.delegate.*`; target p95 under 1 ms per event in Ops Log.
- Phase 2: compare `explorer.service.filteredIds`, `explorer.files.filterFlat`, and `filter:eval`; target 10,000-file name search under 5 ms locally, CI threshold no worse than the current `stress.test.ts` budget until live metrics justify tightening.
- Phase 3: compare `explorer.selection.*`; target single-id selection under 2 ms and no broad table/grid remount in component tests.
- Phase 4: compare `explorer.table.scrollIntoView`, `explorer.grid.scrollIntoView`, and manual Obsidian scroll recording; target no `top`-driven layout movement and 60 fps over a generated 10,000-file vault.
- Phase 5: compare `explorer.table.measureRows`, `explorer.grid.measureRows`, `explorer.table.resizeRemeasure`, and `explorer.grid.resizeRemeasure`; target memory-only remeasurement under 8 ms for the visible window plus overscan.
- Live smoke after all phases: build, copy plugin into the active Obsidian vault, open Files tab in table and grid modes, search for a deep filename, select one file, range-select 100 files, fast-scroll from top to bottom, resize columns/tiles while multiline adopted-header labels are visible, and inspect Ops Log for the labels above.
