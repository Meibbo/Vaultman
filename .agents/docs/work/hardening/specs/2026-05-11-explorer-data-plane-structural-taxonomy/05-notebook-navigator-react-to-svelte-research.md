---
title: Notebook Navigator React to Svelte research
type: research
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:21:17
updated: 2026-05-11T20:37:12
tags:
  - agent/research
  - initiative/hardening
  - explorer/views
  - notebook-navigator
  - svelte
created_by: codex
updated_by: codex
source_commit: "johansan/notebook-navigator@0c851de1ba2c4d9a3ec8f9dbda0bbbef57d9b00e"
wave_dependency: "Wave 2 vertical specs were added after this initial Wave 3 pass; revalidate conclusions against shards 06 through 12 before Wave 4."
---

# Notebook Navigator React To Svelte Research

This starts Wave 3 for the explorer data plane taxonomy. It compares Notebook Navigator's React architecture against a Svelte-native Vaultman design, without turning the comparison into an implementation spec yet.

## Input Gate

Wave 3 was originally sequenced after the Wave 2 vertical codebase specs. This record was started before those vertical specs were captured. Therefore it is a source-backed research pass and translation map, but integration decisions that depend on Files/Tags/Props/Queue/adapter details must be revalidated against shards 06 through 12 before Wave 4 implementation specs.

## Decision Frame

Use Notebook Navigator as prior art for shape, not as a storage mandate.
Vaultman already has source indexes, provider adapters, `ViewService`, `NodeSelectionService`, and Svelte virtualized views. The open question is where to place the durable explorer data-plane boundary so incremental work stays clean.

Evaluation criteria:

- Does the pattern separate source facts, derived rows, overlays, and control state?
- Does it reduce `panelExplorer` coordination without breaking current views?
- Does it make reveal-by-id and virtualizer index changes deterministic?
- Does it require persistence, or can Vaultman start with versioned memory snapshots?
- Does the Svelte translation use runes/stores/context where they fit instead of porting React provider mechanics literally?

## Evidence Ledger

| Area | Notebook Navigator evidence | Vaultman/Svelte evidence | Research use |
| --- | --- | --- | --- |
| Storage tiers | `docs/storage-architecture.md`, `docs/metadata-pipeline.md`, `src/storage/IndexedDBStorage.ts`, `src/storage/MemoryFileCache.ts` | Structural snapshots remain memory-first; cached explorer images make a separate media cache DB natural | Decide structural persistence vs media/derived-content persistence |
| Provider registry | `docs/service-architecture.md`, `src/services/content/ContentProviderRegistry.ts`, `src/services/content/BaseContentProvider.ts` | `src/providers/explorerFiles.ts`, `explorerTags.ts`, `explorerProps.ts`, `explorerContent.ts` | Separate source/domain adapters from derived-content workers |
| Render snapshots | `docs/rendering-architecture.md`, `src/hooks/useListPaneData.ts`, `src/hooks/listPaneData/listItems.ts` | `src/index/indexNodeCreate.ts`, `src/types/typeContracts.ts`, `src/services/serviceViews.svelte.ts` | Define versioned rows/lookups without replacing `TreeNode` immediately |
| Scroll orchestration | `docs/scroll-orchestration.md`, `src/hooks/useNavigationPaneScroll.ts`, `src/hooks/useListPaneScroll.ts` | `src/services/serviceScroll.ts`, `src/components/views/viewTree.svelte`, grid/table/cards/list adapters | Adopt path/id-based pending scroll plus index-version gates |
| Virtual panes | React panes use TanStack Virtual and pane-local hooks | Svelte panes already use `@tanstack/svelte-virtual` and local `$derived` virtual rows | Keep virtualizer ownership in view adapters, feed better row contracts |
| Svelte state model | Official Svelte 5 docs: runes, `.svelte.ts` modules, stores, context, `svelte/reactivity` | Vaultman uses `.svelte.ts` services and component-local runes already | Translate React context/hooks into Svelte services/context/runes |

