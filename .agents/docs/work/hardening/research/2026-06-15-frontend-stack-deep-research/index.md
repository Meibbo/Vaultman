---
title: Frontend Stack Deep Research — TanStack Virtual/Table, pretext, dnd-kit, bits-ui, UnoCSS/presetWind4, LayerChart
type: research-index
status: active
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: opus-4-8
updated_by: opus-4-8
tags:
  - agent/research
  - explorer/performance
  - explorer/virtualization
  - frontend/stack
  - umbrella-v2/wave-1
---

# Frontend Stack Deep Research

Dev-requested deep research sweep (2026-06-15) on the libraries that the Vaultman 2.0 render/interaction stack actually depends on. Trigger: the **N.R / V.D form decision** (imperative vs Svelte cell) could not be made responsibly without knowing how the underlying libraries behave — and the team had **abandoned 1.1.0 beta.1 for terrible virtualization performance**, so "trust TanStack blindly" is an explicit anti-pattern.
Dev mandate this session: **stop drawing conclusions without the data in hand.**

Method: **6 parallel read-only Explore agents** (research-only, no write access — honors the 706-file-deletion rule), each with exact doc links + in-repo pre-reads + specific questions. The coordinator (opus-4-8) then **verified every load-bearing claim** against the actual repo and live web before writing this durable record. Stale-cutoff agent claims were caught and corrected (see ledger).

## Executive summary (the cross-cutting conclusions)

1. **The stack is already committed to Svelte 5 + `@tanstack/svelte-virtual` + `@chenglou/pretext`.**
   The render pipeline is not greenfield. `viewTree` renders rows as a Svelte `{#snippet}` via `{@render}`; Grid/Table/Cards use imperative `createEl`; a Fenwick-tree geometry service (`serviceExplorerScrollGeometry.ts`) already exists for O(log n) variable-height offsets.
2. **The real performance lever is V.D (the shared render-runtime), not N.R's cell form.**
   TanStack Virtual virtualizes the LIST (only the visible window mounts, ~30–60 rows), so a Svelte-5 cell vs an imperative builder is a near-marginal perf choice. The beta.1 disaster came from **O(n) offset scans + stale measurement caches + missing overscan on jumps** — list-level orchestration, not the per-cell framework.
3. **Prior multiview research already prescribed the fix** ([[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|multiview-virtualization]]):
   keep TanStack, add ONE shared virtual-layout service (fixed-height math + variable-height Fenwick offsets + lanes + range fallback + total-size policy), gate every perf claim behind a live blank-frame detector. This session's TanStack deep-dive confirms + operationalizes it.
4. **`render-tag` answers the dev's "html-in-canvas" question.** It is the Polotno project's `render-tag` lib (renders styled HTML/CSS straight to Canvas 2D, no SVG/foreignObject). It is NOT in our deps and is only relevant to a **future N4 canvas/graph/spatial engine**, never to the DOM tree/list/table cell (which must stay DOM for native parity + a11y + theming).

## Verification ledger (claim · source · status · confidence)

Every load-bearing claim, tagged. `repo✓` = verified against actual files. `web✓` = verified live online. `flag` = still needs verification before it gates code.

| # | Claim | Source | Status | Confidence |
|---|---|---|---|---|
| 1 | `@tanstack/svelte-virtual` 3.13.24 + `@tanstack/table-core` 8.21.3 + `@chenglou/pretext` 0.0.6 + `@dnd-kit/svelte` 0.4.0 + `bits-ui` 2.18.1 + `unocss` 66.6.8 installed | package.json | repo✓ | high |
| 2 | `serviceExplorerScrollGeometry.ts` exists with Fenwick variable-height geometry | Agent 1 + grep | repo✓ | high |
| 3 | `serviceNodeRowMeasure/CardLayout/CardStyle/RowStyle.ts` exist (pretext-fed measurement) | Agent 1/2 + glob | repo✓ | high |
| 4 | We use `@tanstack/table-core` for TYPES only (SortingState/ColumnDef) + manual `sortRows`, NOT the Svelte adapter | Agent 3 | repo✓ (serviceViewTableAdapter.ts) | high |
| 5 | `serviceDnd/DndSvelteAdapter/DndAliasAware/ManualDnd.ts` exist | Agent 4 + glob | repo✓ | high |
| 6 | UnoCSS already wired: `uno.config.ts` (presetWind3, preflight:false, presetTheme native/vaultman), `@unocss/vite` plugin | Agent 6 + read | repo✓ | high |
| 7 | **presetWind4 EXISTS** (`@unocss/preset-wind4`, UnoCSS 66.1+; Wind3-compatible; oklch; base/theme/properties layers; presetRemToPx built-in). We're on 66.6.8 → **available now**. | Agent 6 said "doesn't exist" — **CORRECTED** | web✓ | high |
| 8 | dnd-kit Svelte = official `@dnd-kit/svelte`: `createDraggable/createDroppable/createSortable` + `{@attach x.attach}` + `<DragDropProvider {onDragEnd}>` | Agent 4 (mixed React-isms) — **CORRECTED** | web✓ (dndkit.com/svelte) | high |
| 9 | `@dnd-kit/svelte` (official, first-party Svelte 5) likely **supersedes the HanielU `dnd-kit-svelte`** port selected in R-DND-C | coordinator inference | flag | medium — confirm package identity + maintenance before lock |
| 10 | `render-tag` = Polotno `render-tag` (HTML/CSS → Canvas 2D, no SVG, sync, zero-dep, v0.1.15); NOT in our deps; N4-only relevance | Agent 2 | web✓ (identity) | medium-high — re-confirm version/API before any adoption |
| 11 | bits-ui FnR breakage hypothesis = portal + `trapFocus` colliding with Obsidian editor focus/event-delegation; fix = `trapFocus:false` in editor contexts + portal scoped to `activeDocument` (we have `servicePortalResolver.ts`) | Agent 5 | flag | medium — HYPOTHESIS, reproduce against real FnR before trusting |
| 12 | pretext extended API (prepareWithSegments/walkLineRanges/prepareRichInline/…) | Agent 2 | flag | low-medium — our code uses only prepare/layout; verify extended API vs actual package before relying |
| 13 | TanStack Virtual `anchorTo`/`followOnAppend`/`lanes`/`initialMeasurementsCache` options | Agent 1 | flag | medium — lanes + initialMeasurementsCache are real; anchorTo/followOnAppend verify upstream before use |

