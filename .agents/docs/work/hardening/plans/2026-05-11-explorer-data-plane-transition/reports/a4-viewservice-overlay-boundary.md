---
title: Scout A4 ViewService and overlay boundary
type: scout-report
status: draft
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff|wave-a-b-claude-handoff]]"
created: 2026-05-12T02:41:14
updated: 2026-05-12T02:41:14
tags:
  - agent/scout
  - initiative/hardening
  - explorer/views
  - scout-report
created_by: claude
updated_by: claude
---

# Scout A4 — ViewService and overlay boundary guard

## Files Read

- `src/services/serviceViews.svelte.ts` (full, 1092 lines)
- `src/types/typeViews.ts` (full)
- `src/types/typeNode.ts` (full)
- `src/utils/utilViewLayers.ts` (full)
- `src/utils/utilBadgeBubbling.ts` (lines 1-40)
- `src/services/serviceDecorate.ts` (full)
- `src/services/serviceOverlayState.svelte.ts` (full — unrelated; this is popover stack)
- `src/services/serviceVirtualizer.svelte.ts` (lines 1-40)
- `src/services/badgeRegistry.ts` (re-exports `badges/serviceBadge`)
- `src/providers/explorerFiles.ts` (lines 1-260, 451-460)
- `src/providers/explorerTags.ts` (lines 130-200 via grep)
- `src/components/containers/panelExplorer.svelte` (lines 300-380; grep for badges/hover)
- `src/components/views/viewTree.svelte` (lines 120-145; grep for hover)
- Specs `14-...first-slice.md` and `15-...overlay-batching.md` and issues EDP-002/EDP-004.

## Current overlay/decoration state in serviceViews.svelte.ts

The service is the canonical decorative engine. It batches overlay-layer composition behind `getModel()` per row. Decorative slots live in these fields (`src/services/serviceViews.svelte.ts`):

- `decorationManager` and `decorationRevision` — `src/services/serviceViews.svelte.ts:80` and `:84`. The revision bumps whenever the decoration manager fires, then `semanticLayerCache.clear()` + `notifyAll()` at `:103-107`.
- `selections: SvelteMap<string, SvelteSet<string>>` — `src/services/serviceViews.svelte.ts:87`.
- `expanded: SvelteMap<string, SvelteSet<string>>` — `:88`.
- `focused: SvelteMap<string, string | null>` — `:89`.
- Cached query indices for queue/active-filter decoration: `lastOps`, `lastFilters`, `cachedOpIndex`, `cachedFilterIndex` — `:93-96`.
- `semanticLayerCache: Map<string, ViewLayers>` keyed by revision-stamped composite key — `:97`, cap `MAX_SEMANTIC_LAYER_CACHE_ENTRIES = 5000` at `:44`.
- `EXPLORER_REVISION_FIELDS` enumerates the decorative revision contract: `filesRevision`, `propsRevision`, `tagsRevision`, `contentRevision`, `queueRevision`, `filterRevision` — `:35-42`.
- Per-row composition assembles `ViewLayers` of `icons | badges (ops | filters | warnings | inherited | counts) | highlights (query | filter | warning) | state (selected/focused/activeFilter/searchMatch/deleted/pending/disabled/warning/editing/dropTarget/dragging) | marks` — see `toRow()` `:284-319` and `mergeLayers()` `:1028-1040`.
- Queue-badge layer builders: `operationLayersFor()` `:507-532` and `matchedOperationLayersFor()` `:606-649` (the latter is the per-node queue-decoration that today fires inside Files `_decorateTree`).
- Active-filter layer builders: `filterLayersFor()` `:534-566`, `filterGroupLayersFor()` `:568-604`, `matchedActiveFilterLayersFor()` `:651-703`.
- The model returned by `getModel()` also exports `virtualization: { rowHeight: 32, overscan: 5 }` and `selection`/`focus`/`sort`/`search`/`empty` containers — `:140-143`.

Notable note: there is no `hover` or `dragging` mutator on `ViewService`. Hover-badge UI is computed inline in `src/components/views/viewTree.svelte:128-134` via `hoverBadgesFor(node)` against an externally supplied `activeOpsByNode`. `dragging`/`dropTarget` exist only as flag slots in `ViewStateLayers` (`src/types/typeViews.ts:79-80`) and no caller writes them through `ViewService`.

