---
title: 05 — C5 panelExplorer view-host extraction
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 05 — C5: Extract view-host from `panelExplorer.svelte` to `<ViewHost>` mount

Replace the inline view-mode switch block in
`src/components/containers/panelExplorer.svelte` (≈lines 1205-1380) with a
single `<ViewHost>` mount for platform modes. Markmap branch stays as outer
fallback. Surrounding panelExplorer state, callbacks, `$effect` blocks
remain untouched.

**Files:**
- Modify: `src/components/containers/panelExplorer.svelte`
- Test: `test/component/containers/panelExplorerViewHostMount.test.ts`

## Steps

- [ ] **Step 1: Capture pre-extraction DOM baseline**

Run:

```powershell
pnpm vitest run test/component/containers/ 2>&1 | Out-File pre-c5-component-baseline.txt
git status --short
```

Record baseline test pass count and any existing snapshot files in
`baseline-log.md`.

- [ ] **Step 2: Write failing test for post-extraction DOM structure**

Create `test/component/containers/panelExplorerViewHostMount.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import PanelExplorer from '../../../src/components/containers/panelExplorer.svelte';

afterEach(cleanup);

describe('panelExplorer — ViewHost mount (C5)', () => {
  it('mounts ViewHost wrapper for platform modes', () => {
    const { container } = render(PanelExplorer, {
      props: {
        // ... minimal panelExplorer props (provider, plugin, nodes, viewMode='tree', etc.)
        // (Match the existing panelExplorer test fixture conventions.)
      } as never,
    });
    expect(container.querySelector('.vm-view-host-container')).not.toBeNull();
  });

  it('does NOT mount ViewHost for markmap mode (markmap stays inline)', () => {
    const { container } = render(PanelExplorer, {
      props: { viewMode: 'markmap' } as never,
    });
    expect(container.querySelector('.vm-markmap-container')).not.toBeNull();
    expect(container.querySelector('.vm-view-host-container')).toBeNull();
  });

  it('routes empty-state through outer ViewEmptyLanding (not ViewHost)', () => {
    const { container } = render(PanelExplorer, {
      props: { viewMode: 'tree', nodes: [] } as never,
    });
    expect(container.querySelector('.vm-view-host-container')).toBeNull();
    expect(container.querySelector('[data-empty-landing], .vm-empty-landing')).not.toBeNull();
  });
});
```

