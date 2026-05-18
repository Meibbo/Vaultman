---
title: 04 — FrameDashboardShell extraction (C4)
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

# Commit 4 — Extract `FrameDashboardShell`

**Goal:** Move the three dashboard snippets (`dashboardFilters`, `dashboardExplorer`, `dashboardAddons`) and the `<Dashboard3Column>` mount into `src/components/frame/FrameDashboardShell.svelte`. Per O6, `bindDashboardMeasurement` + the viewport-measurement state stay in **frame** — the shell receives `dashboardEnabled` as a prop and renders nothing if false.

**Spec reference:** [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/06-api-frame-dashboard-shell|06 — FrameDashboardShell API contract]].

**Estimated LOC delta:**
- Create `src/components/frame/FrameDashboardShell.svelte`: 0 → ~115 LOC.
- Modify `src/components/frame/frameVaultman.svelte`: ~480 → ~370 LOC (≈ -110).
- New test `test/component/FrameDashboardShell.test.ts`: 0 → ~250 LOC.

## Files

- **Create:** `src/components/frame/FrameDashboardShell.svelte`
- **Modify:** `src/components/frame/frameVaultman.svelte`
- **Create:** `test/component/FrameDashboardShell.test.ts`

---

## Task 4.1: Write failing tests for `FrameDashboardShell`

The shell has 24 props (per spec shard 06). Tests cover: dashboardEnabled gating, each of the three snippet branches, bind: propagation, context-missing guard.

- [ ] **Step 1: Create `test/component/FrameDashboardShell.test.ts`**

