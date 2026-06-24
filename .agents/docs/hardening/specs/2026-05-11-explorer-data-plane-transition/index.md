---
title: Explorer data plane transition
type: prd
status: triaged
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - render-hot-path
  - needs-triage
created_by: codex
updated_by: codex
glossary_candidates:
  - render hot path
  - view adapter
  - node selection service
---

# Explorer Data Plane Transition

## Problem Statement

Vaultman's explorer has become harder to stabilize because the visible explorer
surface does not have one durable data plane. `panelExplorer`, concrete
explorer providers, `ViewService`, view adapters, selection state, queue
decorations, active-filter decorations, and bubbling logic all participate in
showing data. This spreads render hot path responsibility across many shallow
modules.

The user-facing result is an explorer that feels increasingly fragile: new
badges, view modes, selection behavior, queue state, active filter highlights,
and external metadata refreshes are implemented by adding another local bridge
instead of deepening the module that owns display data.

The technical comparison with Notebook Navigator showed the core gap: Notebook
Navigator first turns vault and metadata changes into stable cached data, then
renders from derived snapshots. Vaultman still frequently asks providers to
rebuild and redecorate live trees during panel refresh.

## Solution

Introduce an incremental explorer data plane. The data plane is a deep module
that turns provider/domain facts into versioned explorer snapshots consumed by
`ViewService` and view adapters.

The transition must preserve current behavior while moving ownership:

- concrete providers remain domain adapters for actions and source facts;
- the explorer data plane owns structural snapshots, stable row identity,
  lookup maps, search/sort/hidden projections, and revision metadata;
- `ViewService` owns semantic render layers in batch, not one node at a time;
- view adapters render snapshots and forward events, without querying domain
  services or reconstructing queue/filter decorations;
- `panelExplorer` becomes a surface coordinator instead of the render data
  engine.

The first vertical slice should target Files tree display because it is the
highest-value path for validating source records, tree flattening, selection,
scroll reveal, badges, and provider action compatibility.

## User Stories

1. As a Vaultman user, I want Files explorer rows to update from stable display
   data, so that search, filtering, queue state, and selection do not cause
   visible decay.
2. As a Vaultman user, I want tree, grid, table, and cards modes to agree on
   node identity, so that switching views does not lose selection or focus.
3. As a Vaultman user, I want queue badges and active-filter highlights to be
   consistent across explorers, so that status indicators mean the same thing
   everywhere.
4. As a Vaultman user, I want collapsed parent rows to reflect child state
   reliably, so that hidden queued or filtered children remain discoverable.
5. As a Vaultman user, I want large vaults to avoid unnecessary tree rebuilds,
   so that scrolling and filtering stay responsive.
6. As a Vaultman user, I want external metadata changes to refresh visible
   Props, Tags, and Files rows, so that explorer data does not go stale.
7. As a Vaultman user, I want detached explorer tabs to render the same data as
   docked explorers, so that workspace tab behavior stays coherent.
8. As a Vaultman user, I want keyboard focus, selected node, active node, and
   hover state to remain distinct, so that visual state is predictable.
9. As a Vaultman user, I want search results to preserve meaningful parent
   context, so that matching child rows are not isolated from their hierarchy.
10. As a Vaultman user, I want view adapters to keep their current affordances,
    so that the transition does not remove working context menus, primary
    actions, or queue actions.
11. As a developer, I want providers to expose domain facts and actions through
    a small adapter interface, so that visual layer changes do not require
    editing each provider.
12. As a developer, I want a versioned explorer snapshot, so that scroll reveal
    and virtualizer index lookup can reject stale indices.
13. As a developer, I want `ViewService` to process rows in batches, so that
    semantic layer creation is testable and avoids per-node call overhead.
14. As a developer, I want decoration layers separate from structural nodes, so
    that operation/filter changes can update render state without rebuilding
    source trees.
15. As a developer, I want file, tag, and property indexes to feed the same data
    plane contract, so that future explorers do not copy provider-specific
    reconstruction logic.
16. As a developer, I want focused unit tests for snapshot generation, so that
    most explorer behavior can be verified without mounting Obsidian UI.
17. As a developer, I want component tests to verify projection only, so that
    view adapter tests do not duplicate business logic.
18. As a developer, I want a safe migration path, so that legacy providers and
    current `panelExplorer` routing keep working during the transition.
19. As a developer, I want performance probes around snapshot creation and
    layer batching, so that the render hot path improves with evidence.
20. As a future agent, I want this PRD to name the ownership shift explicitly,
    so that later work does not keep adding bridges to `panelExplorer`.

## Implementation Decisions

