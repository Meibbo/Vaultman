---
title: Spike LEARNINGS — MillerColumns cascade (jsx→Svelte 5 translation tracer)
type: report
status: active
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/03-tracer-viewconfig-cascade|Tracer spec]]"
created: 2026-06-14T00:00:00
created_by: claude-opus-4-8
updated_by: claude-fable-5
tags:
  - agent/report
  - umbrella-v2/wave-1
  - lane/tracer
  - spike/discardable
---

# Spike LEARNINGS — MillerColumns cascade (jsx → Svelte 5)

> Coordinator note (claude-fable-5, 2026-06-14): aterrizado desde el worktree de lane C.
> El CÓDIGO del spike (`src/experimental/SpikeMillerColumns.svelte` + `experimentalFlags.ts`
> + su test) MURIÓ en la rama `umbrella-v2/wave-1-tracer` (no se cherry-pickeó); este
> informe es el deliverable. Los durable types (`typeViewConfig`/`typeSearchEngine`) SÍ
> aterrizaron a sandbox (`22979b1`).

DISCARDABLE spike (wave-1 lane C). It de-risks the proto→Svelte 5 translation thesis for
V.D on the hardest non-tree linear renderer (proto `MillerColumns`), using the REAL
`TreeNode<TMeta>` data atom and a real component mount.

## What the spike actually did

A horizontal cascade: column 0 = `roots`; column N+1 = children of the node selected in
column N. Selecting a parent opens a child column; re-selecting a shallower node truncates
deeper columns; the selected path is derived and emitted to the host. Verified by a 3-test
component smoke (mount + click + assert column count/path) — all green, jsdom, ~200ms.
Scope held to tracer: real data shape, runes, mount; NO scoped-views, NO per-column
virtualization, NO ViewHost refactor.

## What translated CLEANLY (reuse patterns for V.D)

1. **Proto local view-state → `$state` + `$derived` is a near-direct, SHRINKING map.**
   The proto tracked selection with `window.__vmSelMode`/`__vmCellOrder`/`__vmFocusedParent`
   + custom DOM events + a breadcrumb stack as a *second* source of truth. All collapsed to
   ONE rune: `let selectedByDepth = $state<string[]>([])`. Columns AND breadcrumb path are
   `$derived` from it. This is the cluster-02 conflict #8 reshape made concrete: globals +
   DOM-query → reactive state + derived. Net LOC went DOWN vs the proto for same behavior.
2. **The data atom needs no translation.** `TreeNode<TMeta>` already carries everything
   MillerColumns needs; proto's bespoke node shape maps 1:1. Lane A's app-free
   `typeTreeNode.ts` means zero `obsidian`/DOM coupling. The Node contract is
   translation-ready; V.D renderers consume it directly.
3. **Selection-on-click without DOM hit-test.** `onclick={() => selectAt(depth, id)}` keyed
   by node id replaces the proto's `[data-node-id]` coord hit-test entirely.
4. **`$derived.by` for the cascade is idiomatic and cheap.** Pure fold over
   `roots` + `selectedByDepth`; no manual invalidation, no `useMemo` dep arrays.
5. **Notify-host-on-change = `$effect` calling a prop callback** (`onSelectPath`). The
   legitimate Svelte-5 "emit on change" case (autofixer flags it as suggestion only).

## What was HARD / needs care (cost signal for V.D estimates)

1. **Generics on `.svelte` work but are syntactically load-bearing.**
   `<script lang="ts" generics="TMeta = unknown">` required to keep `TreeNode<TMeta>` honest
   through props (matches `ViewHost.svelte`). Easy to forget; costs a compile loop.
2. **a11y is enforced at compile/lint.** Clickable div tripped
   `a11y_click_events_have_key_events` until per-item `onkeydown` (Enter/Space). The real
   `ViewNodeList` carries the same listbox/option + keyboard burden. **V.D estimates must
   budget keyboard-interaction parity per renderer**, not bolt it on.
3. **Reactivity ordering vs the proto's imperative flow.** Resist `$effect`s to "sync" what
   should be `$derived`. Truncation (click shallower → deeper columns vanish) belongs in the
   setter as `slice(0, depth)`, not an effect.

## What is INTRADUCIBLE as-is (RESHAPE confirmed — matches cluster-02 #8)

1. **Window globals as the primary model** (`__vmSelMode` etc.): module-global singletons
   incompatible with multiple explorer instances. RESHAPE → per-instance rune state →
   registry/resolver + InputRouter active-context (P.D). Do NOT port the globals.
2. **DOM-query (`[data-node-id]` hit-test) over a virtualized surface.** Under TanStack
   virtualization most rows are NOT mounted → partial query → silent wrong selection.
   RESHAPE → geometry/index math against the row model (real views already do this via
   `serviceExplorerScrollGeometry` + `idToIndex`). A graduating MillerColumns must virtualize
   per column and compute selection from the model, never the DOM.
3. **Per-renderer custom DOM events for cross-talk** → prop callbacks + active-context service.

## Virtualization finding (feeds the open TanStack-Svelte research, C-8)

Real linear/grid/table/cards views ALL use `@tanstack/svelte-virtual createVirtualizer` with
a RAF rect observer (`createRafElementRectObserver`) + `fallbackFixedVirtualRows`. A real
MillerColumns = **each column an independent virtualized scrollport** (its own
`createVirtualizer`), N-up horizontally → N virtualizers in one view. Concrete stress input
for the umbrella's open "TanStack virtualizer Svelte adapter" research; open question = per-
column virtualizer lifecycle when columns mount/unmount during cascade.

## ViewHost seam (coordination — STOPPED here, did NOT refactor)

`src/components/explorer/ViewHost.svelte` is a `{#if renderedViewMode === 'tree' …}` switch
over the FLAT `ExplorerViewMode` enum (`tree|list|table|grid|cards|markmap`); no `miller`
member/branch. Mounting a real MillerColumns via ViewHost REQUIRES a ViewHost change (lane
A/Q4 spine territory). The seam + **recommendation**: instead of growing the flat
`ExplorerViewMode` enum, **have ViewHost switch on `(engine, mode)` from a resolved
`ViewConfig`** (cleaner; aligns with D-C-8). Flagged as a V.D design question. The flat enum
(render-projection plane) is distinct from `ViewConfig.mode='miller'` (Linear engine); the
bridge is a V.D decision.

## Verdict: spike code DIES in the branch (as designed)

Value fully captured here. Carry forward into V.D: the reshape recipe (globals/DOM-events/
DOM-hit-test → rune state + derived + prop callbacks + model-based selection); the per-column-
virtualizer shape as TanStack-research stress input; the ViewHost seam decision (grow flat
enum vs switch on resolved `ViewConfig`); confirmation that `TreeNode` + the new `ViewConfig`
normal form are translation-ready substrate. The experimental flag is discardable too; when
MillerColumns graduates, its gate moves into the real settings/preset layer (P.D/SF).