`src/services/serviceOverlayState.svelte.ts` is unrelated to row overlays — it is a popover stack (`push`, `pop`, `popById`) used for modal layering. Out of scope for EDP-002/EDP-004.

## explorerFiles decoration site

`src/providers/explorerFiles.ts:127-158` shows `getTree()` running, in order: `sourceFiles` -> `filterFlat` -> `_sortFiles` -> `buildFileTree` -> `_decorateTree` -> `attachAdoptedChildren`. The decoration block is recursive, one node per `getModel()` call:

```
181  private _decorateTree(nodes: TreeNode<FileMeta>[]): void {
182    const operations = this.plugin.operationsIndex.nodes;
183    const activeFilters = this.plugin.activeFiltersIndex.nodes;
184    const revisions = {
185      filesRevision: this.plugin.filesIndex?.revision,
186      queueRevision: this.plugin.operationsIndex?.revision,
187      filterRevision: this.plugin.activeFiltersIndex?.revision,
188    };
189
190    for (const n of nodes) {
191      const viewRow = this.plugin.viewService.getModel({
192        explorerId: 'files',
193        mode: 'tree',
194        nodes: [n],
195        operations,
196        activeFilters,
197        revisions,
198        getLabel: (item) => item.label,
199        getDecorationContext: () => ({ ... kind: 'file', highlightQuery, isFolder, filePath, basename, folderPath, extension }),
200      }).rows[0];
201
202      n.icon = viewRow.icon;
203      n.highlights = highlightsFromViewLayers(viewRow.layers);
204      n.cls = withViewStateClasses(n.cls, viewRow.layers);
205
206      if (n.children?.length) this._decorateTree(n.children);
207    }
208  }
```
(numbers in the snippet match `src/providers/explorerFiles.ts:181-216`.)

Queue/filter revisions enter through `operationsIndex.revision` and `activeFiltersIndex.revision` (`:186-187`). They feed the per-row `getModel()` cache key (`src/services/serviceViews.svelte.ts:403-421`) and are the exact knob `EDP-004` will batch. The decoration write-back currently mutates the `TreeNode` in place — assigning `n.icon`, `n.highlights`, `n.cls` directly on the same node references the structural builder produced.

Parallel sites in other providers — same pattern, same `ViewService.getModel` call:
- `src/providers/explorerTags.ts:147` (`_decorateTree(nodes, parentDeleted)`)
- `src/providers/explorerProps.ts` (analogous, via `operationsIndex|activeFiltersIndex` per grep)
- `src/providers/explorerContent.ts` (analogous)

`bubbleHiddenTreeBadges` reads/writes `node.badges` from `panelExplorer.svelte:318-321` after provider decoration completes (`src/utils/utilBadgeBubbling.ts:9-42`). This is the inherited-badge collapse step EDP-004 reserves.

## Boundary: what EDP-002 must NOT touch