- Build the transition as an incremental hardening initiative, not a visual
  redesign and not a wholesale rewrite.
- Treat the explorer data plane as the new deep module. Its interface returns
  versioned snapshots; its implementation can continue to use existing indexes,
  providers, filter state, queue indexes, and Obsidian metadata during early
  slices.
- Keep providers as adapters for domain source facts and domain actions. They
  may keep click, context menu, rename, delete, add, FnR, and queue operation
  behavior during the transition.
- Move cross-cutting visual layers out of providers. Queue badges, active
  filter decorations, pending/deleted state, warning badges, and inherited badge
  bubbling should be created by the render model layer.
- Batch `ViewService` model creation. A provider or panel should pass a full
  snapshot or visible row set instead of invoking model creation for one node at
  a time.
- Split structural invalidation from decorative invalidation. Search, sort,
  hidden-item rules, vault changes, and metadata changes can alter structure;
  queue and active-filter changes should usually alter layers.
- Add stable lookup maps to snapshots. Required maps include node id to row,
  node id to index, and path or domain key to node id where the provider can
  supply it.
- Add revision metadata to snapshots. Required revisions include source index,
  projection, queue, active filters, decorations, and expansion-visible shape.
- Keep `NodeSelectionService` as the current authority for node selection. The
  data plane may consume selection snapshots but should not duplicate selection
  ownership in the first slice.
- Keep view adapters thin. Tree, grid, table, cards, list, and SVAR adapters
  should render rows and forward semantic events; they should not query queue,
  filter, metadata, or provider internals.
- Start with Files tree because it exercises hierarchy, scroll, search,
  selection, collapsed child state, and domain actions with the smallest useful
  blast radius.
- Use Props and Tags as follow-up adapters after Files validates the snapshot
  contract, because those providers currently contain significant decoration and
  metadata lookup behavior.
- Do not introduce persistent IndexedDB in the first Vaultman slice. The
  Notebook Navigator comparison is used for architecture lessons, not as a
  storage mandate.
- Keep detached explorer tabs compatible by routing them through the same
  snapshot contract as docked tabs.
- Keep previous service-owned view architecture decisions. This PRD deepens the
  data/source side that feeds `serviceViews`; it does not replace the existing
  explorer view service direction.

## Testing Decisions

- Good tests assert external behavior at module interfaces: snapshot content,
  stable ids, revision changes, layer output, scroll lookup maps, and adapter
  projection. They should avoid asserting implementation-private helper calls.
- Unit-test the explorer data plane with mocked provider adapters, mocked index
  revisions, queue operations, active filters, hidden rules, and source nodes.
- Unit-test `ViewService` batching so one input snapshot yields the same
  semantic layers that old per-node calls produced.
- Unit-test structural versus decorative invalidation. Queue-only changes
  should not require source tree rebuild; source index changes should.
- Unit-test collapsed child badge bubbling as snapshot/layer data, not as Svelte
  markup.
- Unit-test lookup maps and index-version behavior for scroll reveal.
- Component-test `panelExplorer` with a compatibility adapter to prove the Files
  tree renders, selection commits, context menu forwarding, and primary actions
  still work.
- Component-test `ViewTree` projection with a snapshot-backed model to prove it
  renders badges, counters, toggle slots, and selected/focused/active states.
- Reuse existing prior art from service view tests, node selection tests,
  ViewTree component tests, panel explorer selection tests, service scroll
  tests, and performance probe records.
- Add a focused performance measurement before and after the first Files tree
  slice. Evidence should include provider tree reads, model creation calls,
  bubbling work, flattening work, and total panel refresh cost.

## Out Of Scope

- Rewriting all explorers in one change.
- Replacing Svelte or adopting React.
- Porting Notebook Navigator storage architecture wholesale.
- Adding IndexedDB or persistent preview caches in the first slice.
- Replacing `NodeSelectionService`.
- Replacing all view adapters.
- Implementing a new table, cards, grid, or list feature as part of the first
  data-plane slice.
- Changing user-facing visual style beyond what is required to preserve current
  behavior.
- Removing legacy provider APIs before compatibility adapters are proven.
- Moving AI workflow files to `main`.

## Further Notes

- This PRD supersedes the habit of fixing explorer decay by adding another
  `panelExplorer` bridge. New work should ask whether the change belongs in the
  explorer data plane, `ViewService`, a provider adapter, or a view adapter.
- The older explorer view service spec remains valid. This PRD should be read as
  the missing source-data transition that makes that service architecture more
  durable.
- The transition should be planned as small vertical cuts. Each cut must leave
  the plugin usable and should include focused verification before moving to the
  next provider or view mode.
