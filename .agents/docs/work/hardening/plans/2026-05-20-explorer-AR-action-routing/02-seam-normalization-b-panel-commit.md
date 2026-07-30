- [x] **Step 3c: panelExplorer — build controller, delete bridges**

Add near the other service wiring (imports + setup). Reuses existing panel fns confirmed at the cited lines: `visibleNodeIds()` (889), `selectionService`, `commitSelection` (856), `revealNode` (1076), `toggleExpand` (810), `expandNode`/`collapseNode` (820/825), `findNodeById` (797), `findNodePath` (used at 939), `handleSecondaryAction` (522), `handleTableSelectAll` (846), `navigateGridTo` (909), `navigateGridUp` (937), `currentGridParentId`, `gridExpandedIds`, `gridHierarchyMode`, `nodeMouseActions`.

```ts
import { createKeyboardNav, type KeyboardNavController, type NavTopology } from '../../services/serviceKeyboardNav';
import { selectionModifiersFromEvent } from '../../types/typeActionRouting';

const PAGE_STEP = 10;

function navTopology(): NavTopology {
  if (viewMode === 'grid') return gridHierarchyMode === 'folder' || gridHierarchyMode === 'inline' ? 'planar-drill' : 'planar';
  if (viewMode === 'cards') return 'planar';
  return 'linear';
}
function expansionSet(): ReadonlySet<string> {
  return viewMode === 'grid' && gridHierarchyMode === 'inline' ? gridExpandedIds : expandedIds;
}
function isExpandableId(id: string): boolean {
  const n = findNodeById(nodes, id);
  return !!n?.children && n.children.length > 0;
}

const keyboardNav: KeyboardNavController = createKeyboardNav({
  get topology() { return navTopology(); },
  orderedIds: () => visibleNodeIds(),
  columnsAt: () => gridColumnCount,            // exposed by grid view in Task 6c; cards=1 acceptable
  pageStep: PAGE_STEP,
  isExpandable: isExpandableId,
  isExpanded: (id) => expansionSet().has(id),
  parentOf: (id) => { const p = findNodePath(nodes, id); return p.length > 1 ? p[p.length - 2].id : null; },
  firstChildOf: (id) => findNodeById(nodes, id)?.children?.[0]?.id ?? null,
  labelOf: (id) => findNodeById(nodes, id)?.label ?? '',
  moveFocus: (dir, mods) => commitSelection(selectionService.moveFocus(provider.id, visibleNodeIds(), dir, mods)),
  focusEdge: (edge, { range }) => {
    const ids = visibleNodeIds(); if (!ids.length) return;
    const id = edge === 'home' ? ids[0] : ids[ids.length - 1];
    if (range) commitSelection(selectionService.selectPointer(provider.id, ids, id, { range: true }));
    else selectionService.setFocused(provider.id, id);
    revealNode(id);
  },
  focusId: (id) => { selectionService.setFocused(provider.id, id); revealNode(id); },
  movePage: (dir, { range }) => {
    const ids = visibleNodeIds(); if (!ids.length) return;
    const cur = ids.indexOf(focusedNodeId ?? '');
    const target = Math.max(0, Math.min(ids.length - 1, (cur < 0 ? 0 : cur) + dir * PAGE_STEP));
    commitSelection(selectionService.selectPointer(provider.id, ids, ids[target], { range }));
    revealNode(ids[target]);
  },
  toggleSelect: (mods) => commitSelection(selectionService.toggleFocused(provider.id, visibleNodeIds(), mods)),
  selectAll: () => handleTableSelectAll(visibleNodeIds(), new KeyboardEvent('keydown')),
  expand: (id) => expandNode(id),
  collapse: (id) => collapseNode(id),
  activate: (id, e) => handleSecondaryAction(id, e as unknown as MouseEvent),
  drill: {
    descend: (id) => {
      if (viewMode !== 'grid') return false;
      if (gridHierarchyMode === 'folder') { navigateGridTo(id); return true; }
      if (gridHierarchyMode === 'inline') { if (!gridExpandedIds.has(id)) toggleExpand(id); return true; }
      return false;
    },
    ascend: () => {
      if (viewMode === 'grid' && gridHierarchyMode === 'folder' && currentGridParentId) { navigateGridUp(); return true; }
      return false;
    },
  },
});

// El builder serviceRowAction NO se crea aquí — cada view lo crea desde sus props en Task 6
// (sin context injection → component tests standalone siguen funcionando). El panel solo provee el
// KeyboardNavController, ya consumido vía onRowKeydown={handleRowKeydown} en el mount de ViewHost (1287).
```

Refactor `selectNode` (511-519) to use the shared translation:
```diff
- const additive = e.ctrlKey || e.metaKey;
- const range = e.shiftKey;
+ const { additive, range } = selectionModifiersFromEvent(e);
```
Replace the body of `handleRowKeydown` (632-673) — delegate to the controller, keep nothing inline:
```ts
function handleRowKeydown(id: string, e: KeyboardEvent) {
  const focused = keyboardTargetId(id, visibleNodeIds());
  keyboardNav.handleKeydown(focused, e);
}
```
Delete the now-unused inline helpers if no longer referenced: `handleTreeArrowLeft`/`handleTreeArrowRight`, `handleGridNavigationKeydown`, `handleInlineGridExpansionKeydown`, `handlePageNavigation` (their behavior now lives in `keyboardNav` + `drill`). Delete the list bridges: `handleListSelect` (598-603), `handleListActivate` (605-607), `handleListFocus` (609-612), `handleListContextMenu` (614-616), `mouseEventFromListModifiers` (618-630). Delete the mount props `onSelect`/`onActivate`/`onFocus`/ `onListContextMenu` (1292-1295).

- [x] **Step 4: Run tests to verify pass**

Actual verification:
- `pnpm vitest run test/unit/services/keyboardNav.test.ts test/component/selectionContractParity.test.ts test/component/ViewNodeList.test.ts test/component/views/ViewNodeList.panel.vaultman.snapshot.test.ts test/component/explorer/ViewHost.test.ts test/component/panelExplorerSelection.test.ts test/component/viewNodeDelegation.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeScrollFallback.test.ts` — PASS, 9 files / 112 tests.
- `pnpm run check` — PASS, 0 errors / 0 warnings.
- `pnpm run lint` — PASS, 0 errors / 0 warnings.
- `git diff --check` — PASS, CRLF working-copy warnings only.

Svelte autofixer was run on `ViewNodeList.svelte`, `ViewHost.svelte`, and `panelExplorer.svelte`; it reported no issues, only pre-existing suggestions.

- [x] **Step 5: Commit**

```bash
git add src/components/explorer/ViewHost.svelte \
  src/components/containers/panelExplorer.svelte src/components/views/ViewNodeList.svelte \
  test/component/selectionContractParity.test.ts
git commit -m "refactor(A.R): unify seam to (id, MouseEvent); drop list Contract B + synthetic event; route keyboard via serviceKeyboardNav"
```

Actual commit: `refactor(A.R): normalize explorer row seams`.
