---
title: Detachable layout workspace tabs - detached host frame DnD verification
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-detachable-layout-workspace-tabs/index|detachable layout workspace tabs implementation]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T00:00:00
tags:
  - agent/plan
  - initiative/polish
  - workspace/layout
  - dnd
created_by: codex
updated_by: codex
---

# 02 - Detached Host, Frame DnD, Verification

## Task 5: Real Detached Host

**Files:**
- Create: `src/components/frame/DetachedTabHost.svelte`
- Modify: `src/types/typeTabLeaf.ts`
- Modify: `src/main.ts`
- Create: `test/component/detachedTabHost.test.ts`

- [ ] **Step 1: Write failing host tests**

Mount `DetachedTabHost` for `tabId="page-tools"` and assert pageTools content renders. Mount for `tabId="explorer-files"` and assert a focused explorer shell renders without full frame dock/navigation.

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/detachedTabHost.test.ts --fileParallelism=false
```

Expected: fails because the host does not exist.

- [ ] **Step 3: Implement host shell**

Create local state equivalent to the minimum `frameVaultman.svelte` state required by `FiltersPage` for explorer tabs. For `page-tools`, render `OperationsPage`. For `queue`, render `ExplorerQueueComp`. Do not render `NavbarDock`, frame pages viewport, frame page tabs, or global overlays.

- [ ] **Step 4: Mount from ItemView**

Change `VaultmanTabLeafView` to accept `plugin`, mount `DetachedTabHost`, unmount on close, and set `data-vm-tab-id`. Change `main.ts` view registration to `new VaultmanTabLeafView(leaf, tabId, this)`.

- [ ] **Step 5: Verify green and autofix**

Run the component test and `mcp__svelte__.svelte_autofixer` on `DetachedTabHost.svelte`.

## Task 6: Frame External Mount State

**Files:**
- Modify: `src/components/frame/frameVaultman.svelte`
- Modify: `src/components/layout/navbarDock.svelte`
- Modify: `src/components/layout/navbarTabs.svelte`
- Modify: `test/component/navbarDock.test.ts`
- Modify: `test/component/navbarTabs.test.ts`

- [ ] **Step 1: Write failing nav tests**

Assert dock/top tabs can receive `externalTabIds`, render those items with an external-mounted class or data attribute, and call `onSelect` without marking the item as locally active.

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/navbarDock.test.ts test/component/navbarTabs.test.ts --fileParallelism=false
```

Expected: fails because external-mounted props do not exist.

- [ ] **Step 3: Implement nav props**

Add `externalTabIds?: string[]` to both nav components. Render `class:is-external-mounted` and `data-external-mounted="true"` for matching ids. Keep click/keyboard selection available.

- [ ] **Step 4: Wire frame reveal behavior**

Subscribe to `plugin.leafDetachService`, derive detached canonical tab ids, translate inner tab ids with `tabIdFromInner`, and when a detached item is selected call `plugin.spawnTabLeaf(tabId)` instead of changing local active content.

- [ ] **Step 5: Verify green**

Run the nav component tests and a focused `frameVaultman`/pageFilters component suite if available.

## Task 7: Layout DnD Integration

**Files:**
- Modify: `src/components/layout/navbarDock.svelte`
- Modify: `src/components/layout/navbarTabs.svelte`
- Modify: `src/components/frame/frameVaultman.svelte`
- Modify: `src/services/serviceLayout.ts`
- Add tests as practical after inspecting existing DnD component harnesses.

- [ ] **Step 1: Add focused red coverage**

Prefer unit coverage in `serviceLayoutDetach.test.ts` for DnD result handling: a `DndDropResult` with `operation: 'detach-tab'` calls `leafDetach.detach(tabId)`, and `attach-tab` calls `leafDetach.attach(tabId)`.

- [ ] **Step 2: Implement semantic handler**

Add a layout facade function such as `applyLayoutDropAction(action, deps)` that accepts the pure action and calls injected `detach`, `attach`, or `saveLayout` callbacks.

- [ ] **Step 3: Wire UI drag targets conservatively**

Add draggable metadata for Vaultman tab items and droppable metadata for workspace/dock surfaces only where existing `@dnd-kit/svelte` provider wiring is already present or can be added without disrupting click selection. If full UI DnD wiring is too large, finish the service contract and leave UI drag activation behind a disabled control with the plan updated.

- [ ] **Step 4: Verify**

Run service tests plus affected component tests. Confirm click selection is unchanged.

## Task 8: Final Verification

**Files:**
- Svelte files touched above
- Service files touched above

- [ ] **Step 1: Svelte autofixer**

Run autofixer for each edited `.svelte` file: `pageTools.svelte`, `pageToolsLayout.svelte`, `DetachedTabHost.svelte`, `navbarDock.svelte`, `navbarTabs.svelte`, `frameVaultman.svelte`, and `SettingsUI.svelte`.

- [ ] **Step 2: Focused tests**

Run:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceLayoutDetach.test.ts test/unit/services/serviceLeafDetach.test.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/pageToolsLayout.test.ts test/component/settingsUI.test.ts test/component/navbarDock.test.ts test/component/navbarTabs.test.ts test/component/detachedTabHost.test.ts --fileParallelism=false
```

- [ ] **Step 3: Static checks**

Run:

```bash
pnpm run check
```

- [ ] **Step 4: Report residual risk**

If Obsidian runtime smoke is not run, explicitly report that drag-to-workspace and leaf restoration still need a live Obsidian check.
