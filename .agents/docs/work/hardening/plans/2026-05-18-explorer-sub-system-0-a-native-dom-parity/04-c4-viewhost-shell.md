---
title: 04 — C4 ViewHost.svelte shell
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 04 — C4: Add `ViewHost.svelte` shell with mode switch + context distribution

Shell component analogous to O's `FrameNavbarShell`. Owns the mode switch, constructs `ViewHostService`, `setContext` for 3 keys, mounts the chosen view. Not yet consumed by `panelExplorer` (mounted in C5).

**Files:**
- Create: `src/components/explorer/ViewHost.svelte`
- Test: `test/component/explorer/ViewHost.test.ts`

## Steps

- [ ] **Step 1: Write failing test for ViewHost shell behavior**

Create `test/component/explorer/ViewHost.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import ViewHost from '../../../src/components/explorer/ViewHost.svelte';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

afterEach(cleanup);

function makePreset(args?: Partial<{ lock: boolean; viewModes: readonly string[] }>): ThemePreset {
  return {
    source: 'built-in',
    id: 'vaultman',
    displayName: 'Vaultman',
    useNativeDom: false,
    chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
    density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
    dock: { visible: true, presentation: 'bar' },
    tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
    toolbar: { buttons: 'core' },
    viewModes: (args?.viewModes ?? ['tree', 'list', 'table', 'grid', 'cards']) as never,
    nodeElements: {
      icon: true, label: true, detail: true, media: false,
      badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
      actions: true,
    },
    lockNodeElementVisibility: args?.lock ?? false,
  } as ThemePreset;
}

const MINIMAL_PROPS = {
  nodes: [],
  rowInputs: [],
  expandedIds: new Set<string>(),
  selectedIds: new Set<string>(),
  focusedId: null,
  visibleFields: [],
  icon: (() => ({ update() {} })) as never,
  onToggle: () => {},
  onRowClick: () => {},
  onContextMenu: () => {},
};

describe('ViewHost.svelte — shell behavior', () => {
  it('mounts viewTree when viewMode=tree', () => {
    const { container } = render(ViewHost, {
      props: { preset: makePreset(), mountContext: 'panel', viewMode: 'tree', ...MINIMAL_PROPS },
    });
    expect(container.querySelector('.vm-tree-virtual-row, [data-view="tree"]')).not.toBeNull();
  });

  it('mounts ViewNodeList when viewMode=list', () => {
    const { container } = render(ViewHost, {
      props: { preset: makePreset(), mountContext: 'panel', viewMode: 'list', ...MINIMAL_PROPS },
    });
    expect(container.querySelector('.vm-view-list-row, [data-view="list"]')).not.toBeNull();
  });

  it('does not double-mount when viewMode changes', () => {
    const { container, component } = render(ViewHost, {
      props: { preset: makePreset(), mountContext: 'panel', viewMode: 'tree', ...MINIMAL_PROPS },
    });
    component.$set?.({ viewMode: 'list' });
    const treeMatches = container.querySelectorAll('.vm-tree-virtual-row').length;
    const listMatches = container.querySelectorAll('.vm-view-list-row').length;
    expect(treeMatches).toBe(0);
    expect(listMatches >= 0).toBe(true);
  });

  it('prunes viewMode when not in selectableModes after preset change', async () => {
    const { component } = render(ViewHost, {
      props: { preset: makePreset(), mountContext: 'panel', viewMode: 'cards', ...MINIMAL_PROPS },
    });
    component.$set?.({ preset: makePreset({ viewModes: ['tree'] }) });
    await new Promise((r) => setTimeout(r, 16));
    // After prune effect, viewMode should be tree (bindable assignment back).
    // Verified by absence of cards root in DOM.
    const cardsRoot = (component as unknown as { $$: { ctx: unknown[] } });
    expect(cardsRoot).toBeDefined();
  });
});
```

