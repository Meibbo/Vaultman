---
title: Scout A1 Files source and tree contracts
type: scout-report
status: draft
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff|wave-a-b-claude-handoff]]"
created: 2026-05-12T08:00:17
updated: 2026-05-12T08:00:17
tags:
  - agent/scout
  - initiative/hardening
  - explorer/files
  - scout-report
created_by: claude
updated_by: claude
---

# Scout A1 — Files source and tree contracts

## Files Read

- `src/types/typeNode.ts` — `TreeNode<TMeta>` and `FileMeta` definitions.
- `src/types/typeExplorer.ts` — `ExplorerProvider<TMeta>` contract that `explorerFiles` implements.
- `src/types/typeContracts.ts` — `NodeBase`, `FileNode`, `INodeIndex<TNode>`, `IFilesIndex`.
- `src/providers/explorerFiles.ts` — Files provider; owns `getTree()`, decoration, adoption, search/sort/hidden state, and action hooks.
- `src/logic/logicsFiles.ts` — `FilesLogic` (pure helpers: `filterFlat`, `buildFileTree`, `flatList`, `orderFoldersFirst`).
- `src/index/indexNodeCreate.ts` — `createNodeIndex` generic factory implementing `INodeIndex<TNode>`.
- `src/index/indexFiles.ts` — `createFilesIndex(app)` factory.
- `src/main.ts` (offsets only) — confirms `filesIndex` is wired to `createFilesIndex` and reachable as `this.plugin.filesIndex` on the provider.
- `src/services/serviceViews.svelte.ts` (lines 95-145) — `viewService.getModel()` that `_decorateTree` calls.
- `test/unit/components/explorerFiles.test.ts` — provider behavior tests (full).
- `test/unit/logic/logicsFiles.test.ts` — `FilesLogic` tests.
- `test/unit/services/serviceFilesIndex.test.ts` — `createFilesIndex` tests.
- `.agents/docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice.md` — target spec.
- `.agents/docs/work/hardening/issues/explorer-data-plane/002-files-snapshot-data-plane-foundation.md` — EDP-002 acceptance.
- `.agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff.md` — handoff and scout dispatch.

## Current TreeNode contract

`src/types/typeNode.ts:29-42` defines `TreeNode<TMeta>` and `src/types/typeNode.ts:56-60` defines `FileMeta`:

```ts
// src/types/typeNode.ts:29-42
export interface TreeNode<TMeta = unknown> {
    id: string;
    label: string;
    labelPrefix?: string;
    icon?: string;
    count?: number;
    countLabel?: string;
    badges?: NodeBadge[];
    children?: TreeNode<TMeta>[];
    depth: number;
    meta: TMeta;
    cls?: string;
    highlights?: { start: number; end: number }[];
}
```

```ts
// src/types/typeNode.ts:56-60
export interface FileMeta {
    file: TFile | null; // null = folder node
    isFolder: boolean;
    folderPath: string;
}
```

Notes:

- `TreeNode` mixes structural fields (`id`, `label`, `depth`, `meta`, `children`) with decoration fields (`icon`, `count`, `countLabel`, `badges`, `cls`, `highlights`, `labelPrefix`). `count`/`countLabel` are filled inside `FilesLogic.buildFileTree`, so they ride structure today; `icon`, `highlights`, and `cls` are set later in `_decorateTree`.
- The provider contract that consumes `TreeNode` lives at `src/types/typeExplorer.ts:29-64` (`ExplorerProvider<TMeta>`): `getTree(): TreeNode<TMeta>[]` is the spine; action hooks (`handleNodeClick`, `handleContextMenu`, `handleHoverBadge`, `onRename`, `getNodeType`, etc.) all receive `TreeNode<TMeta>` and read `node.meta`.
- The Files-side metadata is `FileMeta`. Folder nodes use `{ file: null, isFolder: true, folderPath }`; file nodes use `{ file, isFolder: false, folderPath }`. Adopted children reuse `FileMeta` with `file = AdoptedNode.file` (may be the host TFile) (`src/providers/explorerFiles.ts:471-488`).