1. `ViewService.getModel()` signature, behaviour, or output shape — `src/services/serviceViews.svelte.ts:110-144`. EDP-002 may consume it for legacy decoration only inside `getTree()`; it must not insert a new caller into the data-plane path.
2. `ViewService.semanticLayerCache` and its key builder `semanticLayerCacheKey()` — `:97`, `:403-421`. Cache invariants belong to EDP-004; the structural snapshot must not key off them.
3. Decoration revision plumbing: `decorationRevision`, `EXPLORER_REVISION_FIELDS`, `revisionCacheKey()` — `:35-42`, `:84`, `:949-961`. EDP-002 may pass `queueRevision`/`filterRevision` THROUGH `sourceRevisions` (see field check below) but MUST NOT use them as inputs to structural rebuild.
4. Per-row layer constructors `operationLayersFor`, `filterLayersFor`, `filterGroupLayersFor`, `matchedOperationLayersFor`, `matchedActiveFilterLayersFor`, `semanticLayersFor` — `:491-703`. Reserved for EDP-004.
5. The legacy `_decorateTree` recursion inside Files/Tags/Props/Content providers — keep callable and untouched so `getTree()` parity holds.
6. `bubbleHiddenTreeBadges` and `utilBadgeBubbling` — `src/utils/utilBadgeBubbling.ts:9-42`. Inherited-badge collapse is decorative and must remain a `panelExplorer` step. Do not call it from snapshot logic.
7. `utilViewLayers.ts` helpers `nodeBadgesFromViewLayers`, `highlightsFromViewLayers`, `withViewStateClasses` — `src/utils/utilViewLayers.ts:5-49`. They are the compatibility bridge spec shard 15 reserves for EDP-004. EDP-002 must not call them.
8. `ViewService` selection/focus/expanded mutators (`select`, `clearSelection`, `toggleExpanded`, `setFocused`) — `:222-269`. Selection mirror cleanup is EDP-010; EDP-002 must not adopt the snapshot as a selection source.
9. `ViewStateLayers` slots `hover`, `dragging`, `dropTarget`, `searchMatch`, `editing` — `src/types/typeViews.ts:69-81`. Even if unused today they are reserved overlay surfaces.
10. `viewTree.svelte` hover-badge path `hoverBadgesFor` and `onHoverBadgeAction` — `src/components/views/viewTree.svelte:128-145`. Hover badge wiring is overlay UI.
11. `DecorationManager` (`src/services/serviceDecorate.ts:38-100`) and its subscription firing — bound into `ViewService` via the constructor at `:103-107`. EDP-002 must not subscribe to it.
12. `TreeVirtualizer` and `Virtualizer` state (`scrollTop`, `viewportHeight`, `overscan`, `flatten`) — `src/services/serviceVirtualizer.svelte.ts:15-40`. Virtualizer state must not become a snapshot field.
13. Per-row queue-action bindings: `sourceId`, `actionId` on `ViewBadge` (`src/types/typeViews.ts:52-53`) — these are overlay metadata.

## Compatibility surfaces that must remain green during EDP-002

These are the consumer-visible contracts whose behaviour must remain identical while the structural snapshot is introduced in parallel:

- `explorerFiles.getTree(): TreeNode<FileMeta>[]` — `src/providers/explorerFiles.ts:127-158`. Output (including post-decoration `n.icon`, `n.highlights`, `n.cls`) is consumed by `panelExplorer` and views.
- Provider action hooks that depend on `TreeNode` `meta`: `handleNodeClick`, `handleNodeSecondaryAction`, `handleNodeSelection`, `handleContextMenu`, `getNodeType`, `handleHoverBadge`, `setSearchTerm`, `setSearchFilter`, `setSortBy`, `setViewMode`, `setAddMode`, `setShowSelectedOnly`, `setShowHiddenFiles` — `src/providers/explorerFiles.ts:231-329`.
- Registered context-menu actions `file.rename`, `file.delete`, `file.set`, `file.move`, `folder.filter` — `src/providers/explorerFiles.ts:52-125` (they receive `MenuCtx.node` which is a `TreeNode<FileMeta>`).
- Adopted-children attachment hook `attachAdoptedChildren` — `src/providers/explorerFiles.ts:451-456`. Must continue to be attached to the same `TreeNode` references the snapshot reports.
- Files spec shard 14 explicit clause: "Provider action hooks still receive `TreeNode` because context menus, queue actions, FnR handoff, rename, delete, file open, and set/filter hover actions expect provider-specific `meta`." (`...14-wave-4-files-tree-snapshot-first-slice.md:135-138`).
- `panelExplorer.bubbleHiddenTreeBadges` perf-instrumented call site — `src/components/containers/panelExplorer.svelte:317-322` must continue to receive a fully decorated `TreeNode[]`.
- `viewTree` hover-badge consumer — `src/components/views/viewTree.svelte:128-145`.
- `ViewService.getModel()` cache hit rate must not regress; structural rebuilds must not invalidate `semanticLayerCache`.

## Signatures and terms to RESERVE without implementing

The plan should name these but mark them deferred so they are not lifted into EDP-002 code:

1. Symbol `serviceExplorerLayers` (or `logicExplorerLayers`) per spec shard 15. Type `ReadonlyMap<string, ViewLayers>` keyed by `ExplorerSnapshotRow.id`. Deferred to EDP-004.
2. Batch projection seam around `ViewService.getModel()` — single-call form taking `{ rows, operations, activeFilters, revisions }`. Deferred to EDP-004.
3. Revisions exported on `ExplorerDataPlaneRevisions` MAY include `queueRevision` and `filterRevision` as carry-through values (see snapshot field check), but the snapshot service must NOT consume them as structural rebuild triggers. Reserved for EDP-004 batch invalidation.
4. New `ViewService` publish points — e.g., `publishLayers(explorerId, layerMap)`. Spec shard 15 says "Modify `serviceViews.svelte.ts` only if current `getModel()` lacks the metadata needed for a stable batch output." Reserved for EDP-004.
5. Compatibility helpers `nodeBadgesFromViewLayers`, `highlightsFromViewLayers`, `withViewStateClasses` — reserved as the legacy `TreeNode` bridge for EDP-004; EDP-002 must not call them.
6. Inherited badge collapse (`bubbleHiddenTreeBadges`) and any future bubble-from-`ViewLayers` form — reserved for EDP-004 / overlay extraction `EDP-008`.
7. Decorative revisions on the snapshot output — `decorationRevision` (counter), `layerRevision`, or `overlayRevision`. None of these may be created in EDP-002.
8. Selection mirror collapse (EDP-010) — `ViewService.selections`/`focused`/`expanded` mirror cleanup. Reserved.
9. Adapter row contract migration (EDP-009) — generic row-level subscriptions, persistent storage. Reserved.
10. Hover-badge service surface — there is no `setHovered` on `ViewService` today; do not create one.

## Coupling risks where structural and decorative state mix

1. `explorerFiles.getTree()` mutates structural `TreeNode` references in-place during decoration (`src/providers/explorerFiles.ts:202-204`: `n.icon = …; n.highlights = …; n.cls = …`). If the snapshot returns the same `TreeNode` instances (spec shard 14 explicitly preserves references), then a subsequent decoration pass will overwrite snapshot fields on those nodes. RISK: snapshot consumers may see decorated `icon`/`highlights`/`cls` because they share the reference. The plan must clarify that `ExplorerSnapshotRow.node` shares identity with decorated `TreeNode` and that `icon`/`highlights`/`cls` on `TreeNode` are decorative and not part of the snapshot contract.
2. `attachAdoptedChildren` is structural but runs after decoration (`src/providers/explorerFiles.ts:156`). Adopted children become structural rows. The snapshot builder must mirror this ordering or the snapshot will silently miss adopted children. Today this happens to use the same mutable `TreeNode` tree.
3. `revisions = { filesRevision, queueRevision, filterRevision }` are passed together to `ViewService.getModel()` (`:184-188`). The structural snapshot output also requires `sourceRevisions` (spec shard 14). If the field set overlaps, callers may incorrectly assume queue/filter revisions invalidate structure. Solution: keep `ExplorerDataPlaneRevisions` distinct from `ExplorerViewRevisions` even if values overlap.
4. `TreeNode.badges` is a structural-looking field on the structural type but is decorative output. The snapshot must not read or republish `node.badges`. (`src/types/typeNode.ts:36`.)
5. `bubbleHiddenTreeBadges` reads `node.children` (structural) and writes `node.badges` (decorative) on the same nodes (`src/utils/utilBadgeBubbling.ts:30-42`). It must not be triggered by snapshot publish; only by panel-level decorative compose.
6. `panelExplorer` calls `provider.getTree()` (`src/components/containers/panelExplorer.svelte:306-310`) and immediately runs `bubbleHiddenTreeBadges`. The data-plane path proposed in shard 14 inserts snapshot publish between these. Make sure the snapshot path still feeds a `TreeNode[]` into bubble — i.e., the snapshot must report `tree` (already in contract) for compatibility.
7. `ViewService.selections.notify()` fires on every selection toggle (`src/services/serviceViews.svelte.ts:451-455`). A structural snapshot subscriber must not be the same subscriber list as selection notifiers; the data-plane service must have its own subscribers (spec shard 14 lists `subscribe` independently).

## Snapshot contract field-by-field overlay check