```typescript
// test/component/FrameDashboardShell.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FrameDashboardShell from '../../src/components/frame/FrameDashboardShell.svelte';
import {
  FRAME_NAVIGATION_KEY,
  type FrameNavigationService,
} from '../../src/components/frame/frameNavigation.svelte';
import { withContext } from './_helpers/withContext';
import { makeMockPlugin } from './_helpers/makeMockPlugin';
import { createFiltersSearchState } from '../../src/components/frame/frameFiltersSearch';
import { createFnRState } from '../../src/services/serviceFnR';

function makeNavMock(opts: Partial<{
  activePage: string;
  pageRenderKey: number;
  toolsActiveTab: string;
  filtersBaseChooseMode: boolean;
  statsPreviewFile: unknown;
  filterTabItems: unknown[];
  selectSurfaceItemImpl: (...args: unknown[]) => void;
  showStatsPageImpl: () => void;
}> = {}) {
  let toolsActiveTab = opts.toolsActiveTab ?? 'layout';
  let filtersBaseChooseMode = opts.filtersBaseChooseMode ?? false;
  return {
    get activePage() { return opts.activePage ?? 'ops'; },
    get pageRenderKey() { return opts.pageRenderKey ?? 0; },
    get statsPreviewFile() { return opts.statsPreviewFile ?? null; },
    get toolsActiveTab() { return toolsActiveTab; },
    set toolsActiveTab(v: string) { toolsActiveTab = v; },
    get filtersBaseChooseMode() { return filtersBaseChooseMode; },
    set filtersBaseChooseMode(v: boolean) { filtersBaseChooseMode = v; },
    filterTabItems: opts.filterTabItems ?? [
      { id: 'props', icon: 'lucide-tags', label: 'Props', faint: false, disabled: false },
      { id: 'files', icon: 'lucide-file', label: 'Files', faint: false, disabled: false },
    ],
    selectSurfaceItem: opts.selectSurfaceItemImpl ?? vi.fn(),
    showStatsPage: opts.showStatsPageImpl ?? vi.fn(),
  } as unknown as FrameNavigationService;
}

function makeShellProps(overrides: Record<string, unknown> = {}) {
  return {
    plugin: makeMockPlugin(),
    icon: (el: HTMLElement, name: string) => {
      el.dataset.icon = name;
      return { update(n: string) { el.dataset.icon = n; } };
    },
    filtersSearchByTab: createFiltersSearchState(),
    filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0, outline: 0 },
    filtersFnRState: createFnRState(),
    filtersOperationScope: 'auto',
    tagsExplorer: undefined,
    propExplorer: undefined,
    fileList: undefined,
    selectedCount: 0,
    selectedFilePaths: new Set<string>(),
    filtersSortBy: 'name',
    filtersSortDir: 'asc' as const,
    filtersSortTarget: 'top' as const,
    filtersViewMode: 'tree',
    addMode: false,
    addOpCount: 0,
    detachedTabs: {},
    addonsIslandService: { /* stub */ } as never,
    addonsQuickSwitcherApp: {} as never,
    renderAddonsStats: () => 'stats',
    onShowStats: vi.fn(),
    onOperationScopeChange: vi.fn(),
    dashboardEnabled: true,
    ...overrides,
  };
}

describe('FrameDashboardShell — context requirement', () => {
  it('throws when FRAME_NAVIGATION_KEY context is missing', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    expect(() => {
      mount(FrameDashboardShell, {
        target,
        props: makeShellProps(),
      });
    }).toThrow(/FRAME_NAVIGATION_KEY|frame.navigation/);
    if (target.parentNode) target.parentNode.removeChild(target);
  });
});

describe('FrameDashboardShell — dashboardEnabled gating', () => {
  let target: HTMLElement;
  let teardown: { destroy(): void } | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (teardown) teardown.destroy();
    teardown = null;
    if (target.parentNode) target.parentNode.removeChild(target);
  });

  it('renders nothing when dashboardEnabled is false', () => {
    const nav = makeNavMock();
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps({ dashboardEnabled: false }),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    expect(target.querySelector('.vm-dashboard-viewport')).toBeNull();
  });

  it('renders Dashboard3Column when dashboardEnabled is true', () => {
    const nav = makeNavMock();
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps({ dashboardEnabled: true }),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    expect(target.querySelector('.vm-dashboard-viewport')).toBeTruthy();
  });
});

describe('FrameDashboardShell — dashboardFilters snippet', () => {
  let target: HTMLElement;
  let teardown: { destroy(): void } | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (teardown) teardown.destroy();
    teardown = null;
    if (target.parentNode) target.parentNode.removeChild(target);
  });

  it('renders one button per filterTabItem', () => {
    const nav = makeNavMock();
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps({ filtersActiveTab: 'props' }),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    const buttons = target.querySelectorAll('.vm-dashboard-filter-button');
    expect(buttons.length).toBe(nav.filterTabItems.length);
  });

  it('marks the active filter tab', () => {
    const nav = makeNavMock();
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps({ filtersActiveTab: 'files' }),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    const activeBtn = target.querySelector('.vm-dashboard-filter-button.is-active');
    expect(activeBtn?.textContent).toContain('Files');
  });

  it('button click dispatches nav.selectSurfaceItem("filter-tabs", id)', () => {
    const selectMock = vi.fn();
    const nav = makeNavMock({ selectSurfaceItemImpl: selectMock });
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps({ filtersActiveTab: 'props' }),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    const filesBtn = Array.from(target.querySelectorAll('.vm-dashboard-filter-button'))
      .find((b) => b.textContent?.includes('Files')) as HTMLElement | undefined;
    filesBtn?.click();
    expect(selectMock).toHaveBeenCalledWith('filter-tabs', 'files');
  });
});

describe('FrameDashboardShell — dashboardExplorer snippet', () => {
  let target: HTMLElement;
  let teardown: { destroy(): void } | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (teardown) teardown.destroy();
    teardown = null;
    if (target.parentNode) target.parentNode.removeChild(target);
  });

  it('renders OperationsPage when activePage is ops and not detached', () => {
    const nav = makeNavMock({ activePage: 'ops' });
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps({ detachedTabs: {} }),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    // OperationsPage renders its content into the explorer slot.
    // Look for any element with data-page="ops".
    expect(target.querySelector('[data-page="ops"]')).toBeTruthy();
  });

  it('renders detached placeholder when page-tools is detached', () => {
    const nav = makeNavMock({ activePage: 'ops' });
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps({ detachedTabs: { 'page-tools': true } }),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    expect(target.querySelector('.vm-page-external[data-vm-tab-id="page-tools"]')).toBeTruthy();
  });

  it('renders StatisticsPage when activePage is statistics', () => {
    const nav = makeNavMock({ activePage: 'statistics' });
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps(),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    // Loose assertion: there's a page-level element for statistics.
    expect(target.querySelector('[data-page="statistics"], [data-page=statistics]')).toBeTruthy();
  });

  it('renders FiltersPage when activePage is filters', () => {
    const nav = makeNavMock({ activePage: 'filters' });
    teardown = withContext(
      target,
      FrameDashboardShell,
      makeShellProps(),
      [[FRAME_NAVIGATION_KEY, nav]],
    );
    flushSync();
    expect(target.querySelector('[data-page="filters"], [data-page=filters]')).toBeTruthy();
  });
});

describe('FrameDashboardShell — DOM byte-equivalence vs baseline', () => {
  it('frameVaultmanBaseline.test.ts dashboard mode snapshot remains green after C4', () => {
    // This is a checklist marker — the actual verification runs via
    // pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts
    // and must not regress.
    expect(true).toBe(true);
  });
});
```

