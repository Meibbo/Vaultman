## Task 5: Seam normalization — drop Contract B + provide RowActionContext + KeyboardNavController

**Files:**
- Modify: `src/components/explorer/ViewHost.svelte` (delete props 96-99 + `handleListContextMenu` 139-141; list block 174-186)
- Modify: `src/components/containers/panelExplorer.svelte` (build `KeyboardNavController`; delete bridges 598-630; mount props 1292-1295; `selectNode` uses shared modifier fn; `handleRowKeydown` delegates)
- Modify: `src/components/views/ViewNodeList.svelte` (delete Contract B 39-43/51-53/230-269; emit Contract A)
- Test: `test/component/selectionContractParity.test.ts`

El builder (`serviceRowAction`) **no se inyecta por context**: cada view lo crea desde sus propias props en Task 6, así los component tests standalone (que montan el view directo) siguen funcionando.
En esta task el panel solo crea el `KeyboardNavController` (lo consume vía `onRowKeydown={handleRowKeydown}`, ya presente en el mount, 1287) y ViewNodeList pasa a Contract A.

- [x] **Step 1: Write the failing test (list emits the same contract as tree)**

```ts
// test/component/selectionContractParity.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeList from '../../src/components/views/ViewNodeList.svelte';
import { rowInputFromTreeNode } from '../../src/services/serviceExplorerRowInput';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewNodeList emits (id, MouseEvent) Contract A', () => {
  let target: HTMLDivElement;
  let app: ReturnType<typeof mount> | null = null;
  beforeEach(() => { target = document.createElement('div'); document.body.appendChild(target);
    vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} }); });
  afterEach(() => { if (app) { void unmount(app); app = null; } target.remove(); vi.unstubAllGlobals(); });

  it('clicking a row calls onRowClick(id, MouseEvent) — not onSelect(row, modifiers)', () => {
    const onRowClick = vi.fn();
    const node = { id: 'n1', label: 'N1', depth: 0, meta: {} } as TreeNode;
    app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
      target,
      props: {
        rowInputs: [rowInputFromTreeNode(node, 0)],
        onRowClick,
        onRowKeydown: vi.fn(),
        onContextMenu: vi.fn(),
        icon: vi.fn(() => ({ update: vi.fn() })),
      },
    });
    flushSync();
    (target.querySelector('[data-id="n1"], [data-row-key="n1"]') as HTMLElement).click();
    expect(onRowClick).toHaveBeenCalledWith('n1', expect.any(MouseEvent));
  });
});
```

(Confirm `rowInputFromTreeNode` signature against `serviceExplorerRowInput.ts`; adjust the second arg if it takes options rather than depth.)

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/component/selectionContractParity.test.ts` Expected: FAIL — ViewNodeList has no `onRowClick` prop yet (still `onSelect`).

- [x] **Step 3a: ViewHost — delete Contract B**

```diff
// src/components/explorer/ViewHost.svelte
- onSelect?: (row: ListRowInput, modifiers: { ctrl: boolean; shift: boolean; alt: boolean }) => void;
- onActivate?: (row: ListRowInput) => void;
- onFocus?: (id: string | null) => void;
- onListContextMenu?: (event: MouseEvent, row: ListRowInput) => void;
```
Delete `handleListContextMenu` (139-141). In the list block (174-186) replace the Contract B wiring with:
```diff
  <ViewNodeList
    rowInputs={rest.listRowInputs}
    projection={rest.listProjection}
    canReorder={false}
    selectedIds={rest.selectedIds}
    focusedId={rest.focusedId}
-   onSelect={rest.onSelect}
-   onActivate={rest.onActivate}
-   onFocus={rest.onFocus}
-   onContextMenu={rest.onListContextMenu ?? handleListContextMenu}
+   onRowClick={rest.onRowClick}
+   onRowKeydown={rest.onRowKeydown}
+   onContextMenu={rest.onContextMenu}
+   onSecondaryAction={rest.onSecondaryAction}
+   onTertiaryAction={rest.onTertiaryAction}
    icon={rest.icon}
  />
```

- [x] **Step 3b: ViewNodeList — emit Contract A**

Delete `SelectModifiers` (39-43), `onSelect`/`onActivate`/`onFocus` props (51-53), `handleSelect` (230-237), inline `handleKeydown` (239-269). Add to `Props`:
```ts
  onRowClick?: (id: string, e: MouseEvent) => void;
  onRowKeydown?: (id: string, e: KeyboardEvent) => void;
  onSecondaryAction?: (id: string, e: MouseEvent) => void;
  onTertiaryAction?: (id: string, e: MouseEvent) => void;
  onContextMenu?: (id: string, e: MouseEvent) => void;
```
Wire the row element handlers (where `handleSelect`/`handleKeydown` were attached) to:
```svelte
onclick={(e) => onRowClick?.(row.id, e)}
onauxclick={(e) => onTertiaryAction?.(row.id, e)}
oncontextmenu={(e) => { e.preventDefault(); onContextMenu?.(row.id, e); }}
onkeydown={(e) => onRowKeydown?.(row.id, e)}
```
(double-click → `onSecondaryAction` if the list had a dblclick path; otherwise omit. Keep `data-id={row.id}`.)