Walking `ExplorerSnapshot<TMeta>` and `ExplorerSnapshotRow<TMeta>` from spec shard 14 (`14-wave-4-files-tree-snapshot-first-slice.md:40-67`):

| Field | Overlay-free? | Notes |
|-------|---------------|-------|
| `ExplorerSnapshotRow.id` | yes | Structural identity. |
| `ExplorerSnapshotRow.label` | yes | Same `node.label` as builder produced; not the decorated label. |
| `ExplorerSnapshotRow.depth` | yes | Structural. |
| `ExplorerSnapshotRow.parentId` | yes | Structural. |
| `ExplorerSnapshotRow.childrenIds` | yes | Structural. |
| `ExplorerSnapshotRow.node` | BORDERLINE | Same `TreeNode` reference. `TreeNode` exposes decorative fields `icon`, `badges`, `highlights`, `cls`, `count`, `countLabel`, `labelPrefix` (`src/types/typeNode.ts:31-42`). The snapshot CONTRACT must declare these decorative slots non-authoritative and not part of `ExplorerSnapshotRow` semantics; consumers must read them only via the ViewLayers path. Recommend explicit doc-comment on `ExplorerSnapshotRow.node` saying "structural reference; decorative properties on `TreeNode` are not part of the snapshot contract." |
| `ExplorerSnapshotRow.kind` | yes | Domain partition, not overlay. |
| `ExplorerSnapshotRow.domainKey` | BORDERLINE | Spec shard 14 marks it optional. It is intended as a stable per-domain key (file path, tag path, property name) — not an overlay value. Confirm: today no overlay layer keys off `domainKey`. Recommend `domainKey` is sourced from provider `meta` (`folderPath`, `file.path`, `tagPath`, `propName`) and remain structural. Document that decorative caches must continue to key off `node.id`, not `domainKey`. |
| `ExplorerSnapshotRow.path` | yes | Structural file-system path. |
| `ExplorerSnapshot.explorerId` | yes | Routing. |
| `ExplorerSnapshot.providerKey` | yes | Routing. |
| `ExplorerSnapshot.revision` | yes | Snapshot replacement counter only. |
| `ExplorerSnapshot.structureRevision` | yes | Explicitly structural. |
| `ExplorerSnapshot.rows` | yes | Structural projection. |
| `ExplorerSnapshot.tree` | yes (with caveat) | Same `TreeNode[]` reference set; same decorative-on-node caveat as `Row.node`. |
| `ExplorerSnapshot.visibleIds` | yes | Structural. |
| `ExplorerSnapshot.byId` | yes | Structural lookup. |
| `ExplorerSnapshot.idToIndex` | yes | Structural. |
| `ExplorerSnapshot.pathToId` | yes | Structural. |
| `ExplorerSnapshot.folderPathToId` | yes | Structural. |
| `ExplorerSnapshot.sourceRevisions: ExplorerDataPlaneRevisions` | BORDERLINE | Spec shard 14 lists this as opaque carry-through. If it ends up containing `queueRevision`/`filterRevision`, the contract MUST state these are carried only for downstream EDP-004 batch use and never trigger snapshot rebuild. Recommend the EDP-002 plan specify the exact field set: `filesRevision`, `propsRevision`, `tagsRevision`, `contentRevision`, plus an explicit doc-comment that queue/filter revisions are reserved for EDP-004 layer batching and currently must not be set by the structural source. |

All other slots from `ExplorerViewInput`/`ExplorerRenderModel` (`selection`, `focus`, `virtualization`, `capabilities`, `groups`, `columns`, `getDetail`, `getDecorationContext`, etc., in `src/types/typeViews.ts:165-252`) are absent from `ExplorerSnapshot` — confirmed overlay-free.

## Risks and Open Questions

