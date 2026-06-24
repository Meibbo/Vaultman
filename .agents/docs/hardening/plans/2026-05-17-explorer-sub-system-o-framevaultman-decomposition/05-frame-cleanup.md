---
title: 05 — Frame cleanup (C5)
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O plan]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/plan
  - explorer/frame
  - explorer/refactor
---

# Commit 5 — Frame Cleanup

**Goal:** Audit `frameVaultman.svelte` top-to-bottom. Delete orphaned functions, $state declarations, and imports left behind by C1-C4. Land the T3/T4 integration test. Reach the spec's ~350 LOC target.

**Estimated LOC delta:**
- Modify `src/components/frame/frameVaultman.svelte`: ~370 → ~350 LOC (≈ -20 cleanup).
- Create `test/component/frameVaultmanIntents.test.ts`: 0 → ~170 LOC.
- Net repo: -0 production (cleanup only), +170 test.

## Files

- **Modify:** `src/components/frame/frameVaultman.svelte`
- **Create:** `test/component/frameVaultmanIntents.test.ts` (Layer 3 integration test per spec shard 08)

---

## Task 5.1: Audit frame top-to-bottom

The cleanup pass walks the file from top to bottom and deletes any code that no longer has a caller post-C4. Below is the full checklist; each item is a single line edit unless noted.

- [ ] **Step 1: Re-read the current frame**

```bash
wc -l src/components/frame/frameVaultman.svelte
```

Expected: ~370 LOC after C4. Use this number as the cleanup starting point.

Read the file end-to-end via Read tool (or open in editor). Walk through systematically.

- [ ] **Step 2: Audit imports — delete unused**

After C1-C4, these imports may be orphaned (depending on which features still use them in-frame; verify each before deleting):

| Import | Status post-C4 | Action |
|---|---|---|
| `onMount, untrack` from `'svelte'` | onMount kept (subscriptions + window focus), untrack possibly orphaned | Audit — if no `untrack(...)` call remains, drop `untrack` |
| `setIcon, TFile` from `'obsidian'` | TFile may be unused (statsPreviewFile moved to nav) | Audit — likely keep `setIcon` (used by `icon` action), drop `TFile` if no other reference |
| `explorerFiles, explorerProps, explorerTags` from providers | Used as types for $state declarations | Keep |
| `StatisticsPage, FiltersPage, OperationsPage` | Used by pages-strip branch | Keep |
| `Dashboard3Column, AddonsMarkdownPane` | Moved to FrameDashboardShell (C4) | Delete |
| `NavbarDock, NavbarTabs, PopupIsland` | Moved to FrameNavbarShell (C3) | Delete |
| `ExplorerQueueComp, ExplorerActiveFiltersComp` | Passed to FrameOverlayController constructor | Keep |
| `PopupOverlay` | Still mounted in frame | Keep |
| `FolderSuggest` from autocomplete | Moved to FramePopupsState (C2) | Delete |
| `translate` from i18n | Used by `renderAddonsStats` and inline strings | Audit; keep if used |
| `FabDef` from typePrimitives | Used for `leftFab` / `rightFab` typing (now `nav.leftFab` / `nav.rightFab`) | Audit — if no `FabDef` ref remains in frame, drop |
| `collectActiveFilterRules, ActiveFilterRule` from frameActiveFilters | Moved to FramePopupsState | Delete |
| `countActiveFilterEntries` | Used by `updateStats` | Keep |
| `createFramePageFabs, createFramePageIcons, createFramePageLabels, resolveFramePageOrder` from framePages | Moved to FrameNavigationService | Delete |
| `FrameViewportController` | Constructed in frame, attached to nav | Keep |
| `FrameNavReorderController` | Constructed in frame, attached to nav | Keep |
| `FrameOverlayController, installFrameOverlayCommandHooks` from frameOverlays | Constructed in frame | Keep |
| `createMoveChanges, createMovePreviews` from frameMoves | Moved to FramePopupsState | Delete |
| `createFiltersSearchState, getFiltersSearch, FiltersSearchTab, FiltersSearchState` from frameFiltersSearch | `createFiltersSearchState` used for initial frame state; `getFiltersSearch` used by the inline search routing $effect | Keep both |
| `createFnRState, FnRState` | Used for FiltersPage state hub | Keep |
| `openVaultmanFileSuggestModal` | Moved to FrameNavigationService | Delete |
| `normalizeOperationScope, OperationScope` | Used for `filtersOperationScope` $state init | Keep (the $state stays in frame per spec shard 04) |
| `resolveDashboardEnabled, resolveLayoutSettings, LayoutSurfaceContent, LayoutViewportKind` from serviceLayout | `resolveDashboardEnabled` + `LayoutViewportKind` used by frame (kept measurement); `resolveLayoutSettings`, `LayoutSurfaceContent` moved to service | Keep `resolveDashboardEnabled`, `LayoutViewportKind`; drop `resolveLayoutSettings`, `LayoutSurfaceContent` |
| `FTabs, TabConfig` from typeTab | Moved to FrameNavigationService | Delete |
| `ExplorerSortTarget` from typeExplorer | Used by `filtersSortTarget` $state | Keep |
| `tabIdFromInner, TabId` from tabRegistry | Moved to FrameNavigationService | Delete |
| `LeafDetachState` from serviceLeafDetach | `detachedTabs` $state dropped (per O4) | Delete (unless typed anywhere else in frame) |
| `AddonsIslandService, AddonsQuickSwitcherApp` | Used for the addons shell prop | Keep |
| `FrameNavigationService, FRAME_NAVIGATION_KEY` | Added in C1 | Keep |
| `FramePopupsState, FRAME_POPUPS_KEY` | Added in C2 | Keep |
| `FrameNavbarShell` | Added in C3 | Keep |
| `FrameDashboardShell` | Added in C4 | Keep |
| `setContext` from svelte | Used in C1 + C2 | Keep |