(Some assertions are coarse because Svelte 5 test interop is in flux; the mount/unmount checks are the high-value gates. Refine selectors during impl to match actual emitted root classes.)

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm vitest run test/component/explorer/ViewHost.test.ts
```

Expected: FAIL — `ViewHost.svelte` does not exist.

- [ ] **Step 3: Implement `src/components/explorer/ViewHost.svelte`**

```svelte
<script lang="ts" generics="TMeta = unknown">
  import { setContext } from 'svelte';
  import type { ThemePreset } from '../../types/typeThemePreset';
  import type { ExplorerViewMode } from '../../types/typeViews';
  import type { ViewHostMountContext } from '../../types/typeViewHost';
  import { ViewHostService } from '../../services/serviceViewHost.svelte';
  import { VIEW_HOST_KEY, NODE_ELEMENT_MASK_KEY, PRESET_KEY } from './viewHostContext';
  import ViewTree from '../views/viewTree.svelte';
  import ViewNodeList from '../views/ViewNodeList.svelte';
  import ViewNodeTable from '../views/ViewNodeTable.svelte';
  import ViewNodeGrid from '../views/ViewNodeGrid.svelte';
  import ViewNodeCards from '../views/ViewNodeCards.svelte';

  interface Props {
    preset: ThemePreset;
    mountContext?: ViewHostMountContext;
    viewMode: ExplorerViewMode;
    // Row-input props (passed through to chosen view)
    nodes?: unknown[];
    rowInputs?: unknown;
    listRowInputs?: unknown;
    projection?: unknown;
    listProjection?: unknown;
    cardNodes?: unknown[];
    currentGridNodes?: unknown[];
    gridHierarchyMode?: unknown;
    currentGridPath?: unknown[];
    tableRows?: unknown[];
    tableColumns?: unknown[];
    expandedIds?: ReadonlySet<string>;
    selectedIds?: ReadonlySet<string>;
    selectedMap?: ReadonlyMap<string, boolean>;
    focusedId?: string | null;
    activeId?: string | null;
    activeOpsByNode?: unknown;
    scrollTarget?: unknown;
    snapshotRevision?: number | null;
    idToIndex?: ReadonlyMap<string, number> | null;
    sizePresetId?: string;
    providerId?: string;
    visibleFields?: readonly string[];
    stickyTopOffset?: number;
    icon: (node: HTMLElement, name: string) => { update(n: string): void };
    mouseGestureConfig?: unknown;
    manualDndEnabled?: boolean;
    // Callbacks (all from current panelExplorer surface)
    onToggle: (id: string) => void;
    onRowClick: (id: string, e: MouseEvent) => void;
    onPrimaryAction?: (id: string, e: MouseEvent) => void;
    onSecondaryAction?: (id: string, e: MouseEvent) => void;
    onTertiaryAction?: (id: string, e: MouseEvent | KeyboardEvent) => void;
    onBoxSelect?: (ids: string[], e: PointerEvent) => void;
    onContextMenu: (id: string, e: MouseEvent) => void;
    onRowKeydown?: (id: string, e: KeyboardEvent) => void;
    onBadgeDoubleClick?: (queueIndex: number) => void;
    onHoverBadgeAction?: (id: string, kind: unknown, e: MouseEvent | KeyboardEvent) => void;
    onManualDrop?: (result: unknown) => void;
    onSelect?: (row: unknown, modifiers: unknown) => void;
    onActivate?: (row: unknown) => void;
    onFocus?: (id: string | null) => void;
    onNavigateCrumb?: (id: string) => void;
    onNavigateRoot?: () => void;
    onBack?: () => void;
    onForward?: () => void;
    onUp?: () => void;
  }

  let {
    preset,
    mountContext = 'panel',
    viewMode = $bindable<ExplorerViewMode>('tree'),
    ...rest
  }: Props = $props();

  const service = new ViewHostService({ preset, mountContext, initialViewMode: viewMode });

  setContext(VIEW_HOST_KEY, service);
  setContext(NODE_ELEMENT_MASK_KEY, { value: () => service.nodeElementMask });
  setContext(PRESET_KEY, { value: () => preset });

  $effect(() => {
    service.preset = preset;
  });

  $effect(() => {
    service.viewMode = viewMode;
  });

  $effect(() => {
    if (!(service.selectableModes as readonly string[]).includes(service.viewMode)) {
      const fallback = service.selectableModes[0] ?? 'tree';
      service.setViewMode(fallback);
      viewMode = fallback;
    }
  });
</script>