## explorerFiles.getTree() composition map

The single entry point that mixes all responsibilities is `src/providers/explorerFiles.ts:127-158`:

```ts
// src/providers/explorerFiles.ts:127-158
getTree(): TreeNode<FileMeta>[] {
    const source = this.sourceFiles();
    const getSearchBuffer = this.plugin.filesIndex
        ? (path: string) => this.fileSearchBuffer(path)
        : undefined;
    const filtered = PerfMeter.time('explorer.files.filterFlat',
        () => this.logic.filterFlat(source, this.searchName, this.searchFolder, getSearchBuffer), ...);
    const sorted = PerfMeter.time('explorer.files.sort',
        () => this._sortFiles(filtered), ...);
    const tree = PerfMeter.time('explorer.files.buildTree',
        () => this.logic.buildFileTree(sorted, { foldersFirst: this.foldersFirstEnabled() }), ...);
    PerfMeter.time('explorer.files.decorateTree',
        () => this._decorateTree(tree), ...);
    this.attachAdoptedChildren(tree);
    return tree;
}
```

Responsibilities, by region:

1. Source selection (file set choice):
   - `sourceFiles()` at `src/providers/explorerFiles.ts:331-336` — branches on `showSelectedOnly`, active filter tree, or vault files.
   - `hasActiveFilterTree()` at `src/providers/explorerFiles.ts:338-342`.
   - `vaultFiles()` at `src/providers/explorerFiles.ts:344-351` — prefers `plugin.filesIndex.nodes.map(n => n.file)` and falls back to `app.vault.getFiles()` / `getMarkdownFiles()`.
2. Hidden filter (visibility projection):
   - `visibleFiles(files)` at `src/providers/explorerFiles.ts:357-360` and `hasHiddenPathSegment` at `src/providers/explorerFiles.ts:495-500`. Driven by `showHiddenFiles` flag (`setShowHiddenFiles`, `src/providers/explorerFiles.ts:327-329`) initialized from `settings.explorerFilesShowHidden` at `src/providers/explorerFiles.ts:48`.
3. Search projection (name/folder query):
   - `logic.filterFlat(source, searchName, searchFolder, getSearchBuffer)` invoked inside `getTree` (`src/providers/explorerFiles.ts:132-137`).
   - State setters: `setSearchTerm` at `:309-311` and `setSearchFilter` at `:312-315`.
   - `fileSearchBuffer(path)` at `:353-355` reads `plugin.filesIndex.getSearchBuffer(path)`.
   - Pure logic in `src/logic/logicsFiles.ts:75-98`.
4. Sort projection:
   - `_sortFiles(filtered)` at `src/providers/explorerFiles.ts:407-423` — supports `name`, `date`, `count`; depends on `app.metadataCache.getFileCache(file).frontmatter`.
   - Setter `setSortBy` at `:316-319`.
5. Folder tree construction (pure structural):
   - `logic.buildFileTree(sorted, { foldersFirst })` invoked at `:144-149`.
   - Folders-first option: `foldersFirstEnabled()` at `:362-364` reading `settings.explorerFilesFoldersFirst`.
   - Pure code lives at `src/logic/logicsFiles.ts:18-72` (folder map, `ensureFolder`, per-file node creation, `propCount`, `extension`, `isMarkdown`, `orderFoldersFirst`).
6. Adopted children (structural mutation after tree build):
   - `attachAdoptedChildren(tree)` at `src/providers/explorerFiles.ts:451-469`.
   - Builder `toAdoptedTreeNodes` at `:471-488`.
   - Async preloader `preloadAdoptedChildren` at `:165-179` populates `adoptedOutlineCache`.
   - Source factory `buildOutlineForFile` from `src/providers/explorerOutline.ts` and `AdoptionService.filterChildren` (`src/services/serviceAdoption.svelte.ts`).
