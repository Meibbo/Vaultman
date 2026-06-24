---
title: Plan — Tracer ViewConfig + seam types + spike cascade (wave 1 lane C)
type: plan
status: active
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/03-tracer-viewconfig-cascade|Tracer spec]]"
created: 2026-06-14T00:00:00
updated: 2026-06-14T00:00:00
created_by: claude-opus-4-8
tags:
  - agent/plan
  - umbrella-v2/wave-1
  - lane/tracer
---

# Plan — Tracer ViewConfig + seam types + spike cascade

Worktree `umbrella-v2/wave-1-tracer` (from sandbox HEAD `c2062d9`). Lane C is
TIMEBOXED. Two deliverables of different natures: (a) DURABLE `typeViewConfig` +
seam types; (b) DISCARDABLE spike whose real output is a LEARNINGS report.

## Ground truth absorbed (read-only)

- Spec `03-tracer-viewconfig-cascade` incl. **§Aclaración dev**: `ViewConfig` =
  forma normal / resolved artifact, NOT the UI primary key. Mechanism = **registry +
  resolver**, not a pre-enumerated results index (explicit correction). Lane C
  delivers TYPES only (`ViewBinding` / `resolveViewConfig` / `normalizeViewConfig` /
  `SearchEngine`) + capability matrix + engine-naming MAP. Registry runtime +
  multi-surface projection = P.D/SF (folded into P.D per D-C-8 resolution).