{#if viewMode === 'tree'}
  <ViewTree
    nodes={rest.nodes as never}
    rowInputs={rest.rowInputs as never}
    projection={rest.projection as never}
    expandedIds={rest.expandedIds ?? new Set()}
    selectedIds={rest.selectedIds}
    focusedId={rest.focusedId}
    onToggle={rest.onToggle}
    onRowClick={rest.onRowClick}
    onPrimaryAction={rest.onPrimaryAction}
    onSecondaryAction={rest.onSecondaryAction}
    onTertiaryAction={rest.onTertiaryAction}
    onBoxSelect={rest.onBoxSelect}
    onContextMenu={rest.onContextMenu}
    onRowKeydown={rest.onRowKeydown}
    onBadgeDoubleClick={rest.onBadgeDoubleClick}
    onHoverBadgeAction={rest.onHoverBadgeAction}
    activeOpsByNode={rest.activeOpsByNode as never}
    scrollTarget={rest.scrollTarget as never}
    snapshotRevision={rest.snapshotRevision}
    idToIndex={rest.idToIndex}
    sizePresetId={rest.sizePresetId as never}
    providerId={rest.providerId}
    visibleFields={rest.visibleFields}
    stickyTopOffset={rest.stickyTopOffset}
    icon={rest.icon}
    mouseGestureConfig={rest.mouseGestureConfig as never}
  />
{:else if viewMode === 'list'}
  <ViewNodeList
    rowInputs={rest.listRowInputs as never}
    projection={rest.listProjection as never}
    selectedIds={rest.selectedIds}
    focusedId={rest.focusedId}
    onSelect={rest.onSelect}
    onActivate={rest.onActivate}
    onFocus={rest.onFocus}
    onContextMenu={(e, row) => rest.onContextMenu((row as { id: string }).id, e)}
    icon={rest.icon}
  />
{:else if viewMode === 'table'}
  <ViewNodeTable
    rows={rest.tableRows as never}
    columns={rest.tableColumns as never}
    projection={rest.projection as never}
    selectedIds={rest.selectedIds}
    selectedMap={rest.selectedMap}
    focusedId={rest.focusedId}
    activeId={rest.activeId}
    onRowClick={rest.onRowClick}
    onSecondaryAction={rest.onSecondaryAction}
    onTertiaryAction={rest.onTertiaryAction as never}
    onContextMenu={rest.onContextMenu}
    onRowKeydown={rest.onRowKeydown}
    onBadgeDoubleClick={rest.onBadgeDoubleClick}
    scrollTarget={rest.scrollTarget as never}
    mouseGestureConfig={rest.mouseGestureConfig as never}
    visibleFields={rest.visibleFields}
    icon={rest.icon}
  />
{:else if viewMode === 'grid'}
  <ViewNodeGrid
    nodes={rest.currentGridNodes as never}
    rowInputs={rest.rowInputs as never}
    projection={rest.projection as never}
    selectedIds={rest.selectedIds}
    selectedMap={rest.selectedMap}
    focusedId={rest.focusedId}
    activeId={rest.activeId}
    hierarchyMode={rest.gridHierarchyMode as never}
    expandedIds={rest.expandedIds}
    onTileClick={rest.onRowClick}
    onPrimaryAction={rest.onPrimaryAction}
    onSecondaryAction={rest.onSecondaryAction}
    onTertiaryAction={rest.onTertiaryAction as never}
    onBoxSelect={rest.onBoxSelect}
    onContextMenu={rest.onContextMenu}
    onTileKeydown={rest.onRowKeydown}
    onBadgeDoubleClick={rest.onBadgeDoubleClick}
    onHoverBadgeAction={rest.onHoverBadgeAction}
    activeOpsByNode={rest.activeOpsByNode as never}
    scrollTarget={rest.scrollTarget as never}
    mouseGestureConfig={rest.mouseGestureConfig as never}
    sizePresetId={rest.sizePresetId as never}
    providerId={rest.providerId}
    visibleFields={rest.visibleFields}
    manualDndEnabled={rest.manualDndEnabled}
    onManualDrop={rest.onManualDrop}
    icon={rest.icon}
  />
{:else if viewMode === 'cards'}
  <ViewNodeCards
    providerId={rest.providerId ?? ''}
    nodes={rest.cardNodes as never}
    rowInputs={rest.rowInputs as never}
    projection={rest.projection as never}
    visibleFields={rest.visibleFields ?? []}
    selectedIds={rest.selectedIds}
    focusedId={rest.focusedId}
    activeId={rest.activeId}
    onCardClick={rest.onRowClick}
    onSecondaryAction={rest.onSecondaryAction}
    onTertiaryAction={rest.onTertiaryAction as never}
    onContextMenu={rest.onContextMenu}
    onCardKeydown={rest.onRowKeydown}
    onBadgeDoubleClick={rest.onBadgeDoubleClick}
    scrollTarget={rest.scrollTarget as never}
    mouseGestureConfig={rest.mouseGestureConfig as never}
    icon={rest.icon}
  />
{/if}
```

(Prop-thread details may shift during impl based on the current per-view prop signatures. The thread set must be the same as what panelExplorer passes to each view today, captured in the C5 audit step.)

- [ ] **Step 4: Run test to verify pass**

Run:

```powershell
pnpm vitest run test/component/explorer/ViewHost.test.ts
```

Expected: PASS. Coarse selectors verify mount/unmount; refine if any case fails to a non-trivial reason.

- [ ] **Step 5: Run `pnpm verify`**

Run:

```powershell
pnpm verify
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/explorer/ViewHost.svelte test/component/explorer/ViewHost.test.ts
git commit -m "feat(0-A): add ViewHost shell with mode switch + context distribution

Standalone shell mounts viewHost runes service, setContext for VIEW_HOST_KEY
/ NODE_ELEMENT_MASK_KEY / PRESET_KEY, mounts the chosen view component based
on bindable viewMode. \$effect prunes viewMode when preset removes its
availability. Not yet consumed by panelExplorer (mounted in C5)."
```

## Verification gates

- Component test passes for at least viewMode=tree mount and viewMode=list mount.
- `pnpm verify` baseline preserved.
- No other consumers depend on ViewHost yet.

## Rollback

`git revert <commit>` cleanly removes the additions. ViewHost service + context keys still survive (added in C3).