7. Decoration (visual layer):
   - `_decorateTree(nodes)` at `src/providers/explorerFiles.ts:181-216` — calls `plugin.viewService.getModel({ explorerId: 'files', mode: 'tree', nodes: [n], operations, activeFilters, revisions, getLabel, getDecorationContext })` per node, then writes `n.icon`, `n.highlights`, `n.cls` from the resulting `viewRow`.
   - `revisions` are sourced from `plugin.filesIndex?.revision`, `plugin.operationsIndex?.revision`, `plugin.activeFiltersIndex?.revision` (`:184-188`). Queue and filter revisions only affect decoration.
   - `viewService.getModel` is defined at `src/services/serviceViews.svelte.ts:110-145`.

Action-hook surface (unaffected by structural extraction but consumes `TreeNode<FileMeta>`):

- `handleNodeClick` (`:231-233`), `handleNodeSecondaryAction` (`:235-242`), `handleNodeSelection` (`:244-260`), `handleContextMenu` (`:262-280`), `getNodeType` (`:282-284`), `handleHoverBadge` (`:286-307`), context menu actions (`registerActions`, `:52-125`).

## Files index API surface

`createFilesIndex` is at `src/index/indexFiles.ts:5-16`:

```ts
// src/index/indexFiles.ts:5-16
export function createFilesIndex(app: App): IFilesIndex {
    return createNodeIndex<FileNode>({
        build: () =>
            (app.vault.getFiles?.() ?? app.vault.getMarkdownFiles()).map((file) => ({
                id: file.path,
                path: file.path,
                basename: file.basename,
                file,
            })),
        searchText: (node) => `${node.basename}\n${node.path}\n${node.file.extension ?? ''}`,
    });
}
```

The surface delivered to `explorerFiles` is `IFilesIndex = INodeIndex<FileNode>` (`src/types/typeContracts.ts:123`), where `INodeIndex<TNode>` is at `src/types/typeContracts.ts:106-121`:

```ts
// src/types/typeContracts.ts:106-121
export interface INodeIndex<TNode extends NodeBase> {
    readonly nodes: readonly TNode[];
    readonly flatIds: readonly string[];
    readonly revision: number;
    refresh(): void | Promise<void>;
    subscribe(cb: () => void): () => void;
    byId(id: string): TNode | undefined;
    getSearchBuffer(id: string): string;
}
```

The generic factory honoring this surface is `createNodeIndex` at `src/index/indexNodeCreate.ts:10-71`:

- Maintains private `_nodes`, `_flatIds`, `_byId`, `_searchById`.
- `revision` is `publishedRevision`, incremented only on a successful `refresh()` publish (`src/index/indexNodeCreate.ts:53`).
- `subscribe(cb)` returns an unsubscribe and is fired after publish (`src/index/indexNodeCreate.ts:55-58`, `60-63`).
- `flatIds` is the flat list of node ids matching the current `nodes` snapshot.
- `byId` is `Map<string, TNode>.get`.
- `getSearchBuffer(id)` returns the precomputed normalized lowercase string per node.

Wiring confirmation: `src/main.ts:92` declares `filesIndex!: IFilesIndex`; `src/main.ts:150` constructs it; `src/main.ts:154` runs initial `refresh()`; `src/main.ts:160` debounces `refresh()` on `create/delete/rename` (`:171-179`); `src/main.ts:243` re-refreshes from a setting change.

Conclusion: the immutable revisioned surface described in the spec already exists. `flatIds`, `byId`, `revision`, `subscribe` are all present on `plugin.filesIndex`. There is no `pathToId`/`folderPathToId` lookup yet — those are EDP-002's job in the snapshot.

## Proposed undecorated structural source method

Add a sibling to `getTree()` on `explorerFiles` that returns the same `TreeNode<FileMeta>[]` shape as today but skips `_decorateTree`. The method should still apply: source selection, hidden filter, search, sort, folder build, adopted-children attach. It is the input the EDP-002 pure snapshot builder will consume.

Proposed signature (read-only, no decoration):