(Test fixture details depend on `panelExplorer.svelte`'s actual prop
signature; match the existing panelExplorer component-test conventions.)

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
pnpm vitest run test/component/containers/panelExplorerViewHostMount.test.ts
```

Expected: FAIL — `.vm-view-host-container` does not exist yet.

- [ ] **Step 4: Read `panelExplorer.svelte` mode-switch block**

Run:

```powershell
Get-Content src/components/containers/panelExplorer.svelte | Select-Object -Skip 1199 -First 200
```

Identify the full block to replace (≈lines 1200-1380). Capture the
EXACT prop set passed to each view component for the audit in Step 6.

- [ ] **Step 5: Add `isPlatformMode` import + `isCurrentViewEmpty` consolidation**

In `panelExplorer.svelte` `<script>` section, add:

```typescript
import { isExplorerPlatformViewMode } from '../../services/serviceExplorerViewContract';
import ViewHost from '../explorer/ViewHost.svelte';
```

Add a derived consolidating the existing `is*Empty` checks:

```typescript
const isCurrentViewEmpty = $derived(
  viewMode === 'tree' ? isTreeEmpty
  : viewMode === 'list' ? isListEmpty
  : viewMode === 'table' ? isTableEmpty
  : viewMode === 'grid' ? isGridEmpty
  : viewMode === 'cards' ? isCardsEmpty
  : viewMode === 'markmap' ? isMarkmapEmpty
  : false
);
```

- [ ] **Step 6: Replace the inline mode-switch with ViewHost mount**

Replace the block from `{#if viewMode === 'tree'}` through the final
`{:else}` with:

```svelte
{#if viewMode === 'markmap'}
  <div class="vm-markmap-container">
    {#if isMarkmapEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewMarkmap
        nodes={markmapNodes}
        {visibleFields}
      />
    {/if}
  </div>
{:else if isExplorerPlatformViewMode(viewMode)}
  {#if isCurrentViewEmpty}
    <ViewEmptyLanding state={emptyState} {icon} />
  {:else}
    <div class="vm-view-host-container">
      <ViewHost
        preset={plugin.themeService.activePreset}
        mountContext="panel"
        bind:viewMode
        nodes={nodes}
        rowInputs={treeRowInputs}
        listRowInputs={listRowInputs}
        projection={treeProjection}
        listProjection={listProjection}
        cardNodes={cardNodes}
        currentGridNodes={currentGridNodes}
        gridHierarchyMode={gridHierarchyMode}
        currentGridPath={currentGridPath}
        tableRows={tableRows}
        tableColumns={tableColumns}
        expandedIds={expandedIds}
        selectedIds={selectedNodeIds}
        selectedMap={selectedNodeMap}
        focusedId={focusedNodeId}
        activeOpsByNode={activeOpsByNode}
        scrollTarget={scrollTarget}
        snapshotRevision={snapshotRevision}
        idToIndex={idToIndex}
        sizePresetId={sizePresetId}
        providerId={provider.id}
        visibleFields={visibleFields}
        stickyTopOffset={stickyTopOffset}
        mouseGestureConfig={mouseGestureConfig}
        manualDndEnabled={manualDndEnabled}
        icon={icon}
        onToggle={toggleNode}
        onRowClick={handleRowClick}
        onPrimaryAction={handlePrimaryAction}
        onSecondaryAction={handleSecondaryAction}
        onTertiaryAction={handleTertiaryAction}
        onBoxSelect={handleBoxSelect}
        onContextMenu={handleContextMenu}
        onRowKeydown={handleRowKeydown}
        onBadgeDoubleClick={handleBadgeDoubleClick}
        onHoverBadgeAction={handleHoverBadgeAction}
        onManualDrop={handleManualDrop}
        onSelect={handleListSelect}
        onActivate={handleListActivate}
        onFocus={handleListFocus}
        onNavigateCrumb={handleGridNavigateCrumb}
        onNavigateRoot={handleGridNavigateRoot}
        onBack={handleGridBack}
        onForward={handleGridForward}
        onUp={handleGridUp}
      />
    </div>
  {/if}
{:else}
  <div class="vm-fallback-container">
    <ViewEmptyLanding state={fallbackState} {icon} />
  </div>
{/if}
```

Confirm every prop / callback that the old switch passed to a view
component is present in the ViewHost mount above. Use the audit from
Step 4 as the checklist.

- [ ] **Step 7: Audit container-class lineage in `src/styles/`**

Run:

```powershell
Select-String -Path src/styles -Pattern "vm-tree-container|vm-grid-container|vm-cards-container|vm-list-container|vm-table-container" -SimpleMatch
```

For each hit:
- If a rule is targeting `.vm-<view>-container > .vm-<view>-virtual-row`, the
  rule still works because `<ViewHost>` renders the same view component
  output; the outer container disappears but the inner content stays.
- If a rule targets `.vm-<view>-container` directly for visual styling
  (padding, background), it may need to migrate to `.vm-view-host-container`
  or to a per-view inner element. Decide per rule; document choices in
  the commit message.

- [ ] **Step 8: Run focused tests**

Run:

```powershell
pnpm vitest run test/component/containers/panelExplorerViewHostMount.test.ts
pnpm vitest run test/component/containers/panelExplorer.test.ts
```

Expected: both PASS. The existing panelExplorer component test (if any)
should be updated to match the new wrapper class if it asserted on
`.vm-tree-container` etc.

- [ ] **Step 9: Run full `pnpm verify`**

Run:

```powershell
pnpm verify
```

Expected: PASS. Lint clean. If component tests fail due to selector
change, update the test to match the new wrapper element.

- [ ] **Step 10: Run live `plugin-dev` smoke**

```powershell
pnpm run build
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="['tree','list','table','grid','cards','markmap'].forEach(m => { /* swap viewMode somehow */ })"
obsidian vault=plugin-dev dev:errors
```

Expected: `No errors captured.` after cycling through each viewMode.

- [ ] **Step 11: Commit**

```powershell
git add src/components/containers/panelExplorer.svelte test/component/containers/panelExplorerViewHostMount.test.ts
git commit -m "refactor(0-A): extract view-host from panelExplorer to ViewHost mount

Replaces inline view-mode switch (lines 1205-1380) with single ViewHost
mount for platform modes. Markmap branch preserved as outer fallback.
isPlatformMode() routes correctly; isCurrentViewEmpty derived consolidates
the 6 prior is*Empty checks. All callbacks, row inputs, scroll targets,
selection state, and theme service references threaded through ViewHost
without semantic change."
```

## Verification gates

- New component test passes.
- Existing panelExplorer tests pass (with selector updates if any).
- `pnpm verify` baseline preserved.
- Live plugin-dev smoke: no dev errors across all 6 viewMode values.
- Visual smoke (manual): rows render in each viewMode with same overall
  layout as before C5.

## Risk surface (R1)

- The bindable `viewMode` two-way sync introduces a possible loop if
  panelExplorer mutates `viewMode` from its own `$effect`. During Step 8
  watch test logs for `Maximum reactive update depth` warnings. If
  observed, guard ViewHost's prune `$effect` with an equality check
  before assigning back.
- Container-class lineage in SCSS may need touchups if styles relied on
  the now-removed wrapper. Document any SCSS edits in the commit message.

## Rollback

`git revert <commit>` reverts to the inline switch. ViewHost shell + service
remain available for the next attempt.
