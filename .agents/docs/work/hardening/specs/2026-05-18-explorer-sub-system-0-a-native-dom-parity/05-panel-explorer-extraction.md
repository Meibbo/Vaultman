---
title: 05 — panelExplorer view-host extraction
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 05 — panelExplorer view-host extraction

C5 replaces the inline view-mode switch in `src/components/containers/panelExplorer.svelte` (lines 1205-1380 today, ≈175 LOC) with a single `<ViewHost>` mount. All surrounding state, callbacks, and reactive effects in panelExplorer remain unchanged. The bindable `viewMode` prop wires two-way sync between panelExplorer's existing state and ViewHost's child overlayViewMenu.

## Before (today)

```svelte
<!-- panelExplorer.svelte:1205-1380 (abridged) -->
{#if viewMode === 'tree'}
  <div class="vm-tree-container">
    {#if isTreeEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewTree
        rowInputs={treeRowInputs}
        projection={treeProjection}
        expandedIds={expandedIds}
        selectedIds={selectedNodeIds}
        focusedId={focusedNodeId}
        themeService={plugin.themeService}
        {visibleFields}
        onToggle={(id) => toggleNode(id)}
        onRowClick={(id, e) => handleRowClick(id, e)}
        onSecondaryAction={(id, e) => handleSecondaryAction(id, e)}
        onTertiaryAction={(id, e) => handleTertiaryAction(id, e)}
        onBoxSelect={(ids, e) => handleBoxSelect(ids, e)}
        onContextMenu={(id, e) => handleContextMenu(id, e)}
        onRowKeydown={(id, e) => handleRowKeydown(id, e)}
        onBadgeDoubleClick={handleBadgeDoubleClick}
        onHoverBadgeAction={handleHoverBadgeAction}
        {activeOpsByNode}
        {scrollTarget}
        {/* etc. */}
      />
    {/if}
  </div>
{:else if viewMode === 'grid'}
  <div class="vm-grid-container">
    {#if isGridEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewNodeGrid
        nodes={currentGridNodes}
        rowInputs={...}
        ...
      />
    {/if}
  </div>
{:else if viewMode === 'cards'}
  <div class="vm-cards-container">
    {#if isCardsEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewNodeCards ... />
    {/if}
  </div>
{:else if viewMode === 'markmap'}
  <div class="vm-markmap-container">
    {#if isMarkmapEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewMarkmap ... />
    {/if}
  </div>
{:else if viewMode === 'list'}
  <div class="vm-list-container">
    {#if isListEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewNodeList ... />
    {/if}
  </div>
{:else if viewMode === 'table'}
  <div class="vm-table-container">
    {#if isTableEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewNodeTable ... />
    {/if}
  </div>
{:else}
  <div class="vm-fallback-container">
    <ViewEmptyLanding state={fallbackState} {icon} />
  </div>
{/if}
```

## After

```svelte
<!-- panelExplorer.svelte (C5 replacement, lines roughly equivalent) -->

{#if viewMode === 'markmap'}
  <!-- Markmap is non-platform; stays inline in panelExplorer. -->
  <div class="vm-markmap-container">
    {#if isMarkmapEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewMarkmap
        nodes={markmapNodes}
        {visibleFields}
        ...
      />
    {/if}
  </div>
{:else if isPlatformMode(viewMode)}
  <!-- Platform modes route through ViewHost. -->
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
        icon={icon}
        mouseGestureConfig={mouseGestureConfig}
        manualDndEnabled={manualDndEnabled}
        onToggle={toggleNode}
        onRowClick={handleRowClick}
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

`isPlatformMode(viewMode)` reuses the existing `isExplorerPlatformViewMode` from `serviceExplorerViewContract.ts`.

`isCurrentViewEmpty` consolidates the existing 6 `is*Empty` derivations (`isTreeEmpty`, `isGridEmpty`, etc.) into one that picks the right flag by `viewMode`:

```typescript
const isCurrentViewEmpty = $derived(
  viewMode === 'tree' ? isTreeEmpty
  : viewMode === 'list' ? isListEmpty
  : viewMode === 'table' ? isTableEmpty
  : viewMode === 'grid' ? isGridEmpty
  : viewMode === 'cards' ? isCardsEmpty
  : false
);
```

## What stays in panelExplorer unchanged

- All script imports (services, types, callbacks).
- All `$state` declarations.
- All `$derived` declarations (treeRowInputs, listRowInputs, treeProjection, listProjection, gridNodes, cardNodes, tableRows, tableColumns, currentGridPath, currentGridNodes, activeOpsByNode, emptyState, fallbackState, is*Empty).
- All `$effect` blocks (snapshot subscriptions, mouse gesture config, scroll target tracking).
- All callback function definitions (handleRowClick, handleSecondaryAction, etc.).
- Style block (container classes `.vm-tree-container`, `.vm-grid-container`, etc.) — kept in case downstream relies on them via specificity, even though ViewHost wraps in `.vm-view-host-container`. Audit during C5 and remove unused.
- The bindable `viewMode` prop on panelExplorer (existing at line 72) — used by parent navbar to control which view is shown.

## Container class lineage

ViewHost mounts inside `.vm-view-host-container`. The 5 view components retain their internal layout classes (`.vm-tree-virtual-row`, `.vm-node-card`, etc.). The per-view container classes (`.vm-tree-container`, `.vm-grid-container`, etc.) become **optional**:

- If any downstream CSS still targets them, they survive (we wrap inside ViewHost rendering). Audit during C5 — if no rules target them, drop them.
- If they survive, they live as a thin wrapper between `.vm-view-host-container` and the view component's own root.

This is a low-risk audit. Snapshot diff catches regressions.

## C5 verification gates

- `pnpm verify` passes after C5 with identical pass count (no new test files added in this commit, only the snapshot baseline updated for the new wrapper).
- Existing panelExplorer DOM snapshot baseline compared against post-C5: classes added on the new wrapper, no removed classes on rows/cells.
- Live `plugin-dev` smoke: open Vaultman, cycle Tree → Table → Grid → Cards → List → Tree, ensure no console errors.
- `pnpm smoke:scroll -- --view=tree` and `--view=cards` baseline gates from variable-scroll-repair still pass (`blankFrames=0`, `maxBlank=0ms`).

## Risk surface (R1 per shard 11)

- ViewHost mount changes the DOM structure: a new `.vm-view-host-container` wrapper appears around the row list. CSS rules at the panel level that targeted the row list via parent selector (`.vm-tree-container > .vm-tree-virtual-row`) may need updating. Audit script: grep `.vm-tree-container`, `.vm-grid-container`, `.vm-cards-container`, `.vm-list-container`, `.vm-table-container` in `src/styles/`. If any rules cascade through them, preserve them; otherwise drop.
- Bindable `viewMode` two-way sync — if panelExplorer also mutates `viewMode` via its own `$effect`, ViewHost's prune effect could loop. Mitigation: ViewHost prune only fires when `service.viewMode ∉ selectableModes`; panelExplorer should not normally mutate viewMode without going through the menu (which calls `service.setViewMode`).
- The list of props threaded to ViewHost is long (≈30). C4 spec documents the full set; C5 audit confirms no prop omitted from the original switch.