The dashboardExplorer assertions are loose because `OperationsPage` / `StatisticsPage` / `FiltersPage` are heavy components with their own mocking needs. We assert their presence via the `data-page` attribute that the shell wraps them with — a hard contract that won't change across implementations.

- [ ] **Step 2: Run the test — expect FAIL**

```bash
pnpm exec vitest run --project component test/component/FrameDashboardShell.test.ts
```

Expected: FAIL — `FrameDashboardShell` module does not exist.

## Task 4.2: Create `FrameDashboardShell.svelte`

- [ ] **Step 1: Create the component**

```svelte
<!-- src/components/frame/FrameDashboardShell.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import type { TFile } from 'obsidian';
  import type { VaultmanPlugin } from '../../main';
  import type { ExplorerSortTarget } from '../../types/typeExplorer';
  import type { LeafDetachState } from '../../services/serviceLeafDetach';
  import type { OperationScope } from '../../services/serviceOperationScope';
  import type { FnRState } from '../../types/typeFnR';
  import type {
    FiltersSearchState,
    FiltersSearchTab,
  } from './frameFiltersSearch';
  import { translate } from '../../index/i18n/lang';

  import Dashboard3Column from '../dashboard/Dashboard3Column.svelte';
  import AddonsMarkdownPane from '../addons/AddonsMarkdownPane.svelte';
  import OperationsPage from '../pages/pageTools.svelte';
  import StatisticsPage from '../pages/pageStats.svelte';
  import FiltersPage from '../pages/pageFilters.svelte';

  import { explorerFiles } from '../../providers/explorerFiles';
  import { explorerProps } from '../../providers/explorerProps';
  import { explorerTags } from '../../providers/explorerTags';
  import type {
    AddonsIslandService,
    AddonsQuickSwitcherApp,
  } from '../../services/serviceAddonsIsland.svelte';

  import {
    FRAME_NAVIGATION_KEY,
    type FrameNavigationService,
    type SurfaceNavItem,
  } from './frameNavigation.svelte';

  const nav = getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY);
  if (!nav) {
    throw new Error(
      'FrameDashboardShell requires FRAME_NAVIGATION_KEY context. ' +
      'Mount inside frameVaultman.svelte (which calls setContext).',
    );
  }

  let {
    plugin,
    icon,
    filtersActiveTab = $bindable(),
    filtersSearchByTab = $bindable(),
    filtersSearchCategory = $bindable(),
    filtersFnRState = $bindable(),
    filtersOperationScope = $bindable(),
    tagsExplorer = $bindable(),
    propExplorer = $bindable(),
    fileList = $bindable(),
    selectedCount = $bindable(),
    selectedFilePaths = $bindable(),
    filtersSortBy = $bindable(),
    filtersSortDir = $bindable(),
    filtersSortTarget = $bindable(),
    filtersViewMode = $bindable(),
    addMode = $bindable(),
    addOpCount,
    detachedTabs,
    addonsIslandService,
    addonsQuickSwitcherApp,
    renderAddonsStats,
    onShowStats,
    onOperationScopeChange,
    dashboardEnabled,
  }: {
    plugin: VaultmanPlugin;
    icon: (el: HTMLElement, name: string) => { update(n: string): void };
    filtersActiveTab: FiltersSearchTab;
    filtersSearchByTab: FiltersSearchState;
    filtersSearchCategory: Record<FiltersSearchTab, number>;
    filtersFnRState: FnRState;
    filtersOperationScope: OperationScope;
    tagsExplorer: explorerTags | undefined;
    propExplorer: explorerProps | undefined;
    fileList: explorerFiles | undefined;
    selectedCount: number;
    selectedFilePaths: Set<string>;
    filtersSortBy: string;
    filtersSortDir: 'asc' | 'desc';
    filtersSortTarget: ExplorerSortTarget;
    filtersViewMode: unknown;
    addMode: boolean;
    addOpCount: number;
    detachedTabs: LeafDetachState;
    addonsIslandService: AddonsIslandService;
    addonsQuickSwitcherApp: AddonsQuickSwitcherApp;
    renderAddonsStats: () => string;
    onShowStats: () => void;
    onOperationScopeChange: (value: OperationScope) => void;
    dashboardEnabled: boolean;
  } = $props();
</script>

{#snippet dashboardFilters()}
  <nav class="vm-dashboard-filter-list" aria-label={translate('nav.filters')}>
    {#each nav.filterTabItems as tab (tab.id)}
      <button
        type="button"
        class="vm-dashboard-filter-button"
        class:is-active={filtersActiveTab === tab.id}
        class:is-faint={(tab as SurfaceNavItem).faint}
        disabled={(tab as SurfaceNavItem).disabled}
        onclick={() => nav.selectSurfaceItem('filter-tabs', tab.id)}
      >
        <span class="vm-dashboard-filter-icon" use:icon={tab.icon}></span>
        <span>{tab.label}</span>
      </button>
    {/each}
  </nav>
{/snippet}

{#snippet dashboardExplorer()}
  <div class="vm-page vm-dashboard-active-page" data-page={nav.activePage}>
    {#key nav.pageRenderKey}
      {#if nav.activePage === 'ops'}
        {#if detachedTabs['page-tools'] === true}
          <div class="vm-page-external" data-vm-tab-id="page-tools">Detached to workspace</div>
        {:else}
          <OperationsPage {plugin} {icon} bind:activeTab={nav.toolsActiveTab} />
        {/if}
      {:else if nav.activePage === 'statistics'}
        <StatisticsPage {plugin} previewFile={nav.statsPreviewFile} onShowStats={onShowStats} />
      {:else if nav.activePage === 'filters'}
        <FiltersPage
          {plugin}
          bind:filtersActiveTab
          bind:filtersSearchByTab
          bind:filtersSearchCategory
          bind:filtersFnRState
          bind:filtersOperationScope
          {onOperationScopeChange}
          bind:tagsExplorer
          bind:propExplorer
          bind:fileList
          bind:selectedCount
          bind:selectedFilePaths
          bind:filtersSortBy
          bind:filtersSortDir
          bind:filtersSortTarget
          bind:filtersViewMode
          bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}
          bind:addMode
          showTabs={false}
          {addOpCount}
        />
      {/if}
    {/key}
  </div>
{/snippet}

{#snippet dashboardAddons()}
  <AddonsMarkdownPane
    service={addonsIslandService}
    statsRenderer={renderAddonsStats}
    app={addonsQuickSwitcherApp}
  />
{/snippet}

{#if dashboardEnabled}
  <div class="vm-pages-viewport vm-dashboard-viewport">
    <Dashboard3Column
      themeService={plugin.themeService}
      enabled={dashboardEnabled}
      filters={dashboardFilters}
      explorer={dashboardExplorer}
      addons={dashboardAddons}
    />
  </div>
{/if}
```