```ts
// src/providers/explorerFiles.ts (proposed addition)
/**
 * Structural source tree for the Files explorer (data-plane input).
 *
 * Returns the same TreeNode<FileMeta>[] shape as getTree() but skips
 * `_decorateTree`. Reuses sourceFiles -> filterFlat -> _sortFiles ->
 * buildFileTree -> attachAdoptedChildren so EDP-002's snapshot builder
 * can derive rows, maps, and ids without ever observing queue or
 * filter revisions.
 *
 * Used by `serviceExplorerDataPlane`. `getTree()` is unchanged and
 * remains the decorated path used by `panelExplorer.svelte`.
 */
getStructuralTree(): TreeNode<FileMeta>[];
```

How it reuses internals without breaking `getTree()`:

- Extract `getTree()`'s body up to (but not including) `_decorateTree` into a private helper, e.g. `private buildStructuralTree(): TreeNode<FileMeta>[]` that returns `tree` after `attachAdoptedChildren`.
- `getTree()` keeps its existing semantics: it calls `buildStructuralTree()` and then runs `_decorateTree(tree)` before returning.
- `getStructuralTree()` is the public read-only version: just `return this.buildStructuralTree();`.
- `PerfMeter.time` envelopes (`explorer.files.filterFlat`, `.sort`, `.buildTree`) move into the helper so both callers benefit; `explorer.files.decorateTree` stays in `getTree()`.
- All action hooks keep operating on `TreeNode<FileMeta>` because both paths produce the same `TreeNode` shape; only `icon`/`highlights`/`cls` differ.

