# Vaultman — Performance Libraries Research

Domain: virtualization / table / drag-and-drop / mindmap-graph / reactivity.
Date: 2026-05-14. Worktree read: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`.

Legend: **[measured]** = read directly from repo files or vendor release pages. **[inference]** = my judgement.

---

## 1. Inventory table

| Library | Version (package.json) | Category | Where used | Maintained (May 2026)? |
|---|---|---|---|---|
| `@tanstack/svelte-virtual` | `3.13.24` (devDependencies) | List/grid virtualization | `viewTree.svelte`, `ViewNodeTable.svelte`, `ViewNodeGrid.svelte`, `ViewNodeCards.svelte`; types re-used in `serviceScroll.ts` | **Yes** — npm shows publishes within the last day; v3.13.x active **[measured]** |
| `@tanstack/table-core` | `8.21.3` (devDependencies) | Table model (sort/select/column defs) | `serviceViewTableAdapter.ts` (column defs, sorting, row-selection); `ViewNodeTable.svelte` imports `SortingState` | **Yes** — v8 maintained; v9 in alpha (`9.0.0-alpha.45`, 2026-05-08) **[measured]** |
| `@dnd-kit/svelte` | `^0.4.0` → resolves to **`0.4.0`** | Drag-and-drop | `serviceDndSvelteAdapter.ts` (draggable/droppable inputs, provider handlers) | **Yes — Svelte-5-native.** Lockfile: `@dnd-kit/svelte@0.4.0`, `peerDependencies: svelte ^5.29.0`; whole `@dnd-kit/*` family (abstract/dom/collision/geometry/state) all at 0.4.0 **[measured: pnpm-lock.yaml]** |
| custom `serviceVirtualizer.svelte.ts` | n/a (in-repo) | Virtualization (runes-native) | `viewList.svelte`, `viewGrid.svelte` — `Virtualizer` / `TreeVirtualizer` classes | In-house; ~48 LOC **[measured]** |
| custom `serviceManualDnd.ts` / `serviceDnd.ts` | n/a (in-repo) | DnD core + manual fallback | `serviceManualDnd.ts` wraps `serviceDnd`; `applyManualNodeReorder` does hierarchical reorder | In-house **[measured]** |
| `ViewMarkmap.svelte` (custom) | n/a (in-repo) | "Mindmap" view | `panelExplorer.svelte` renders it for `viewMode === 'markmap'` | In-house — **NOT** the `markmap` npm library; pure CSS flex/branch/edge layout, no SVG/canvas engine **[measured]** |
| `bits-ui` | `^2.18.1` (dependencies) | Headless UI primitives (menus/popovers) | Toolbar/overlay components | Yes — actively maintained Svelte 5 lib **[inference]** |
| `unocss` / `@unocss/vite` | `^66.6.8` | Atomic CSS engine (build-time) | Styling pipeline | Yes **[inference]** |
| `@git-diff-view/svelte` | `^0.1.3` (dependencies) | Diff rendering | Diff/preview surfaces (not explorer-perf-critical) | Niche; low version **[inference]** |
| `@chenglou/pretext` | `^0.0.6` (dependencies) | **Text measurement/layout engine** | `serviceTextMeasure.ts` — `prepare`/`layout` wrapped as `pretextTextMeasureEngine` (default engine) | Pre-1.0 (`0.0.6`), single-author (chenglou). **Perf-relevant** — feeds row-height measurement **[measured]** |
| `svelte` | `^5.55.1` (devDependencies) | Framework / reactivity (runes) | Whole app — `.svelte.ts` services use `$state`/`$derived` | Yes — current **[measured]** |
| `type-fest` | `^4.41.0` | TS types only | Compile-time | Yes |

Notable: **no dedicated table-virtualization adapter, no `markmap`, no graph/flow library, no spreadsheet library** are installed. The explorer's 5 views are built on TanStack Virtual + TanStack table-core + hand-rolled code.

Key architecture fact **[measured]**: there are **two parallel virtualization implementations**:
1. `@tanstack/svelte-virtual` `createVirtualizer` — used by the 4 capital-letter `View*` components (`ViewNodeTable`, `ViewNodeGrid`, `ViewNodeCards`, `viewTree`). Supports dynamic measured row heights (`measuredTableRows` map, `estimateSize` from measurement), `getItemKey`, overscan.
2. custom `Virtualizer<T>` / `TreeVirtualizer` in `serviceVirtualizer.svelte.ts` — used by lowercase `viewList.svelte` / `viewGrid.svelte`. Fixed `rowHeight` (default 32), `$derived` window slice, overscan 5. ~48 LOC, fully runes-native.

This duplication is itself a finding (see levers).

---

## 2. Per-category comparison

### (a) List virtualization

**Current choice:** `@tanstack/svelte-virtual` 3.13.24 (4 views) + in-repo `TreeVirtualizer` (2 views).

**Alternatives (May 2026):**
- **`svelte-virtual-list` / `@sveltejs/svelte-virtual-list`** — classic, simple, fixed-height oriented; not actively pushed for Svelte 5 dynamic-height use. **[inference]**
- **`@tanstack/svelte-virtual` v3 (stay)** — actively published (npm: publish within ~1 day of 2026-05-14). Svelte 5: works, but issue TanStack/virtual#866 historically flagged Svelte-5 friction; the repo's `View*` components already wrap it successfully with `$effect` + `untrack`. **[measured: repo wraps it; issue exists]**
- **Keep custom `TreeVirtualizer`** — already runes-native, zero-dependency, trivially auditable. Downside: fixed row height only — no per-row measurement, so variable-height content previews can't use it.

**Evidence:** npm `@tanstack/svelte-virtual` 3.13.x, last publish ~hours before 2026-05-14; 8 dependents. TanStack/virtual#866 "Svelte 5 support". `serviceVirtualizer.svelte.ts` read directly.

**Verdict: KEEP `@tanstack/svelte-virtual`, but CONSOLIDATE.** TanStack Virtual is the best-in-class headless virtualizer and is maintained. The real problem is not the library — it is that Vaultman runs **two** virtualizers. The custom `TreeVirtualizer` cannot do measured heights, so any view needing variable-height rows (content previews) is forced onto TanStack anyway. Pick one. Recommended: standardize on `@tanstack/svelte-virtual` everywhere and delete the custom one, OR extend the custom one with measurement and drop TanStack — but only if bundle size is a hard constraint. Running both is churn-debt. **[inference]**

### (b) Table / spreadsheet rendering (cell selection + column resize + CSV-editor behavior)

**Current choice:** `@tanstack/table-core` 8.21.3 used **headlessly** via `serviceViewTableAdapter.ts` — it builds `ColumnDef`s, resolves `SortingState`, `RowSelectionState`. Row virtualization is layered separately via `@tanstack/svelte-virtual` in `ViewNodeTable.svelte`. Column resize is **hand-rolled** (CSS `grid-template-columns` with `minmax(minWidth, width|1fr)` built in `columnTemplate`, `tableLabelWidth`/`columnWidth` state) — `table-core`'s own column-sizing feature is **not** wired in. Cell selection: there is `RowSelectionState` (row-level), but no evidence of a true 2-D cell/range selection model.

**Alternatives (May 2026):**
- **`@tanstack/table-core` v9 (alpha)** — `9.0.0-alpha.45` (2026-05-08). New modular architecture, ~4KB base bundle vs 14-20KB, tree-shakes per feature, explicitly targets Svelte 5. Still alpha → not production-safe yet. **[measured]**
- **Glide Data Grid** — canvas-rendered spreadsheet, true cell/range selection, handles 100k+ rows; React-first, no Svelte adapter → would need a wrapper or canvas-in-Svelte glue. Heavy. **[inference]**
- **Stay headless + build the spreadsheet layer in-house** — what Vaultman already does. Maximum control, fits Obsidian theming, no framework-adapter risk.

**Evidence:** `serviceViewTableAdapter.ts` read in full (column defs, `functionalUpdate`, `rowSelectionFromSnapshot`). `ViewNodeTable.svelte` lines 120-180 read — confirms hand-rolled `columnTemplate` + separate virtualizer. TanStack Table V9 RFC + alpha.45 release 2026-05-08.

**Verdict: KEEP `@tanstack/table-core` v8 headless for now; do NOT chase v9 yet.** `table-core` is doing very little work here (sorting + row-selection state); it is not a perf bottleneck. The gaps are **feature gaps, not perf gaps**: (1) column resize is custom and divorced from `table-core` — fine, but consider adopting `table-core`'s `columnSizing` feature to delete custom code; (2) **there is no true cell/range selection** — a CSV-editor surface needs 2-D range selection, fill-handle, keyboard navigation; none of that comes from `table-core` and would have to be built or sourced regardless. Switching libraries does not solve this. Re-evaluate v9 once it hits beta/stable (smaller bundle is the only perf-relevant win, and bundle size barely matters in a bundled Electron plugin). **[inference]**

### (c) Drag-and-drop with hierarchical reordering

**Current choice:** `@dnd-kit/svelte ^0.4.0` (dependencies) bridged through `serviceDndSvelteAdapter.ts`, **plus** an in-repo DnD core (`serviceDnd.ts`) and a manual HTML5-drag fallback (`serviceManualDnd.ts`). Hierarchical reorder logic (`applyManualNodeReorder`: before/after/inside, multi-source move) is **hand-rolled** in `serviceManualDnd.ts`, not from any library.

**Version resolved [measured: pnpm-lock.yaml]:** `@dnd-kit/svelte@0.4.0` — the **official** dnd-kit Svelte package (the new `@dnd-kit/*` 0.4.x generation, not the legacy React-only line, and not the `@dnd-kit-svelte/svelte` community port). It declares `peerDependencies: svelte ^5.29.0`, i.e. it is Svelte-5-native by design. The whole family is aligned at 0.4.0 (`@dnd-kit/abstract`, `/dom`, `/collision`, `/geometry`, `/state`). Caveat: still 0.x — pre-1.0 API stability risk, and the earlier web result hinting at "0.1.6" suggests the package line is young / fast-moving. dnd-kit's own site lists a Svelte Quickstart, confirming first-class Svelte support.

**Alternatives (May 2026):**
- **`svelte-dnd-action`** (isaacHagoel) — mature, nested-container support, animations; Svelte 5 support was added "experimentally" (~v0.9.29). Battle-tested for list/tree reorder. **[measured: search]**
- **`@thisux/sveltednd`** — Svelte-5-native, runes-based, zero deps, explicitly supports nested containers/hierarchies. Young but purpose-built for Svelte 5. **[measured: search]**
- **`@dnd-kit-svelte/svelte`** (community port) — claims feature parity with React dnd-kit, adapted to Svelte reactivity. **[measured: search]**
- **Keep current hybrid** — `@dnd-kit/svelte` + in-repo core + manual fallback.

**Evidence:** `serviceDndSvelteAdapter.ts`, `serviceManualDnd.ts` read in full. GitHub: `isaacHagoel/svelte-dnd-action`, `thisuxhq/sveltednd`, `hanielu/dnd-kit-svelte`; dndkit.com Svelte Quickstart page exists.

**Verdict: KEEP `@dnd-kit/svelte` 0.4.0.** Version ambiguity resolved — it is the official, Svelte-5-native package (`peer svelte ^5.29.0`). For bulk operations the DnD library is **rarely the perf bottleneck** anyway: DnD acts on a small selection at a time; the cost is in the *post-drop reorder + re-render* of 1000+ nodes, which is Vaultman's own `applyManualNodeReorder` + virtualization, not the DnD lib. Only real watch-item: it is pre-1.0, so pin the version and expect occasional breaking changes — but switching to `svelte-dnd-action` (only "experimental" Svelte 5) or `@thisux/sveltednd` (younger) would not be an upgrade. Regardless of library, ensure drop triggers a *targeted* structural update, not a full re-flatten. The hand-rolled hierarchical reorder is reasonable to keep. **[inference]**

### (d) Mindmap / node-graph rendering

**Current choice:** custom `ViewMarkmap.svelte` — a recursive CSS layout (`.vm-markmap-branch` / `-children` / `-edge`, depth via `data-vm-markmap-depth`), **no virtualization, no SVG/canvas, no graph engine**. It renders the full node set (`markmapNodes = viewMode === 'markmap' ? nodes : []` in `panelExplorer.svelte`). For 1000+ nodes this mounts 1000+ DOM subtrees with pseudo-element edges.

**Alternatives (May 2026):**
- **`@xyflow/svelte` (Svelte Flow) 1.0** — released 2025-05-14, **full Svelte 5 rewrite, all stores converted to runes**, benchmarked/optimized by the xyflow team; canvas-style pan/zoom viewport with node culling (only visible nodes rendered). The strongest maintained option for node-based UIs in Svelte. **[measured]**
- **`markmap` (markmap-lib + markmap-view)** — purpose-built mindmap renderer, SVG-based, framework-agnostic; would drop into an Obsidian plugin (Obsidian's own community has markmap plugins). Not Svelte-specific but embeddable. **[inference]**
- **`Svelvet`** — Svelte node-UI library; less active than Svelte Flow. **[inference]**
- **Keep custom CSS view** — fine for small/medium trees, theme-native, zero deps.

**Evidence:** `ViewMarkmap.svelte` read in full (lines 1-200) — confirmed pure CSS, no engine. `panelExplorer.svelte` markmap wiring (lines 187, 1229-1235). xyflow blog "Svelte Flow 1.0 is here!" — Svelte 5 rewrite, runes, performance work.

**Verdict: SWITCH (or virtualize) — this is the weakest spot for scale.** A flat CSS recursion that mounts every node has no escape hatch at 1000+ nodes: no culling, no canvas, every operation indicator / selection change touches the whole tree. Two paths: (1) adopt **`@xyflow/svelte` 1.0** — it is Svelte-5-native, runes-based, viewport-culls offscreen nodes, and is actively maintained; best fit if the "mindmap" should be a real pannable graph; (2) if it must stay a lightweight outliner-style map, at minimum add viewport virtualization/culling so offscreen branches don't render. Either way the current implementation does not meet the "performant on 1000+ nodes" bar. **[inference]**

---

## 3. Biggest performance levers (ranked)

1. **Replace or virtualize the markmap view.** It is the only explorer view with **zero virtualization** — it mounts every node. Adopt `@xyflow/svelte` 1.0 (runes-native, culls offscreen nodes) or add viewport culling to the custom view. Highest ceiling-on-scale risk. **[inference]**
2. **Consolidate the two virtualizers into one.** `@tanstack/svelte-virtual` (measured heights) vs custom `TreeVirtualizer` (fixed height). Two code paths = double the surface for scroll/measurement bugs, and the custom one can't do variable-height content previews. Pick TanStack everywhere (recommended) or extend the custom one — but stop running both. **[inference]**
3. **Make bulk operations update per-node, not whole-tree.** With 1000+ nodes and "constant per-node visual changes" (operation badges, filtering, selection), the cost is re-deriving/re-flattening the whole node list on every change. Ensure selection, operation-indicator, and filter state are keyed per-node ($derived per row, or a Map indexed by id) so a 1000-node mutation touches 1000 cheap row updates — not one giant `$derived.by` over the whole array. The `perfProbe.ts` scenarios (`operation-badges`, `filter-select`, `tree-scroll`, `filters-search`) are the right things to measure here. **[inference]**
4. **Drop-time structural updates must be targeted.** Hierarchical reorder (`applyManualNodeReorder`) rebuilds arrays with `filter`+`slice`; for 1000+ nodes ensure a drop re-flattens/re-renders only affected branches, and that the DnD library chosen is Svelte-5-clean so it isn't fighting runes reactivity. **[inference]**

Lower-priority / not levers: swapping `@tanstack/table-core` v8→v9 (bundle-size win only, irrelevant in a bundled Electron plugin); changing the DnD library purely for perf (DnD acts on small selections — not the bottleneck).

---

## 4. Explicit unknowns / needs deeper investigation

- **`@chenglou/pretext` 0.0.6 as a scaling risk.** Confirmed: it is the default text-measurement engine in `serviceTextMeasure.ts` (`prepare`/`layout`), and text measurement feeds virtualized row-height estimation — so it IS on a hot path for variable-height views at 1000+ nodes. It is `0.0.x` and single-author (chenglou). Investigate: how often is `prepare`/`layout` called per render pass, is it memoized, and is there a fallback engine if it regresses? Measure its cost in the `tree-scroll` scenario. **[partially known — perf cost unmeasured]**
- **Is there any true 2-D cell/range selection in the table view?** Only `RowSelectionState` was found. A "CSV-editor" surface needs range selection + fill-handle + keyboard nav. Confirm whether this exists elsewhere or is unbuilt. **[unknown]**
- **Actual measured perf numbers.** `perfProbe.ts` defines the harness and 4 scenarios but I did not run it. Real numbers (frame times for `tree-scroll`, `operation-badges` at 1000+ nodes) would confirm/refute every "lever" above. Run `__vaultmanPerfProbe.run('operation-badges')` etc. against a 1000+ node vault. **[unknown — measurement needed]**
- **TanStack Virtual + Svelte 5 edge cases.** Issue TanStack/virtual#866 exists; the repo wraps the lib successfully but check whether the `$effect`+`untrack`+`setOptions` dance in `ViewNodeTable.svelte` has known re-render thrash. **[unknown]**
- **`pnpm-lock.yaml` not read** — versions above are the `package.json` ranges/pins; transitive and resolved versions unverified.

---

## Files read (worktree `jovial-wilson-f81c67`)
- `package.json`
- `src/services/serviceVirtualizer.svelte.ts`
- `src/services/serviceManualDnd.ts`
- `src/services/serviceDndSvelteAdapter.ts`
- `src/services/serviceViewTableAdapter.ts`
- `src/components/views/ViewNodeTable.svelte` (lines 120-180)
- `src/components/views/ViewMarkmap.svelte` (lines 1-200, via grep)
- `src/dev/perfProbe.ts`
- grep across `src/` for `@tanstack` / `markmap` / `@dnd-kit` / `createVirtualizer` / `serviceVirtualizer`

## Web sources
- npm `@tanstack/svelte-virtual` (v3.13.x, active publishes May 2026)
- GitHub TanStack/virtual#866 — Svelte 5 support
- GitHub TanStack/table releases + V9 RFC #5834 — `9.0.0-alpha.45` (2026-05-08), modular ~4KB base
- tanstack.com/table/v8 — Svelte adapter / virtualization guide notes
- GitHub `isaacHagoel/svelte-dnd-action`, `thisuxhq/sveltednd`, `hanielu/dnd-kit-svelte`; dndkit.com Svelte Quickstart
- xyflow.com blog "Svelte Flow 1.0 is here!" — Svelte 5 rewrite, stores→runes, perf work (dated 2025-05-14)
- npm `@xyflow/svelte`