## Notebook Navigator Pattern Map

Notebook Navigator has a layered data path:

1. Obsidian vault changes and metadata changes become file-level diff events.
2. IndexedDB stores rebuildable per-file derived data keyed by vault path.
3. A memory cache mirrors IndexedDB so render paths can read synchronously.
4. A content-provider registry queues background providers and writes batch results back to storage.
5. React contexts expose readiness, getters, provider registry access, and derived tree data.
6. Navigation/list panes derive row items and path-to-index maps before virtual rendering.
7. Scroll intents are stored by path/context, gated by index map versions, then resolved late against the newest visible row map.

The important lesson is not IndexedDB by itself. The important lesson is the clear split between durable source/derived data, synchronous render reads, provider work queues, pane-specific row projection, and deterministic scroll reveal after structural changes.

## Svelte Translation

| Notebook Navigator pattern | Decision | Vaultman/Svelte translation | Reason |
| --- | --- | --- | --- |
| IndexedDB as rebuildable file-derived cache | Reject for the first structural slice; adopt as media-cache follow-up | Start with versioned in-memory explorer snapshots built from existing indexes/providers. Add a separate cache DB for cached images/previews once the row identity contract is proven. | The current Vaultman problem is structural ownership and invalidation. Cached explorer images are different: blobs are rebuildable, expensive, and should not live in structural snapshots. |
| Memory cache mirrored from storage | Adopt concept, adapt backing | Create an `ExplorerDataPlane` service that exposes immutable structural snapshots, lookup maps, revisions, and subscriptions. Use `$state.raw` or immutable assignments for large snapshot objects in `.svelte.ts`. | Svelte can expose synchronous reads without a React provider stack. Immutable snapshot replacement makes revision changes explicit. |
| Content provider registry | Adapt | Keep Files/Tags/Props providers as domain/source adapters. If later derived-content jobs are needed, add a registry-like queue behind the data plane, not inside `panelExplorer`. | Vaultman providers currently mix facts, actions, search/sort, overlays, and view service calls. A registry is useful only after source facts are separated. |
| React context readiness gates | Adapt | Use a small Svelte context or service singleton for data-plane readiness and snapshot access. Keep component state local for pane chrome and virtualizer inputs. | Svelte context is enough for dependency injection; React-style context nesting is not the target architecture. |
| Derived row lists and stable maps | Adopt | Data plane owns structural rows/lookups/revisions. `ViewService` owns semantic/decorative layers. View adapters receive row inputs and maps, not provider-specific overlay props. | This matches the taxonomy split: structural, decorative, and control invalidation should not force the same rebuild path. |
| Per-row subscriptions | Defer generic row subscriptions; adopt file/node-level media subscriptions | Start with source index subscriptions plus snapshot revision subscriptions. Add narrow subscriptions for media status/key changes when cached images are introduced. | Vaultman already has `createNodeIndex.subscribe` and `ViewService.subscribe`; a narrow media channel avoids fragmented invalidation while still letting visible rows update thumbnails independently. |
| Scroll index versioning | Adopt | Represent reveal requests as `{ id, align, reason, minSnapshotRevision }`; resolve the id to index only after the target adapter confirms the relevant row map revision. | This directly addresses virtualizer index drift when structural rows change. |
| Pane-local TanStack virtualizers | Adopt | Keep `@tanstack/svelte-virtual` inside tree/grid/table/cards/list adapters. Feed stable item keys, row counts, size estimates, and id-to-index maps from snapshots. | Virtual scroll behavior is visual and adapter-specific; centralizing the virtualizer would couple panes unnecessarily. |
| React memo hooks | Translate | Use `$derived` for pure derived values, `$state.raw` for large immutable snapshots, `SvelteMap`/`SvelteSet` where keyed collections must be reactive, and stores/`createSubscriber` for external event streams. | Svelte 5 runes give cleaner extracted reactive services than literal `useMemo`/`useCallback` ports. |