A structural revision counter (the spec's `structureRevision`) can be derived without storing one on the provider:

```ts
getStructuralRevision(): {
    filesRevision: number;
    searchKey: string;     // `${searchName} ${searchFolder}`
    sortKey: string;       // `${sortBy}:${sortDir}`
    showHiddenFiles: boolean;
    showSelectedOnly: boolean;
    foldersFirst: boolean;
    adoptionEnabled: boolean;
    adoptionCacheRevision: number;  // simple counter incremented in preloadAdoptedChildren
};
```

The data-plane service hashes these fields to detect structural-only invalidations (matches §"Structural Invalidation" in the spec). Queue revision and filter revision are intentionally absent.

Note: `_sortFiles` uses `metadataCache.getFileCache(file).frontmatter` for the `count` sort and may produce non-deterministic order if the cache lags. That risk already exists; flagging in §Risks.

## Tests already covering Files provider behavior

- `test/unit/components/explorerFiles.test.ts` — primary provider test surface:
  - Node click selects files instead of opening or filtering (`L56-67`).
  - Secondary action opens the file via `openLinkText` (`L69-80`).
  - Context-menu `file.delete` action queues delete change (`L82-106`).
  - Multi-selection delete via registered action (`L108-133`).
  - `setShowSelectedOnly` keeps active filter untouched (`L135-144`).
  - Non-markdown vault files appear in tree when no active filter tree (`L146-157`).
  - Hidden dot-prefixed files/folders default to hidden (`L159-177`).
  - `explorerFilesShowHidden=true` exposes them (`L179-199`).
  - Folders-first ordering on by default (`L201-229`); off when setting disabled (`L231-254`).
  - Missing ancestor folder nodes are created from file paths (`L256-278`).
  - Context menu opens for folder nodes (`L280-303`).
  - `countLabel` is the extension for non-markdown files (`L305-320`).
  - PNG root files get `lucide-image` icon (`L322-335`).
  - Rename handoff dispatch via context action (`L337-366`).
  - `handleHoverBadge` routes `set`/`delete` to queue (`L368-387`) and propagates across selected nodes (`L389-412`).
  - Adopted-children path: enabled (`L414-433`), disabled (`L435-455`), preload notifies subscribers (`L457-479`).

- `test/unit/logic/logicsFiles.test.ts` — pure structural logic:
  - `flatList` returns copy (`L19-25`).
  - `buildFileTree` groups files under folder nodes (`L27-40`).
  - `propCount` excludes `position` (`L42-51`).
  - `filterFlat` name/folder substring (`L53-59`).
  - `filterFlat` consumes precomputed lowercase search buffers (`L61-69`).

- `test/unit/services/serviceFilesIndex.test.ts` — `createFilesIndex` factory:
  - Includes all file types, not only markdown (`L6-16`).
  - `byId` uses path (`L18-24`).
  - Search buffer contains lowercase basename, path, extension (`L26-37`).

Other tests reference the Files provider indirectly via `serviceFilter`, `serviceAPI`, and component tests (`test/component/pageFilters*.test.ts`, `test/component/cmenuSetAction.test.ts`, etc.) but assert filter/page behavior, not Files tree structure.

## Risks and Open Questions

1. Folder count of adopted-child structural source. `attachAdoptedChildren` overwrites `node.children` on file nodes whose `adoptedOutlineCache` is populated. EDP-002 must decide whether structural snapshot rows include adopted children (recommended: yes, since `panelExplorer` selection/reveal already traverses them) and whether expansion state for adopted ids is namespaced (current `id` is `node.id` from `AdoptedNode`, which may collide if not folder-prefixed — confirm with A2 scout).
2. Hidden-file behavior is currently a one-shot `visibleFiles(files)` filter on `sourceFiles()`. EDP-002 should not double-filter inside the snapshot builder; the builder should treat the structural tree as already-projected. Document this as an invariant of `getStructuralTree()`.
3. Action-hook compatibility. All hooks accept `TreeNode<FileMeta>`. Because we keep both paths emitting the same `TreeNode` shape, hooks keep working. However, if the snapshot service ever stores rows wrapping clones of `TreeNode`, action callers must dereference `row.node` (preserved by-reference per spec §"File Responsibilities"). Plan must require identity preservation.
4. `count` and `countLabel` are produced in `FilesLogic.buildFileTree` (structural), but they look like "decoration." Spec says structural snapshot rows must not contain badges/highlights/cls/etc., yet leaves `count`/`countLabel` ambiguous. Recommend: keep `count`/`countLabel` as structural facts (they are derived from frontmatter+extension at tree-build time, no overlay/filter dependency). Flag this for plan author confirmation; `propCount` does depend on `app.metadataCache`, so it has a hidden mutability concern.
5. `_sortFiles` reads `metadataCache.getFileCache(file).frontmatter` for the `count` sort. If the cache is stale relative to `filesIndex.revision`, the structural snapshot can mis-order rows without a revision bump. EDP-002 does not need to fix this, but the structural revision needs to incorporate `propsIndex.revision` (or the metadata cache version) when `sortBy === 'count'`. Flag for the plan to add a conditional revision component.
6. `vaultFiles()` prefers `plugin.filesIndex.nodes` only when non-empty; otherwise falls back to `app.vault.getFiles()`. The structural source should funnel through the index so `filesIndex.revision` is meaningful. Recommend: make `getStructuralTree()` rely on `filesIndex.nodes` directly when available and only fall back during tests. Tests construct the provider without populated `filesIndex.nodes` in many cases — see `mockApp` usage — so the fallback must remain.
7. `_decorateTree` recurses into `n.children`. If the structural tree already contains adopted children, decoration also applies there. EDP-002 should not regress this: `getTree()` keeps full decoration including adopted subtrees. The structural method does not decorate at all; consumers needing decorated rows continue to use `getTree()`.
8. `getFiles()` (line `:218-229`) duplicates the source/filter steps. If EDP-002 introduces a structural cache, `getFiles()` and `getStructuralTree()` should ideally share it. The plan should leave this optimization out of EDP-002 to keep scope minimal and avoid touching `getFiles` semantics consumed by `pageFilters*` flows.
9. Subscription wiring. `explorerFiles.subscribe` (`:160-163`) is fired only by `fire()` in `preloadAdoptedChildren` (`:178`). Other state changes (sort, search, hidden) currently rely on `panelExplorer.svelte`'s own subscriptions to indexes. The data-plane service should subscribe to `filesIndex.subscribe` and the provider's `subscribe`, then call `getStructuralTree()` on tick. Confirm in A2 plan.
10. Type-only sharding. `typeExplorerDataPlane.ts` should import `TreeNode<TMeta>` and `NodeBase`, and re-export `ExplorerSnapshot<TMeta>`/`ExplorerSnapshotRow<TMeta>`/`ExplorerDataPlaneRevisions`. The latter is referenced in spec §"Target Contract" but undefined yet — the plan must define it; suggest `{ filesRevision: number; structureKey: string }` for the first slice.

## Proposed exact files and tests the plan should touch

Files to add:

1. `src/types/typeExplorerDataPlane.ts` — `ExplorerSnapshot<TMeta>`, `ExplorerSnapshotRow<TMeta>`, `ExplorerDataPlaneRevisions`, `ExplorerDataPlaneSource<TMeta>` (optional adapter interface with `getStructuralTree()` and `getStructuralRevisions()`).
2. `src/logic/logicExplorerSnapshot.ts` — pure `buildExplorerSnapshot({ explorerId, providerKey, tree, expandedIds, revisions })` that walks the `TreeNode<TMeta>[]` and emits `rows`, `visibleIds`, `byId`, `idToIndex`, `pathToId`, `folderPathToId`, `tree`, `revision`, `structureRevision`. Identity-preserving for `node`.
3. `src/services/serviceExplorerDataPlane.svelte.ts` — `$state.raw` snapshot store; `snapshot(explorerId)`, `publish(explorerId, snapshot)`, `subscribe(explorerId, cb)`, `clear(explorerId)`. Auto-increments stored `revision` on replacement.
4. `test/unit/logic/logicExplorerSnapshot.test.ts` — rows, parent/child links, depth, `visibleIds`, `byId`, `idToIndex`, `pathToId`, `folderPathToId`, duplicate labels (different paths), hidden subtree absence, adopted child rows, identity preservation, stable order after rebuild.
5. `test/unit/services/serviceExplorerDataPlane.test.ts` — publish replaces snapshot, revision increments only on publish, `subscribe` fires synchronously on publish and only for matching `explorerId`, `clear` removes and re-publishing resets revision baseline appropriately, immutable read returns the same reference until next publish.

Files to modify:

6. `src/providers/explorerFiles.ts` — extract the body of `getTree()` (up to and including `attachAdoptedChildren`) into `private buildStructuralTree()`; add public `getStructuralTree()` and `getStructuralRevisions()`; keep `_decorateTree` inside `getTree()` unchanged. Do not change action hooks, sort/search/hidden setters, or `getFiles()`.
7. (Type imports only; no behavior change) `src/types/typeExplorer.ts` — optionally widen `ExplorerProvider<TMeta>` with `getStructuralTree?(): TreeNode<TMeta>[]` and `getStructuralRevisions?(): unknown`. Spec leaves this as "optional data-plane adapter method." Keep optional to preserve other providers.

Tests to extend:

8. `test/unit/components/explorerFiles.test.ts` — add two cases:
   - `getStructuralTree()` returns the same structural tree as `getTree()` minus decoration (`icon`/`highlights`/`cls` absent or equal to pre-decoration values).
   - Action hooks (rename, delete, hover badge) continue to operate when given a node taken from `getStructuralTree()` (parity with the existing `getTree()`-based assertions).

Tests not to touch in this slice:

- `test/component/panelExplorerSelection.test.ts` and `viewTree`/scroll tests are A2's territory.
- `test/unit/logic/logicsFiles.test.ts` and `test/unit/services/serviceFilesIndex.test.ts` should remain green without edits.

Out of scope for EDP-002 (deferred per handoff):

- Media cache DB (`EDP-007`).
- Overlay projection extraction (`EDP-008`).
- Adapter row contract migration (`EDP-009`).
- Selection mirror cleanup (`EDP-010`).
- Persistent structural snapshot storage; generic row-level subscriptions.