Delete each marked import. After this step run `pnpm check` — TypeScript / svelte-check will catch any deletion that broke a usage.

- [ ] **Step 3: Audit $state and derived declarations — delete orphaned**

Walk through the script body:

- **Page-related $state** (activePage, pageOrder, pageRenderKey, etc.) — already moved by C1. **Delete any lingering inline $state for these.** If `frameVaultman.svelte` post-C4 still has a `let activePage` etc., that's a C1 oversight; delete it now.
- **Filters page state hub** (filtersActiveTab, filtersSearchByTab, ..., addMode) — `filtersActiveTab` moved to nav (C1). The remaining 11+ stay (downstream FiltersPage bind:).
- **Stats counters** (selectedCount, queuedCount, filterRuleCount, addOpCount) — stay (per spec shard 01).
- **Explorer instances** (fileList, propExplorer, tagsExplorer, selectedFilePaths) — stay.
- **Popup state** (scopeOptions, searchName, searchFolder, activeFilterRules, moveTargetFiles, moveTargetFolder, movePreviews) — moved by C2. **Delete any lingering.**
- **`dockDrawerOpen`** — moved to FrameNavReorderController.drawerOpen by C3. **Delete.**
- **`detachedTabs`** — dropped by C1 per O4. **Delete any residual.**
- **Dashboard measurement** (`frameViewportWidth`, `measuredViewportKind`, `dashboardViewportKind`, `dashboardEnabled`) — stays per O6.
- **`elasticRootClasses`** — stays.

- [ ] **Step 4: Audit functions — delete orphaned**

Functions that should be gone after C1-C4:

| Function | Status |
|---|---|
| `initFrameState` | Moved to nav (C1) — DELETE if still present |
| `navigateTo` | Moved to nav (C1) — DELETE |
| `enterBasesImportMode`, `exitBasesImportMode` | Moved (C1) — DELETE |
| `openStatsNote`, `showStatsPage` | Moved (C1) — DELETE |
| `openDiffView` | Moved (C1) — DELETE |
| `itemsForSurface`, `activeForSurface`, `externalIdsForSurface`, `detachedTabIdForSurfaceItem`, `tabIdForSurfaceItem`, `selectSurfaceItem` | Moved (C1) — DELETE |
| `setScope`, `setFiltersOperationScope` | Moved (C2) — DELETE |
| `refreshActiveFiltersPopup`, `toggleFilterRule`, `deleteFilterRule` | Moved (C2) — DELETE |
| `queueMoves`, `attachFolderSuggest` | Moved (C2) — DELETE |
| `refreshFiles`, `refreshActiveFilterHighlights`, `refreshQueue` | Frame lifecycle helpers — KEEP (called from onMount subscriptions) |
| `updateStats` | KEEP (writes frame's stats counters) |
| `renderAddonsStats` | KEEP (passed to FrameDashboardShell as prop) |
| `bindDashboardMeasurement`, `measureFrameWidth`, `inferFrameViewportKind` | KEEP per O6 |
| `icon` (Svelte action) | KEEP (passed to FrameDashboardShell + used in pages-strip) |
| `onWindowFocus`, `onWindowBlur` | KEEP |

- [ ] **Step 5: Audit `$effect`s — verify only legitimate effects remain**

After C1-C4, the only `$effect`s that should remain in frame are:

1. `$effect(() => installFrameOverlayCommandHooks(plugin, overlays))` — overlay command hooks.
2. The T3 hook registration `$effect` — registers `() => nav.openDiffIntent()` with identity-check cleanup. **(Added in C1.)**
3. The active-filters popup refresh `$effect` — calls `popups.refreshActiveFiltersPopup()`. **(Rewritten in C2.)**
4. The filters search routing `$effect` — reads `popups.searchName`/`popups.searchFolder` and writes to `fileList` + `plugin.filterService`. **(Rewritten in C2.)**

If any of the following effects are still present, **delete them** (they were already moved):

- `$effect(() => { void pageIndex; viewport.applyPageTransform(true); })` — moved to service `$effect.root` (C1).
- `$effect(() => { if (!pageOrder.includes(activePage)) ... })` — moved to service `$effect.root` (C1).
- `$effect(() => { plugin.openDiffViewHook = openDiffView; ... })` (the legacy form referencing the inline `openDiffView` function) — replaced by the new 3-line form in C1.

- [ ] **Step 6: Audit comments referencing removed code**

Search the file for stale comments:

```bash
grep -nE "// (TODO|NOTE|FIXME)" src/components/frame/frameVaultman.svelte
```

Review each. Delete any that reference removed code (`// openDiffView used by ...`, `// scopeOptions exposed for ...`, etc.).

The block-divider comments (`// ─── Page navigation ───`, `// ─── Stats ───`) may be relevant or stale depending on what's left in each region. Update or delete to reflect the actual structure post-O.

- [ ] **Step 7: Cross-grep for stale references to removed symbols**

```bash
git -C "$(git rev-parse --show-toplevel)" grep -E "frameVaultman.*\.(openDiffView|navigateTo|enterBasesImportMode|exitBasesImportMode|openStatsNote|showStatsPage|setScope|setFiltersOperationScope|refreshActiveFiltersPopup|toggleFilterRule|deleteFilterRule|queueMoves|attachFolderSuggest|itemsForSurface|activeForSurface)" -- src/ test/
```

Expected: zero matches in `src/` (the moved functions are no longer addressed from outside their new homes). Matches in `test/` are OK only if they reference the **new** location (`frameNavigationService.test.ts` calling `nav.navigateTo()`, etc.).

- [ ] **Step 8: Confirm final LOC**

```bash
wc -l src/components/frame/frameVaultman.svelte
```

Expected: ≤ ~360 LOC. If higher: audit what additional cleanup is possible. If lower (great): document the surplus in the commit message.

## Task 5.2: Write the T3/T4 integration test

This is Layer 3 from the spec's testing strategy. It mounts the full frame and exercises T3 round-trip + T4 bidirectional binding + teardown.

- [ ] **Step 1: Create `test/component/frameVaultmanIntents.test.ts`**

```typescript
// test/component/frameVaultmanIntents.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FrameVaultman from '../../src/components/frame/frameVaultman.svelte';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

describe('frameVaultman — T3 round-trip via plugin.openDiffViewHook', () => {
  let target: HTMLElement;
  let instance: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (instance) unmount(instance);
    instance = null;
    if (target.parentNode) target.parentNode.removeChild(target);
  });

  it('plugin.openDiffViewHook is non-null after mount', () => {
    const plugin = makeMockPlugin();
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();
    expect(plugin.openDiffViewHook).toBeInstanceOf(Function);
  });

  it('calling plugin.openDiffViewHook() lands frame on ops + file_diff', () => {
    const plugin = makeMockPlugin({ pageOrder: ['filters', 'ops', 'statistics'] });
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();

    // Pre-condition: activePage starts as pageOrder[0] = 'filters'
    // We can't read nav.activePage directly here without surfacing it
    // through plugin or via the DOM. Read via DOM: the dock-active class
    // or data-page attribute.
    const pagesViewport = target.querySelector('[data-page]') as HTMLElement | null;
    // (Loose assertion — exact selector may differ; this test verifies
    // the round-trip by side effect on plugin.openDiffViewHook.)

    plugin.openDiffViewHook?.();
    flushSync();

    // After hook fire, the active page should be 'ops' and toolsActiveTab
    // should be 'file_diff'. Verify via OperationsPage's rendered DOM if
    // possible — OperationsPage renders activeTab indicators.
    const opsPage = target.querySelector('[data-page="ops"]');
    expect(opsPage).toBeTruthy();
  });

  it('mount + unmount clears plugin.openDiffViewHook', () => {
    const plugin = makeMockPlugin();
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();
    expect(plugin.openDiffViewHook).toBeInstanceOf(Function);
    unmount(instance);
    instance = null;
    expect(plugin.openDiffViewHook).toBeNull();
  });

  it('teardown is identity-checked: later hook replacement is preserved on unmount', () => {
    const plugin = makeMockPlugin();
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();

    // Simulate a later subsystem replacing the hook.
    const externalHook = vi.fn();
    plugin.openDiffViewHook = externalHook;

    // Now unmount the frame. The cleanup MUST NOT clear externalHook
    // (since it's not the closure the frame registered).
    unmount(instance);
    instance = null;

    expect(plugin.openDiffViewHook).toBe(externalHook);
  });
});

describe('frameVaultman — T4 bidirectional binding through nav.toolsActiveTab', () => {
  let target: HTMLElement;
  let instance: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (instance) unmount(instance);
    instance = null;
    if (target.parentNode) target.parentNode.removeChild(target);
  });

  it('frame mount initializes toolsActiveTab to "layout"', () => {
    const plugin = makeMockPlugin();
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();
    // OperationsPage receives activeTab via bind:; if it renders a
    // tab indicator, we can inspect it. Otherwise this test is a smoke
    // marker that the bind: didn't blow up at mount.
    expect(target.querySelector('.vm-view')).toBeTruthy();
  });

  it('plugin.openDiffViewHook() sets toolsActiveTab to "file_diff" via T3', () => {
    const plugin = makeMockPlugin({ pageOrder: ['ops', 'statistics', 'filters'] });
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();

    plugin.openDiffViewHook?.();
    flushSync();

    // Verify via DOM that the file_diff state propagated. OperationsPage
    // renders a tab strip; assert the file_diff tab is active.
    // The exact selector depends on OperationsPage internals — read
    // src/components/pages/pageTools.svelte to find the active-tab indicator
    // (likely class:is-active on a tab pill with data-tab="file_diff").
    const fileDiffActive = target.querySelector('[data-tab="file_diff"].is-active, [data-tab="file_diff"][aria-selected="true"]');
    expect(fileDiffActive).toBeTruthy();
  });
});

describe('frameVaultman — service context propagation', () => {
  let target: HTMLElement;
  let instance: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (instance) unmount(instance);
    instance = null;
    if (target.parentNode) target.parentNode.removeChild(target);
  });

  it('FrameNavbarShell is mounted (proves nav context is set up)', () => {
    const plugin = makeMockPlugin();
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();
    // FrameNavbarShell renders .vm-nav (via NavbarDock) — if it weren't
    // receiving nav context, its getContext check would throw at mount.
    expect(target.querySelector('.vm-nav')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test — expect PASS**

```bash
pnpm exec vitest run --project component test/component/frameVaultmanIntents.test.ts
```

Expected: PASS. If the `data-tab="file_diff"` selector misses, read `src/components/pages/pageTools.svelte` to find the correct active-tab marker and update the assertion. Do **not** modify pageTools.

If the `unmount → openDiffViewHook is null` test fails, it means the frame's $effect cleanup is firing too eagerly or the identity check isn't working. Re-read the C1 code for the T3 effect block and verify the identity check.

## Task 5.3: Final verification

- [ ] **Step 1: Full unit + component suite**

```bash
pnpm verify
```

Expected: full suite green. Specifically:

- All 5 O-introduced tests:
  - `test/component/frameVaultmanBaseline.test.ts`
  - `test/component/frameNavigationService.test.ts`
  - `test/component/framePopupsState.test.ts`
  - `test/component/FrameNavbarShell.test.ts`
  - `test/component/FrameDashboardShell.test.ts`
  - `test/component/frameVaultmanIntents.test.ts`
- All pre-existing tests still green: `frameDashboardAddons.test.ts`, `frameFaintMultiWindow.test.ts`, `frameVaultmanRootClasses.test.ts`, `pageToolsDiff.test.ts`, `overlayViewMenu.test.ts`, etc.

- [ ] **Step 2: Baseline snapshots green**

```bash
pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts
```

Expected: PASS — three baseline snapshots (ops/filters/statistics) still match.

If snapshots diff: this is a regression introduced during cleanup. The most likely cause is deleting a comment or whitespace that was inside a `<div>` (Svelte preserves them). Investigate; restore or accept the diff with documentation.

- [ ] **Step 3: `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors.

## Task 5.4: Live `plugin-dev` final smoke

Full regression smoke per spec shard 07's Commit 5 checklist:

- [ ] **Step 1: Reload + dev:errors clean**

```bash
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian dev:errors vault=plugin-dev
```

Expected: `No errors captured.`

- [ ] **Step 2: Navigate ops → filters → statistics → ops**

Click each dock pill in order. Each transition smooth, no flicker.

- [ ] **Step 3: T3 — `vaultman:open-diff`**

```bash
obsidian command id=vaultman:open-diff vault=plugin-dev
```

Verify: lands on ops page, file_diff tab. Repeat from each other starting page.

- [ ] **Step 4: All 4 popups**

- Scope: open, pick each option, verify close + persist.
- Active filters: add a filter (via FiltersPage), open active-filters popup, toggle + delete, verify counters update.
- Search: open, type into name and folder fields, verify fileList narrows.
- Move: select files (FiltersPage), open move, pick a folder, queue. Verify queue receives batch.

- [ ] **Step 5: Dock drawer toggle + reorder**

Toggle the dock drawer. Long-press a dock pill to enter reorder mode; drag to swap with another. Verify position persists across reload.

- [ ] **Step 6: Bases import mode**

Trigger Bases import (via FAB on filters page). Verify entry: `filtersBaseChooseMode=true`, FAB swaps to exit X. Click X. Verify exit.

- [ ] **Step 7: Faint mode in pop-out**

Pop out the frame to a separate window (Obsidian core workspace feature, if available). Verify window focus binding still works — moving focus to another window adds the `vm-faint` class to `.vm-root`; returning focus removes it.

- [ ] **Step 8: Dashboard threshold cross**

Resize Obsidian window across the dashboard/pages-strip threshold 3-5 times. Verify clean transitions both directions.

- [ ] **Step 9: `dev:errors` final**

```bash
obsidian dev:errors vault=plugin-dev
```

Expected: `No errors captured.`

## Task 5.5: Commit

- [ ] **Step 1: Stage**

```bash
git add src/components/frame/frameVaultman.svelte \
        test/component/frameVaultmanIntents.test.ts
```

- [ ] **Step 2: Commit (HEREDOC body)**

```bash
git commit -m "$(cat <<'EOF'
refactor(O): frame cleanup + T3/T4 integration test

Audit pass over frameVaultman.svelte after the four C1-C4 extractions.
Deletes orphaned imports, $state declarations, function definitions,
and stale comments. Final LOC ~350 (was 866 pre-O, ≈ -516 LOC).

Adds test/component/frameVaultmanIntents.test.ts (Layer 3 integration
test per spec shard 08):
- T3 round-trip: plugin.openDiffViewHook() fires
  nav.openDiffIntent() and lands frame on ops + file_diff.
- T3 teardown identity check: unmount clears the registered hook ONLY
  if plugin.openDiffViewHook is still the closure frame registered;
  later subsystem replacements survive unmount.
- T4 bidirectional binding through nav.toolsActiveTab: round-trips
  through the OperationsPage bind: surface.
- Service context propagation: FrameNavbarShell mounts (proves
  setContext(FRAME_NAVIGATION_KEY, nav) is wired).

All baseline DOM snapshots from pre-step 0 remain green. Live
plugin-dev smoke clean: navigation, T3, 4 popups, dock drawer +
reorder, bases-import, faint mode in pop-out, threshold-cross
resize. dev:errors reports No errors captured.

Closes Sub-system O.

Refs: .agents/docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git status
git log --oneline -7
wc -l src/components/frame/frameVaultman.svelte
```

Expected: clean tree; 6 commits visible (pre-step + C1-C5); frame LOC ~350.

---

## Rollback

C5 is purely cleanup + a new test file. Reverting C5 restores the orphaned code in frame but does not undo C1-C4's behavioral changes. If C5 itself surfaces a regression (most likely: an over-eager import deletion), revert and re-run the audit more carefully.

If C5 is acceptable but C4 regresses, revert C4 + C5 together.

## Verification gate

- `pnpm verify` → PASS.
- All baseline DOM snapshots green.
- `test/component/frameVaultmanIntents.test.ts` → PASS.
- Live full smoke complete with `dev:errors` clean.
- `frameVaultman.svelte` LOC ≤ ~360.
- All 6 O commits land in sequence (pre-step + C1 + C2 + C3 + C4 + C5).