## Storage Decision

Vaultman should start with versioned in-memory structural snapshots, not persistent structural storage.

Adopt now:

- `ExplorerDataPlane` as the memory-resident owner of structural snapshots.
- Immutable snapshot replacement with explicit revision numbers.
- Synchronous getters for current snapshot, row lookup, and id-to-index maps.
- Subscription APIs for structural revision and layer revision changes.
- Rebuild-from-source semantics: snapshots can be regenerated from existing indexes/providers without persistent cache migration.

Defer:

- IndexedDB or other persistent stores for structural snapshots.
- Background content-provider job queues beyond current source indexes.
- Generic row-level subscription channels.

Accept as a separate follow-up:
- a media/derived-content cache database for cached explorer images, previews, and future visual assets;
- metadata records by file path or stable node id with `mediaStatus`, `mediaKey`, source mtime/hash, dimensions, generation time, and error state;
- separate blob storage validated by expected `mediaKey`, plus a bounded blob LRU and file/node-level media subscriptions for visible rows.

Notebook Navigator separates feature-image status/key from blob storage; rows subscribe to file-level content changes and lazily load blobs by key. Vaultman should copy that boundary, not copy IndexedDB into structural snapshots.

Revisit structural persistence only if a later vertical spec proves one of these:
- structural derived content is too expensive to rebuild;
- startup or filter changes require profiled large recomputation;
- non-media metadata or structural invalidation needs version markers across plugin reloads.

## Data Plane Shape For Wave 4

The Wave 4 implementation specs should treat this as the provisional target:

```ts
type ExplorerSnapshot = {
  revision: number;
  providerKey: string;
  rows: readonly ExplorerRow[];
  byId: ReadonlyMap<string, ExplorerRow>;
  idToIndex: ReadonlyMap<string, number>;
  sourceRevisions: ExplorerSourceRevisions;
  projection: ExplorerProjectionMetadata;
};
```

The shape is intentionally structural. It does not own selection, hover, active node, queue badge UI, active-filter badge UI, or virtualizer instances.
Those remain control/decorative/adapter concerns until the vertical specs prove otherwise.

## Reconciliation With Current Taxonomy

- Confirms the taxonomy rule that `TreeNode` compatibility should remain while views migrate.
- Confirms `ViewLayers` should stay the canonical decorative layer vocabulary.
- Confirms `NodeSelectionService` should remain the control-state authority.
- Strengthens the need for a reveal-by-id command that is gated by snapshot revisions, not by stale indexes.
- Strengthens the decision to avoid IndexedDB in the first implementation slice.
- Adds one missing term: **snapshot readiness gate**, the point at which an adapter knows a requested structural revision has produced a visible row map.

## Required Wave 4 Test Gates

- Unit tests for snapshot generation from Files source facts.
- Unit tests for structural vs decorative invalidation keys.
- Unit tests for reveal-by-id version gating and late id-to-index lookup.
- `ViewService` batch/layer tests that confirm decorative changes do not rebuild structural rows.
- Compatibility tests that existing tree/grid/table/cards inputs still render from `TreeNode`-compatible rows.
- Targeted performance probe for repeated queue/active-filter changes while row structure is stable.

## Open Questions

- Which Wave 2 findings change, narrow, or strengthen the provisional Wave 3 translation decisions before Wave 4?
- Should the first data-plane slice include Tags/Props read-only snapshots, or should it prove the contract with Files tree only?
- Which source owns expansion-visible tree shape: the structural snapshot, the adapter projection, or a compatibility layer during migration?
- Where should snapshot readiness live: `ExplorerDataPlane`, `panelExplorer`, or each view adapter?

## Exit State

Wave 3 has an initial research record. It is sufficient to inform a Files-first Wave 4 implementation spec only after revalidation against the Wave 2 shards.
It is not sufficient to publish final issues without approved implementation specs and plan comparison.
