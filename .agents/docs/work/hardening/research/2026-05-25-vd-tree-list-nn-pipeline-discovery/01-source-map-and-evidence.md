---
title: Source Map And Evidence Ledger
type: research-shard
status: active
parent: "[[index|V.D Tree/List/Notebook Navigator Pipeline Discovery]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/research
  - explorer/performance
  - explorer/view-decomposition
---

# Source Map And Evidence Ledger

Evidence legend:

- `E`: direct source evidence from code.
- `M`: measurement evidence from existing Vaultman records.
- `I`: inference from source shape, to be verified with instrumentation before implementation claims.

## Vaultman Files Read

- `src/components/views/viewTree.svelte`
- `src/components/views/ViewNodeList.svelte`
- `src/components/containers/panelExplorer.svelte`
- `src/components/explorer/ViewHost.svelte`
- `src/logic/logicExplorerSnapshot.ts`
- `src/providers/explorerFiles.ts`
- `src/services/serviceExplorerProjection.ts`
- `src/services/serviceExplorerRowInput.ts`
- `.agents/docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index.md`
- `.agents/docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-tree-large-scroll-follow-up.md`
- `.agents/docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index.md`
- `.agents/docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index.md`

## Notebook Navigator Files Read

- `C:\Users\vic_A\Desktop\notebook-navigator\package.json`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\NavigationPaneContent.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\NavigationPaneLayout.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\NavigationPaneItemRenderer.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\NavigationPaneTreeRow.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\FolderItem.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\TagTreeItem.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\PropertyTreeItem.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\navigationPane\VirtualFolderItem.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\navigationPane\useNavigationPaneData.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\navigationPane\data\useNavigationPaneSourceState.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\navigationPane\data\useNavigationPaneTreeSections.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\navigationPane\data\useNavigationPaneItemPipeline.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\useNavigationPaneScroll.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\utils\treeFlattener.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\types\virtualization.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\ListPane.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\listPane\ListPaneVirtualContent.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\useListPaneData.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\useListPaneScroll.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\listPaneData\listItems.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\FileItem.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\fileItem\useFileItemPills.tsx`

## Library Baseline

- `E`: Vaultman uses `@tanstack/svelte-virtual` `3.13.24` and Svelte `^5.55.7`.
- `E`: Notebook Navigator uses `@tanstack/react-virtual` `^3.13.24` and React `^18.3.1`.
- `I`: The virtualizer family is not the primary differentiator. Both projects depend on the same TanStack Virtual version family; the difference is the upstream data contract and row-render isolation.

## Vaultman Evidence

- `E`: `ViewNodeList.svelte` derives `effectiveRowInputs` directly from `projection ? rowInputsFromProjection(projection) : rowInputs`.
- `E`: `ViewNodeList.svelte` virtualizes a flat `rowCount` with constant `ROW_HEIGHT = 32` and `LIST_OVERSCAN = 5`.
- `E`: `viewTree.svelte` derives `flatArray` from either `flatProjectionRows(projectionRowInputs, expandedIds)` or `flattenMeasured(treeRows, expandedIds)`.
- `E`: `viewTree.svelte` uses `TREE_OVERSCAN = 10`, sticky rows, selection box, DnD view state, hover badges, visible fields, highlight, rename, and warning state in the same component.
- `E`: `flatProjectionRows` builds `indexById`, `visibleChildParentIds`, one `TreeFlatNode` per input row, then walks forward from each flat row to compute `subtreeEndIndex`.
- `E`: `logicExplorerSnapshot.ts` returns both `rows` and `visibleIds`. It sets `idToIndex` only when ancestors are visible.
- `E`: `panelExplorer.svelte` maps `snapshot.rows` into `treeRowInputs`, then builds `treeProjection` from those inputs. It does not use `snapshot.visibleIds` as the Tree render input.
- `M`: 50k Files matrix recorded Tree and List with zero blank frames, but Tree had `maxDelay=1051 ms` and `p99=1051 ms`, while List had `maxDelay=43 ms` and `p99=43 ms`.

## Notebook Navigator Evidence

- `E`: `useNavigationPaneSourceState.ts` builds a memoized source-state bundle for hidden folders/tags/properties, root order maps, comparators, file-change versions, metadata versions, and visibility-aware trees.
- `E`: `useNavigationPaneTreeSections.ts` builds `folderItems`, `tagItems`, and `propertyItems` with `useMemo`, scoped by expansion state and settings.
- `E`: `flattenFolderTree` visits children only when `expandedFolders.has(folder.path)`.
- `E`: `flattenTagTree` visits children only when `expandedTags.has(node.path)`.
- `E`: property value rows are appended only when `expandedProperties.has(keyNode.id)`.
- `E`: `useNavigationPaneItemPipeline.ts` combines sections, separators, root spacing, rainbow decoration, filters, and `pathToIndex` before render.
- `E`: `NavigationPaneLayout.tsx` renders only `rowVirtualizer.getVirtualItems()` over the final `items` array.
- `E`: row components use `React.memo`: `FolderItem`, `TagTreeItem`, `PropertyTreeItem`, `VirtualFolderItem`, and `FileItem`.
- `E`: `useNavigationPaneScroll.ts` and `useListPaneScroll.ts` gate scrolls by index-version changes and resolve path-to-index late at execution time.

## Confidence

The architecture conclusion is high-confidence because it is supported by direct source evidence in both projects and by the existing Vaultman stress matrix. The exact percentage contribution of each `viewTree` hotspot is not yet known; the next implementation agent must add timing marks before selecting the final sequence of code changes.

