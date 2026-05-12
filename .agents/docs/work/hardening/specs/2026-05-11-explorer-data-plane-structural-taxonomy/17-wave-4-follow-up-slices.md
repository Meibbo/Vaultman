---
title: Wave 4 follow-up slices
type: implementation-spec
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:46:21
updated: 2026-05-11T19:46:21
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - implementation-spec
created_by: codex
updated_by: codex
---

# Wave 4 Follow-Up Slices

These slices should not run before the Files snapshot, batched layer, and
panel/reveal compatibility specs are accepted or reconciled in Wave 5.

## Slice A - Tags And Props Snapshots

Source shards:

- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/07-wave-2-tags-props-vertical-spec|Wave 2 tags and props vertical spec]]
- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/08-wave-2-overlay-invalidation-spec|Wave 2 overlay invalidation spec]]

Scope:

- Add Tags and Props data-plane source adapters after Files proves the
  contract.
- Preserve provider action hooks for filters, queue ops, FnR, binding notes,
  context menus, and property/value scope.
- Treat `operationsIndex.revision` and `activeFiltersIndex.revision` as
  decorative unless visible rows are added or removed.
- Resolve `indexProps` versus `PropertyIndexService` ownership before hardening
  property snapshot semantics.

Acceptance:

- Tags/Props structural snapshot tests cover ids, parent links, visible order,
  search mode, sort target, property casing, object values, and value removal.
- Existing `explorerTags` and `explorerProps` tests keep action behavior.

## Slice B - Overlay Projection Module

Source shards:

- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/08-wave-2-overlay-invalidation-spec|Wave 2 overlay invalidation spec]]
- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/15-wave-4-viewservice-overlay-batching|Wave 4 ViewService overlay batching]]

Scope:

- Extract queue/filter projection rules that are currently inside
  `serviceViews.svelte.ts` only after batch parity is proven.
- Keep `ViewLayers` as output.
- Keep queue popup presentation and active-filter list presentation as separate
  projection seams.

Acceptance:

- Queue parent rows, child rows, remove `sourceId`, parent count badges, search
  filters, selected-file groups, disabled rules, and reorder boundaries have
  unit tests outside Svelte components.

## Slice C - Adapter Row Contract

Source shards:

- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/09-wave-2-view-adapter-virtualizer-spec|Wave 2 view adapter and virtualizer spec]]
- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/16-wave-4-panel-reveal-compatibility|Wave 4 panel and reveal compatibility]]

Scope:

- Move tree/grid/table/cards toward snapshot-backed row inputs only after
  Files tree reveal and selection are stable.
- Keep `@tanstack/svelte-virtual` inside adapters.
- Keep measurement services outside the data plane.
- Keep SVAR as a compatibility adapter with side effects, not as the clean
  contract model.

Acceptance:

- Adapter tests prove stable item keys, callback ids, layer bridge output, and
  reveal lookup behavior across tree/grid/table/cards.

## Slice D - Selection Mirror Cleanup

Source shards:

- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/10-wave-2-selection-control-spec|Wave 2 selection and control state spec]]
- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/12-wave-2-plan-reconciliation-spec|Wave 2 plan reconciliation spec]]

Scope:

- Remove or explicitly deprecate `ViewService` selection/focus state after
  snapshot-backed adapters consume `NodeSelectionService` projections.
- Preserve `ViewService` row state output through a read adapter if legacy
  callers still need `layers.state.selected` or `layers.state.focused`.

Acceptance:

- A test proves no divergence between `NodeSelectionService` and any remaining
  compatibility mirror.

## Slice E - Performance Gate And Issue Prep

Source shard:

- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/11-wave-2-test-performance-gates|Wave 2 test and performance gates]]

Scope:

- Add probe labels for snapshot creation, lookup-map creation, layer batching,
  reveal lookup, and total panel refresh cost.
- Record before/after measurements for the Files-first implementation.
- Prepare Wave 5 issue candidates only after plan reconciliation.

Acceptance:

- Perf probes show queue/filter-only changes avoid structural rebuilds or
  document why they cannot yet.
- Issue candidates trace back to Wave 4 specs and Wave 2 evidence.

## Defer Rules

Defer any slice that requires:

- persistent storage;
- row-level subscription channels;
- global virtualizer ownership;
- table/cards/grid behavior redesign;
- provider action signature rewrites;
- removal of `TreeNode` compatibility before all adapters have a replacement.