## Shards (full detail per topic)

1. [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/01-tanstack-virtual|01 — TanStack Virtual (PRIORITY)]] — internals, Svelte adapter, failure modes (the beta.1 class), shared-layout-service orchestration, our Fenwick geometry.
2. [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/02-pretext-and-render-tag|02 — pretext + render-tag]] — text measurement without reflow; pretext×TanStack pattern; render-tag = canvas renderer (the html-in-canvas answer; N4-only).
3. [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/03-tanstack-table|03 — TanStack Table]] — we use types-only today; adopt-`createSvelteTable`-or-keep-manual decision; virtualized-table composition.
4. [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/04-dnd-kit-svelte|04 — dnd-kit (Svelte)]] — corrected `@dnd-kit/svelte` API; DnD×virtualization (the hard combo); foreign drops via PlatformAdapter; HanielU-vs-official reconciliation.
5. [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/05-bits-ui-daisy-shadcn|05 — bits-ui + daisyUI + shadcn]] — headless-primitive strategy for agnostic unstyled `data-vm-*` primitives; FnR-breakage fix; daisy/shadcn = reference not dependency.
6. [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/06-unocss-presetwind4-layerchart|06 — UnoCSS + presetWind4 + LayerChart]] — UnoCSS already-wired correction; presetWind4 migration (it EXISTS); LayerChart pilot/defer.

## Decisions surfaced for the dev

- **D-FE-1 (N.R cell form).** Given the stack, the idiomatic choice is a **Svelte 5 node-element cell** rendered inside the existing `svelte-virtual` loop; the imperative builder is a premature optimization. (Was the open fork that triggered this research.)
- **D-FE-2 (dnd-kit package).** Reconcile prior R-DND-C selection (`dnd-kit-svelte`, HanielU) against the now-first-party `@dnd-kit/svelte`. Likely switch to official. Needs a confirm pass.
- **D-FE-3 (presetWind4).** Migrate `presetWind3 → presetWind4` now (available, Wind3-compatible, oklch + perf layers) vs defer. Tooling-discipline: pilot behind a visual diff.
- **D-FE-4 (TanStack Table).** Keep types-only manual table vs adopt `createSvelteTable` for the row-model pipeline (filtering/grouping readiness). Lower urgency.
- **D-FE-5 (LayerChart).** Defer to a dashboard/dataviz panel pilot (N3/N4), theme-mapped to Obsidian vars, lazy-loaded.
- **render-tag / canvas:** reserved for N4 canvas/graph engines; NOT the explorer cell.

## Stack inventory snapshot (verified)

| Lib | Version | In-repo status | Notes |
|---|---|---|---|
| svelte | 5.55.7 | core | runes |
| @tanstack/svelte-virtual | 3.13.24 | IN USE (all views) | shared-layout-service orchestration is the V.D work |
| @tanstack/table-core | 8.21.3 | TYPES ONLY | adapter not used; manual sortRows |
| @chenglou/pretext | 0.0.6 | IN USE (serviceTextMeasure) | pre-1.0; variable-height measurement |
| @dnd-kit/svelte | 0.4.0 | IN USE (serviceDndSvelteAdapter) | official first-party Svelte 5 |
| bits-ui | 2.18.1 | IN USE (vmPopover/vmDialog) | headless; FnR-breakage to diagnose |
| unocss + @unocss/vite | 66.6.8 | WIRED (presetWind3) | presetWind4 available; partial adoption |
| unocss-preset-theme | 0.14.1 | IN USE | native/vaultman themes |
| @git-diff-view/svelte | 0.1.3 | IN USE (viewDiff) | — |
| layerchart | — | NOT installed | dashboard pilot candidate |
| render-tag (polotno) | — | NOT installed | N4 canvas-engine candidate only |

## Connection to the spine (N.R / V.D)

This research directly informs the open spine decision:
- **N.R** (node-element cell) → Svelte 5 cell consuming `ExplorerRowInput` + `NativeClassVocabulary`, rendered by `{@render}` inside `svelte-virtual`. Headless `data-vm-*` per the bits-ui/D-PSS strategy (shard 05).
- **V.D** (view shells + render-runtime) → the high-leverage work: one shared virtual-layout service wrapping `svelte-virtual` (shard 01 §orchestration), Fenwick geometry reuse across engines, pretext measurement (shard 02), blank-frame detector gate. N.R and V.D are more coupled than the pyramid implied: the cell's form depends on how the runtime mounts it.

## Process notes

- Research = 6 read-only Explore agents (no write access). Coordinator verified all repo-file claims (glob/grep) and the two highest-stakes online claims (presetWind4 existence via WebSearch; dnd-kit Svelte API via WebFetch of dndkit.com/svelte). Three `flag` items remain (ledger #9/#11/#12) — they must be re-verified before they gate code, not trusted from the agent reports alone.
- Slots into research-inventory codes: virtua-vs-tanstack (V.D perf), R-UNOCSS, R-UI-PRIMITIVES (S-29), R-CHARTS (S-23), R-DND-C (deepened + package reconciliation), bits-ui FnR breakage.
</content> </invoke>