1. Should `ExplorerSnapshotRow.node` retain the SAME `TreeNode` reference that `_decorateTree` later mutates? Spec shard 14 says yes ("Preserve input `TreeNode` references unless a compatibility bridge must clone"). The plan should document that consumers MUST NOT read `node.icon|badges|highlights|cls|labelPrefix|count|countLabel` as snapshot fields.
2. `ExplorerDataPlaneRevisions` exact field set is not enumerated in spec shard 14. Plan must enumerate it and explicitly exclude `queueRevision`/`filterRevision`/`decorationRevision` from structural rebuild triggers.
3. Adopted children are added after decoration (`explorerFiles.ts:156`). Does the snapshot capture them with parent/child links? Test plan should add a fixture for adopted-child structural inclusion (spec shard 14 already lists "adopted child" in the unit fixture list).
4. Provider `subscribe()` already fires on decorative-only changes via the `viewService` subscription chain. The data-plane service should subscribe only to structural triggers (files index revision, search/sort/hidden/expansion). Confirm `panelExplorer` does not double-rebuild.
5. The legacy decoration on a `TreeNode` could leak ViewLayers-derived classes (`is-selected`, `is-focused`, `is-active-filter`, `vm-badge-warning`) onto a node referenced by the structural snapshot. Selection state is decorative; consumers reading the structural row id should re-derive selection from `selectionService`, not from `node.cls`.
6. No hover/dragging mutator exists on `ViewService` today, so EDP-004 will need to design that surface from scratch. Mention as a future concern, do not implement.
7. `serviceOverlayState.svelte.ts` shares the word "overlay" with the EDP-004 scope but is unrelated; the plan should namespace by saying "row overlay layers" to avoid confusion.

## Proposed exact deferred-symbol guards the plan should explicitly state

The plan for EDP-002 should include a "Reserved for EDP-004 and beyond" callout that lists each of these by exact identifier:

- File: `src/services/serviceExplorerLayers.ts` or `src/logic/logicExplorerLayers.ts` — not created in EDP-002.
- Type: `ReadonlyMap<string, ViewLayers>` (the batched layer map) — not exported in EDP-002.
- Symbols: `nodeBadgesFromViewLayers`, `highlightsFromViewLayers`, `withViewStateClasses` (`src/utils/utilViewLayers.ts:5,19,37`) — not called from snapshot/data-plane code in EDP-002.
- Symbol: `bubbleHiddenTreeBadges` (`src/utils/utilBadgeBubbling.ts:9`) — not called from snapshot/data-plane code in EDP-002.
- Methods on `ViewService`: `getModel`, `select`, `clearSelection`, `toggleExpanded`, `setFocused`, `subscribe` (`src/services/serviceViews.svelte.ts:110,232,249,257,264,271`) — read-only for EDP-002 callers; not extended.
- State slots on `ViewService`: `selections`, `expanded`, `focused`, `semanticLayerCache`, `decorationRevision`, `cachedOpIndex`, `cachedFilterIndex` (`:84-97`) — unchanged in EDP-002.
- ViewLayer slots: `ViewBadgeLayers.{ops|filters|warnings|inherited|counts}` (`src/types/typeViews.ts:55-61`), `ViewHighlightLayers.{query|filter|warning}` (`:63-67`), `ViewStateLayers.{selected|focused|activeFilter|searchMatch|deleted|pending|disabled|warning|editing|dropTarget|dragging}` (`:69-81`), `ViewMarkLayer` (`:95-101`) — not produced by snapshot output.
- `TreeNode` decorative fields: `icon`, `badges`, `highlights`, `cls`, `labelPrefix`, `count`, `countLabel` (`src/types/typeNode.ts:32-41`) — declared "not part of the snapshot contract" even though the snapshot shares the same `TreeNode` reference.
- Revisions reserved on `ExplorerDataPlaneRevisions` but unused in EDP-002: `queueRevision`, `filterRevision`, `decorationRevision`, `layerRevision`. The plan should either omit them entirely or include them only with a "reserved; do not set in EDP-002" doc-comment.
- Issues explicitly deferred per handoff (`01-wave-a-b-claude-handoff.md:177-185`): EDP-007 media cache DB, EDP-008 overlay projection extraction, EDP-009 adapter row contract migration, EDP-010 selection mirror cleanup, persistent structural snapshot storage, generic row-level subscriptions.
- Existing recursive `_decorateTree` in `explorerFiles.ts:181-216`, `explorerTags.ts:147`, `explorerProps.ts`, `explorerContent.ts` — left in place; replaced only in EDP-004.