- Locked decisions: **D-C-8** (ViewConfig normal form + binding layer = ADR 0005
  applied to views; reshape of ledger conflict #8 proto window-globals→registry),
  **D-C-1** (SearchEngine seam, native adapter today, minisearch later),
  **D-PSS-1** (cascade by scope, view facet), **D-PSS-4** (`.scene` sparse merge).
- Ledger cluster 02: engine-naming conflicts #1/#2/#3/#8; capability-matrix conflict
  #4 (proto UI promises scoped-views that only TreeRows renders).
- Glossary canon (lines 129-133): engines **Linear/Geometry/Table/Canvas**; modes
  tree-indent|flat-list|miller / grid|cards|group-box / transpose / mindmap|graph;
  orientation = **horizontal|vertical** (flag, NOT a mode).
- Proto v12 engine matrix (shard 04 §14): `lineal:[tree,flat-list,tiles]`,
  `grid:[matrix,cards,widgets]`, `matrix:[table,chart,form]`,
  `canvas:[graph,mindmap,json-canvas]`; orientation controls = Down/Up/Side-Miller/Drill.

## Existing code I must NOT collide with / must reconcile

- `src/types/typeViews.ts` — the **render-projection** layer (rows/cells/layers/
  `ExplorerRenderModel`, flat `ExplorerViewMode` enum). This is a DIFFERENT plane from
  my `ViewConfig` (the addressing normal form). I add a new file; I do not edit this.
- `src/types/typeViewHost.ts` — ViewHost mount contract; the spike mounts via this,
  I do not refactor it (coordination rule: stub + report any needed seam).
- `src/platform/searchEngine.ts` (lane B) — provisional `SearchEngine`
  `{search(query), readResults(), available}` = the **DOM-scrape transport** shape.
  `nativeSearchAdapter.ts` `implements PlatformAdapter, SearchEngine` and its tests
  assert `adapter.search('tag:#project')` / `adapter.readResults()` directly. I must
  NOT change B's interface or break those tests.
- Glossary already uses **`view-config`** for the cell role→slot/order Bases bridge.
  My new type is **`ViewConfig`** (engine/mode/orientation/viewScope addressing).
  Doc-comments must disambiguate the two so nobody conflates them.

## Reconciliation strategy for SearchEngine (D-C-1)

B's seam is the transport (drive Core Search, scrape DOM). The spec's canonical
`SearchEngine {id, query(rule, scope): AsyncResults, capabilities}` is the
**filter-rule-plane** contract the view/filter system depends on. Resolution:

1. Define the canonical `SearchEngine` in the view-config domain
   (`src/types/typeSearchEngine.ts`) — `{id, query(rule, scope), capabilities}`,
   `AsyncResults = Promise<SearchEngineResults>`. `rule` is a content-search filter
   rule (doc-comment ties it to `FilterType` / `content_search`, no edit to
   `typeFilter.ts`). `scope` = the resolved scope facet shape (minimal, structural).
2. Provide `nativeSearchEngineFrom(adapter)` adapter-cast that wraps the EXISTING
   `NativeSearchAdapter` (B's transport) into the canonical seam WITHOUT touching the
   adapter or its behavior: `query(rule, scope)` extracts the query string from the
   rule, calls `adapter.search(q)` then `adapter.readResults()`, maps hits→results.
3. Test proves the cast compiles and behaves bit-identically to direct adapter calls.
   B's `searchEngine.ts` and `nativeSearchAdapter.ts` stay byte-for-byte unchanged.

## Engine-naming MAP (ledger C-12, conflicts #1/#2/#3) — lives in doc-comments

| Proto v12 | Glossary canon (this type) | Notes |
|---|---|---|
| `lineal` engine | `Linear` | tree/flat-list/tiles → modes tree-indent/flat-list/(tiles≈miller detail) |
| `grid` engine | `Geometry` | grid/cards/widgets → modes grid/cards/group-box; proto's `matrix` MODE = dense grid sub-style, NOT engine |
| `matrix` engine (table/chart/form) | `Table` | table → Table column mode; **chart/form = reserved Table modes (transpose family), DEFERRED** (ledger 09 §8.4) — type leaves room, does not block |
| `canvas` engine | `Canvas` | graph/mindmap/json-canvas → modes mindmap/graph (json-canvas reserved) |
| orientation Down/Up/Side-Miller/Drill | `orientation: horizontal\|vertical` + `mode`/sub-mode | miller/drill/accordion are MODES/sub-modes, NOT orientation (glossary reduces orientation to h\|v) |

`matrix` is NOT an engine in the canon — reserved word, decided later by dev in V.D.

## Capability matrix (ledger conflict #4) — expressed in TYPES

Proto UI promises `levelViews`/`parentViews`/`renderEmbedded` on every renderer but
only Linear tree-indent resolves them. Encode per engine+mode which scoped-view
overrides are supported, so the resolver/UI can validate instead of silently lying:

- `EngineModeCapability { levelViews, parentViews, renderEmbedded }` (all boolean).
- `ENGINE_CAPABILITIES` const map keyed by `engine` then `mode`, with Linear/tree-indent
  = all true; everything else = false (matching the verified proto reality).
- `viewScope` values supported gated by capability (off always; per-level/per-parent
  only where capability allows).

## Files (all UNDER C:/tmp/vaultman-uv2-tracer/)

1. `src/types/typeViewConfig.ts` — DURABLE. The normal form + defaults + engine/mode/
   orientation/viewScope unions + reserved placement/layerId/relations + capability
   matrix + engine-naming MAP doc-comments + `ViewBinding` / `resolveViewConfig` /
   `normalizeViewConfig` + cascade types. Pure types + pure functions (defaults,
   resolve, normalize) — no runtime registry, no DOM, no Svelte.
2. `src/types/typeSearchEngine.ts` — DURABLE. Canonical `SearchEngine` seam +
   `nativeSearchEngineFrom` cast (re-exports/wraps B's adapter type, no behavior change).
3. `test/unit/types/typeViewConfig.test.ts` — schema tests: defaults centralized,
   sparse merge by scope, absolute vs relative binding, round-trip
   `normalize(resolve(b1)) === normalize(b2-equivalent)`, capability-matrix invariants,
   engine-naming MAP assertions.
4. `test/unit/types/typeSearchEngine.test.ts` — canonical seam compiles; native
   adapter casts to it; cast behaves identically to direct adapter calls.
5. Spike (DISCARDABLE): `src/experimental/spikeMillerColumns.svelte` (+ flag in a
   local experimental module) mounted via EXISTING ViewHost path. Manual smoke only.
   IF the timebox/`node_modules`/ViewHost seam makes a live demo infeasible, the spike
   is delivered as a code sketch + the LEARNINGS report still ships (the report is the
   real deliverable per spec §6).
6. `.agents/docs/work/hardening/plans/2026-06-13-tracer-viewconfig/spike-learnings.md` —
   the LEARNINGS report (jsx→Svelte5/runes/virtualization; reused vs intraducible).

## Steps

1. Write this PLAN. [done]
2. `pnpm install` once (node_modules missing). If it fails/slow → stop runtime verify,
   still write all types+tests, report verify pending.
3. Implement `typeViewConfig.ts` (types + pure resolve/normalize/defaults).
4. Implement `typeSearchEngine.ts` (canonical seam + native cast).
5. Write both unit test files. Run focused tests (`vp test run --project unit`).
6. `pnpm run check` (svelte-check). Fix type errors in MY files only.
7. Spike: assess ViewHost mount seam; build MillerColumns sketch behind a flag; manual
   smoke if feasible; write LEARNINGS report regardless.
8. Commit verified slices locally (types+tests as one slice; spike as a separate
   clearly-labelled discardable slice).
9. Report: PLAN verbatim, types file-by-file, SearchEngine reconciliation, MAP +
   capability decisions, LEARNINGS verbatim, verify status, ViewHost seam, blockers.

## Risks / guards

- Scope-creep: lane C delivers TYPES only — NO registry runtime, NO multi-surface
  projection. If tempted, stop (spec §6, D-C-8).
- Spike polish temptation → timebox + "discardable" are law; value = report.
- Do NOT edit `typeViews.ts`, `typeFilter.ts`, `searchEngine.ts`, `nativeSearchAdapter.ts`,
  or `typeViewHost.ts`. New files only; reconcile by wrapping, not mutating.
- SAFETY: write only under `C:/tmp/vaultman-uv2-tracer/`. No destructive/remote git.