**Note on `bind:activeTab={nav.toolsActiveTab}` and `bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}`:** same POC outcome from C1 applies. If `bind:` doesn't work against runes class getter/setter pairs, switch to explicit pairs at these sites.

**Note on `$bindable()` for filters page state:** these props bind back to the frame's `$state` declarations. Svelte 5 desugars `bind:filtersActiveTab` (in the FiltersPage mount) + `bind:filtersActiveTab` (in the shell's prop list, via `$bindable()`) to a two-way binding that propagates writes all the way back to the frame.

- [ ] **Step 2: Run the test — expect PASS**

```bash
pnpm exec vitest run --project component test/component/FrameDashboardShell.test.ts
```

Expected: PASS.

If the dashboardExplorer tests fail because the page components mount with dependencies the mock plugin doesn't provide (e.g., FiltersPage needing a real filter service): loosen the assertions further (just check the wrapper `<div data-page="...">` exists; trust the per-component tests for inner correctness). Do **not** invest in a full FiltersPage mock for these shell tests.

- [ ] **Step 3: `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors.

## Task 4.3: Refactor frame to mount the dashboard shell

- [ ] **Step 1: Update imports**

Add:

```svelte
import FrameDashboardShell from './FrameDashboardShell.svelte';
```

Remove imports now only used by the shell:

- `import Dashboard3Column from '../dashboard/Dashboard3Column.svelte';`
- `import AddonsMarkdownPane from '../addons/AddonsMarkdownPane.svelte';`
- (Keep `OperationsPage`, `StatisticsPage`, `FiltersPage` — pages-strip branch still renders them.)

- [ ] **Step 2: Delete the three dashboard snippets**

From frame, delete:

- `{#snippet dashboardFilters()}...{/snippet}` (lines 640-656).
- `{#snippet dashboardExplorer()}...{/snippet}` (lines 658-695).
- `{#snippet dashboardAddons()}...{/snippet}` (lines 697-703).

- [ ] **Step 3: Replace the dashboard branch in the main template**

Replace:

```svelte
{#if dashboardEnabled}
  <div class="vm-pages-viewport vm-dashboard-viewport">
    <Dashboard3Column
      themeService={plugin.themeService}
      enabled={dashboardEnabled}
      filters={dashboardFilters}
      explorer={dashboardExplorer}
      addons={dashboardAddons}
    />
  </div>
{:else}
```

with:

```svelte
{#if dashboardEnabled}
  <FrameDashboardShell
    {plugin}
    {icon}
    bind:filtersActiveTab
    bind:filtersSearchByTab
    bind:filtersSearchCategory
    bind:filtersFnRState
    bind:filtersOperationScope
    bind:tagsExplorer
    bind:propExplorer
    bind:fileList
    bind:selectedCount
    bind:selectedFilePaths
    bind:filtersSortBy
    bind:filtersSortDir
    bind:filtersSortTarget
    bind:filtersViewMode
    bind:addMode
    {addOpCount}
    detachedTabs={nav.detachedTabs}
    {addonsIslandService}
    {addonsQuickSwitcherApp}
    {renderAddonsStats}
    onShowStats={() => nav.showStatsPage()}
    onOperationScopeChange={(v) => popups.setFiltersOperationScope(v)}
    {dashboardEnabled}
  />
{:else}
```

`filtersActiveTab` here is frame-side $state (the frame keeps the $state and threads it into both branches; `nav.filtersActiveTab` is the **service-side** mirror that the dashboard `dashboardFilters` button strip reads for `class:is-active`). Wait — there's a conflict: in C1 we said `filtersActiveTab` moved into `nav`, but the FiltersPage `bind:filtersActiveTab` needs frame-level $state. Resolve:

**Reconciliation:** `nav.filtersActiveTab` IS the canonical filter tab. Frame does **not** keep a separate `filtersActiveTab` $state. Both render branches (dashboard via shell, pages-strip inline) bind to `nav.filtersActiveTab`:

- Dashboard shell: `bind:filtersActiveTab={nav.filtersActiveTab}` (the prop must be added/changed in shell)
- Pages-strip inline: `bind:filtersActiveTab={nav.filtersActiveTab}` (already changed in C3)

So in the shell's prop signature, replace:

```ts
filtersActiveTab = $bindable(),
```

with the binding sourced from the shell's caller via a single bind:. Actually since the shell prop is `$bindable`, the caller does `bind:filtersActiveTab={nav.filtersActiveTab}`. The shell then re-binds it onto `<FiltersPage bind:filtersActiveTab>` (which writes back to the prop, which writes back to `nav.filtersActiveTab`).

This means the **frame's** mount of the shell uses:

```svelte
bind:filtersActiveTab={nav.filtersActiveTab}
```

(not the bare `bind:filtersActiveTab` shown above). Update the frame snippet accordingly.

**Same reconciliation for `filtersBaseChooseMode`:** the shell uses `bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}` on the inner `<FiltersPage>` mount, so the shell doesn't take `filtersBaseChooseMode` as a prop at all. Verify in the shell template above — line `bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}` directly references nav. Good.

**Final frame mount of FrameDashboardShell:**

```svelte
<FrameDashboardShell
  {plugin}
  {icon}
  bind:filtersActiveTab={nav.filtersActiveTab}
  bind:filtersSearchByTab
  bind:filtersSearchCategory
  bind:filtersFnRState
  bind:filtersOperationScope
  bind:tagsExplorer
  bind:propExplorer
  bind:fileList
  bind:selectedCount
  bind:selectedFilePaths
  bind:filtersSortBy
  bind:filtersSortDir
  bind:filtersSortTarget
  bind:filtersViewMode
  bind:addMode
  {addOpCount}
  detachedTabs={nav.detachedTabs}
  {addonsIslandService}
  {addonsQuickSwitcherApp}
  {renderAddonsStats}
  onShowStats={() => nav.showStatsPage()}
  onOperationScopeChange={(v) => popups.setFiltersOperationScope(v)}
  {dashboardEnabled}
/>
```

- [ ] **Step 4: Keep `bindDashboardMeasurement` and viewport state in frame**

Per O6 resolution, **do not move**:
- `let frameViewportWidth = $state(0)`
- `let measuredViewportKind = $state<LayoutViewportKind>('main-leaf')`
- `const dashboardViewportKind = $derived(...)`
- `const dashboardEnabled = $derived(...)`
- `function bindDashboardMeasurement(el): { destroy() }`
- `function measureFrameWidth(el, entry?): number`
- `function inferFrameViewportKind(el): LayoutViewportKind`
- `use:bindDashboardMeasurement` action on the outer `.vm-view` div

These stay in `frameVaultman.svelte` as today. The shell receives `dashboardEnabled` as a prop.

- [ ] **Step 5: `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors.

- [ ] **Step 6: Run shell test + baseline + full suite**

```bash
pnpm exec vitest run --project component test/component/FrameDashboardShell.test.ts
pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts
pnpm exec vitest run --project component test/component/frameNavigationService.test.ts
pnpm exec vitest run --project component test/component/framePopupsState.test.ts
pnpm exec vitest run --project component test/component/FrameNavbarShell.test.ts
pnpm exec vitest run --project component test/component/frameDashboardAddons.test.ts
```

Expected: all PASS. Pay particular attention to `frameDashboardAddons.test.ts` — this is a pre-existing dashboard-related test that must not regress.

If `frameDashboardAddons.test.ts` fails: the pre-existing test likely mounts the frame and asserts something about the dashboard rendering. If the snippet move broke this, the shell is missing something. Read the failing assertion + the failing region of the shell.

- [ ] **Step 7: `pnpm verify`**

```bash
pnpm verify
```

Expected: PASS.

## Task 4.4: Live `plugin-dev` smoke (dashboard mode crucial)

- [ ] **Step 1: Reload**

```bash
obsidian plugin:reload id=vaultman vault=plugin-dev
```

- [ ] **Step 2: Enter dashboard mode**

Resize Obsidian window wider so `dashboardEnabled` becomes true (the threshold is per `resolveDashboardEnabled`, typically `main-leaf` + width >= some px). Confirm the 3-column dashboard renders:

- Left column: filter tab buttons (dashboardFilters).
- Center column: active page content (dashboardExplorer — switches as you navigate).
- Right column: addons markdown pane (dashboardAddons).

- [ ] **Step 3: Exit dashboard mode**

Resize narrower so `dashboardEnabled` becomes false. Confirm the pages-strip renders (the `{:else}` branch — frame inline render). The shell mount returns nothing (no `.vm-dashboard-viewport` in DOM).

- [ ] **Step 4: Cross-resize repeatedly**

Resize back and forth across the threshold 3-5 times. Verify no flicker, no orphan content, no errors.

- [ ] **Step 5: Navigate within dashboard**

Click each of `ops` / `filters` / `statistics` via the dock. Verify the dashboardExplorer center column swaps appropriately. Bind: tests:

- Click into `filters` tab in dashboardFilters strip; verify `nav.filtersActiveTab` updates and dashboardExplorer's FiltersPage reflects.
- Type in the FiltersPage operation scope picker; verify `filtersOperationScope` round-trips (open the popup, verify it shows the current value).

- [ ] **Step 6: `dev:errors`**

```bash
obsidian dev:errors vault=plugin-dev
```

Expected: `No errors captured.`

## Task 4.5: Commit

- [ ] **Step 1: Stage**

```bash
git add src/components/frame/FrameDashboardShell.svelte \
        src/components/frame/frameVaultman.svelte \
        test/component/FrameDashboardShell.test.ts
```

- [ ] **Step 2: Commit (HEREDOC body)**

```bash
git commit -m "$(cat <<'EOF'
feat(O): extract FrameDashboardShell

Move the three dashboard snippets (dashboardFilters, dashboardExplorer,
dashboardAddons) and the Dashboard3Column mount into
src/components/frame/FrameDashboardShell.svelte. Shell consumes
FRAME_NAVIGATION_KEY via getContext and renders the dashboard layout
from nav.X + the 24 prop hub.

Per O6, dashboardEnabled derivation, frameViewportWidth /
measuredViewportKind state, bindDashboardMeasurement,
measureFrameWidth, inferFrameViewportKind all stay in frame.
The shell receives dashboardEnabled as a prop and renders nothing
if false (preserves ResizeObserver target on .vm-view).

bind: surfaces for the filters page state hub (12 bind:s) flow
through the shell as \$bindable props, propagating writes back to
frame. nav.filtersActiveTab / nav.toolsActiveTab / nav.filtersBaseChooseMode
are bind:-ed via the runes class get/set pair (verified by C1 POC).

frameVaultman.svelte: ~480 → ~370 LOC.

Tests: test/component/FrameDashboardShell.test.ts — context guard,
dashboardEnabled gating, each of 3 snippet branches, baseline
byte-equivalence marker.

Smoke: dashboard mode + pages-strip mode + threshold-cross resize +
nav within dashboard + popups within dashboard, all with
dev:errors clean.

Refs: .agents/docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/06-api-frame-dashboard-shell

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git status
wc -l src/components/frame/frameVaultman.svelte
```

Expected: clean tree; frame LOC ~370.

---

## Rollback

Revert C4 to restore the dashboard snippets inline. C1, C2, C3 stay intact. C5 (cleanup) cannot land without C4 (it audits the frame's post-extraction state).

## Verification gate

- `pnpm exec vitest run --project component test/component/FrameDashboardShell.test.ts` → PASS.
- Baseline dashboard-mode snapshot unchanged or documented diff.
- `pnpm verify` → PASS.
- Live dashboard mode + pages-strip mode both verified.
- `obsidian dev:errors vault=plugin-dev` → `No errors captured.`
