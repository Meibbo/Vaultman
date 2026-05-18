---
title: 01 — FrameNavigationService extraction (C1)
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

# Commit 1 — Extract `FrameNavigationService`

**Goal:** Move page navigation state + intent methods + surface derivations + T3/T4 routing into `src/components/frame/frameNavigation.svelte.ts`. Frame instantiates the service, registers `FRAME_NAVIGATION_KEY` via `setContext`, and reads `nav.X` instead of inline locals.

**Spec reference:** [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/03-api-frame-navigation-service|03 — FrameNavigationService API contract]].

**Estimated LOC delta:**
- Create `src/components/frame/frameNavigation.svelte.ts`: 0 → ~150 LOC.
- Modify `src/components/frame/frameVaultman.svelte`: 866 → ~720 LOC (≈ -146).
- New test `test/component/frameNavigationService.test.ts`: 0 → ~280 LOC.
- New test `test/component/_helpers/bindablePoc.test.ts`: 0 → ~50 LOC (POC; deleted at end of C1 if green, kept if fallback needed).

## Files

- **Create:** `src/components/frame/frameNavigation.svelte.ts`
- **Create:** `test/component/frameNavigationService.test.ts`
- **Create:** `test/component/_helpers/bindablePoc.test.ts` (POC; transient)
- **Modify:** `src/components/frame/frameVaultman.svelte` (lines per ground-truth in index)

---

## Task 1.1: POC — Verify `bind:` to runes class getter/setter

**Why first:** R2 from the spec — Svelte 5's `bind:value={instance.field}` is expected to work for a class with `get field()/set field(v)` over a private `$state`, but the example isn't in the primary docs. If it works, T4 lands as `bind:activeTab={nav.toolsActiveTab}` (one site each in dashboard and pages-strip). If it doesn't, fallback is `activeTab={nav.toolsActiveTab} onActiveTabChange={(v) => nav.toolsActiveTab = v}` at the same call sites — zero changes to `OperationsPage`.

- [ ] **Step 1: Create `test/component/_helpers/BindablePoc.svelte`**

```svelte
<!-- test/component/_helpers/BindablePoc.svelte -->
<script lang="ts">
  let { value = $bindable() }: { value: string } = $props();
</script>

<input data-testid="poc-input" bind:value />
<span data-testid="poc-readback">{value}</span>
```

- [ ] **Step 2: Create `test/component/_helpers/bindablePoc.test.ts`**

```typescript
// test/component/_helpers/bindablePoc.test.ts
import { describe, expect, it, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BindablePoc from './BindablePoc.svelte';

class BindableHost {
  #value = $state('initial');
  get value(): string {
    return this.#value;
  }
  set value(v: string) {
    this.#value = v;
  }
}

describe('POC: bind: against runes class get/set pair', () => {
  let target: HTMLElement;
  let instance: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (instance) unmount(instance);
    instance = null;
    if (target?.parentNode) target.parentNode.removeChild(target);
  });

  it('child write propagates into class setter', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    const host = new BindableHost();

    // Mount a sibling that binds to host.value via the getter/setter pair.
    // This is the construction the frame uses for nav.toolsActiveTab.
    instance = mount(BindablePoc, {
      target,
      props: { value: host.value },
    });
    flushSync();

    // Simulate child writing back to the binding by directly setting
    // the input's value and dispatching input event. In production, Svelte
    // re-syncs via the desugared onValueChange callback that bind: emits.
    const input = target.querySelector('[data-testid="poc-input"]') as HTMLInputElement;
    input.value = 'updated';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    // If bind: works against getter/setter pairs, host.value reflects 'updated'.
    expect(host.value).toBe('updated');
  });
});
```

- [ ] **Step 3: Run the POC**

```bash
pnpm exec vitest run --project component test/component/_helpers/bindablePoc.test.ts
```

**Two possible outcomes:**

- **GREEN:** `bind:` against `get/set` over `$state` works. Proceed to Task 1.2 using `bind:activeTab={nav.toolsActiveTab}` at both call sites (frame lines ~665 dashboardExplorer + ~804 pages-strip per ground truth). Document outcome in the C1 commit message: `POC verified: bind: to nav.toolsActiveTab works (test/component/_helpers/bindablePoc.test.ts green).`
- **RED:** `bind:` desugaring does not write back through the setter. Switch to the explicit prop + callback pair in both call sites:
  ```svelte
  <OperationsPage {plugin} {icon}
    activeTab={nav.toolsActiveTab}
    onActiveTabChange={(v) => (nav.toolsActiveTab = v)} />
  ```
  No `OperationsPage` change required — Svelte 5 auto-emits `onActiveTabChange` for any `$bindable` prop. Document outcome: `POC failed: bind: does not write through class setter; using explicit activeTab + onActiveTabChange pair.`

- [ ] **Step 4: Update plan-shard POC result section below**

Edit this shard to fill in the **POC RESULT** below before opening C1's commit. This makes the POC outcome part of the canonical record.

> **POC RESULT (filled in by executor at impl time):**
> Outcome: [ ] GREEN — use `bind:`. [ ] RED — use explicit prop + callback.
> Date: <ISO>
> Sample test output (one line): _________________________________________________

- [ ] **Step 5: Decide POC retention**

- If GREEN: keep `BindablePoc.svelte` + `bindablePoc.test.ts` as a regression guard (they cost ~50 LOC and pin Svelte 5's contract). Commit them with C1.
- If RED: still keep them — they document the actual constraint and would block silent regressions if Svelte upgrades change behavior.

Either way: do **not** delete these files.

---

## Task 1.2: Write failing tests for `FrameNavigationService`

Test file lands first per TDD. All tests fail initially because the class does not exist.

- [ ] **Step 1: Create `test/component/frameNavigationService.test.ts`**

```typescript
// test/component/frameNavigationService.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
  FrameNavigationService,
  FRAME_NAVIGATION_KEY,
} from '../../src/components/frame/frameNavigation.svelte';
import { FrameViewportController } from '../../src/components/frame/frameViewport';
import { FrameNavReorderController } from '../../src/components/frame/frameNavReorder.svelte';
import { FrameOverlayController } from '../../src/components/frame/frameOverlays.svelte';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

function makeOverlaysMock() {
  return {
    activePopup: null as string | null,
    popupOpen: false,
    isIslandOpen: false,
    closePopup: vi.fn(),
    closeQueueIsland: vi.fn(),
    closeFiltersIsland: vi.fn(),
  } as unknown as FrameOverlayController & {
    closePopup: ReturnType<typeof vi.fn>;
    closeQueueIsland: ReturnType<typeof vi.fn>;
    closeFiltersIsland: ReturnType<typeof vi.fn>;
  };
}

function makeViewportMock() {
  return {
    applyPageTransform: vi.fn(),
    bindViewport: vi.fn(),
    bindContainer: vi.fn(),
    onContainerTransitionEnd: vi.fn(),
  } as unknown as FrameViewportController & {
    applyPageTransform: ReturnType<typeof vi.fn>;
  };
}

function makeNavReorderMock() {
  return {
    isReordering: false,
    reorderTargetIdx: -1,
    pillEl: null,
    navCollapsed: false,
    onNavIconPointerDown: vi.fn(),
    onPillPointerMove: vi.fn(),
    onPillPointerUp: vi.fn(),
    exitReorder: vi.fn(),
    bindNav: vi.fn(),
    bindViewRoot: vi.fn(),
    onCollapsedNavClick: vi.fn(),
  } as unknown as FrameNavReorderController;
}

function makeNav(opts: {
  plugin?: ReturnType<typeof makeMockPlugin>;
  overlays?: ReturnType<typeof makeOverlaysMock>;
  selectedCount?: number;
  fileList?: unknown;
  propExplorer?: unknown;
  tagsExplorer?: unknown;
} = {}) {
  const plugin = opts.plugin ?? makeMockPlugin();
  const overlays = opts.overlays ?? makeOverlaysMock();
  const nav = new FrameNavigationService(
    plugin,
    overlays as unknown as FrameOverlayController,
    () => opts.selectedCount ?? 0,
    () => opts.fileList,
    () => opts.propExplorer,
    () => opts.tagsExplorer,
  );
  return { nav, plugin, overlays };
}

describe('FrameNavigationService — context key', () => {
  it('exports FRAME_NAVIGATION_KEY as a Symbol', () => {
    expect(typeof FRAME_NAVIGATION_KEY).toBe('symbol');
    expect(String(FRAME_NAVIGATION_KEY)).toContain('frame.navigation');
  });
});

describe('FrameNavigationService — construction + late binding', () => {
  it('constructs with plugin + overlays + accessor getters', () => {
    const { nav } = makeNav();
    expect(nav).toBeInstanceOf(FrameNavigationService);
  });

  it('nav.viewport throws before attachViewport()', () => {
    const { nav } = makeNav();
    expect(() => nav.viewport).toThrow(/viewport/i);
  });

  it('nav.navReorder throws before attachNavReorder()', () => {
    const { nav } = makeNav();
    expect(() => nav.navReorder).toThrow(/navReorder/i);
  });

  it('nav.viewport returns the attached instance', () => {
    const { nav } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    expect(nav.viewport).toBe(viewport);
  });

  it('nav.navReorder returns the attached instance', () => {
    const { nav } = makeNav();
    const navReorder = makeNavReorderMock();
    nav.attachNavReorder(navReorder);
    expect(nav.navReorder).toBe(navReorder);
  });
});

describe('FrameNavigationService — initial state', () => {
  it('activePage defaults to pageOrder[0] from settings', () => {
    const plugin = makeMockPlugin({ pageOrder: ['filters', 'ops', 'statistics'] });
    const { nav } = makeNav({ plugin });
    expect(nav.activePage).toBe('filters');
  });

  it('pageOrder is read from plugin.settings.pageOrder', () => {
    const plugin = makeMockPlugin({ pageOrder: ['statistics', 'filters', 'ops'] });
    const { nav } = makeNav({ plugin });
    expect([...nav.pageOrder]).toEqual(['statistics', 'filters', 'ops']);
  });

  it('toolsActiveTab defaults to "layout"', () => {
    const { nav } = makeNav();
    expect(nav.toolsActiveTab).toBe('layout');
  });

  it('filtersActiveTab defaults to "props"', () => {
    const { nav } = makeNav();
    expect(nav.filtersActiveTab).toBe('props');
  });

  it('statsPreviewFile defaults to null', () => {
    const { nav } = makeNav();
    expect(nav.statsPreviewFile).toBeNull();
  });

  it('filtersBaseChooseMode defaults to false', () => {
    const { nav } = makeNav();
    expect(nav.filtersBaseChooseMode).toBe(false);
  });
});

describe('FrameNavigationService — T4 bindable toolsActiveTab', () => {
  it('toolsActiveTab is writable via setter', () => {
    const { nav } = makeNav();
    nav.toolsActiveTab = 'file_diff';
    expect(nav.toolsActiveTab).toBe('file_diff');
  });

  it('filtersActiveTab is writable via setter', () => {
    const { nav } = makeNav();
    nav.filtersActiveTab = 'files';
    expect(nav.filtersActiveTab).toBe('files');
  });
});

describe('FrameNavigationService — navigateTo', () => {
  it('same page → no-op (no overlay/popup/viewport calls)', () => {
    const { nav, overlays } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    const initial = nav.activePage;
    nav.navigateTo(initial);
    expect(overlays.closeQueueIsland).not.toHaveBeenCalled();
    expect(overlays.closeFiltersIsland).not.toHaveBeenCalled();
  });

  it('different page → closes islands + sets activePage + calls applyPageTransform(true)', () => {
    const { nav, overlays } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.navigateTo('filters');
    expect(overlays.closeQueueIsland).toHaveBeenCalledTimes(1);
    expect(overlays.closeFiltersIsland).toHaveBeenCalledTimes(1);
    expect(nav.activePage).toBe('filters');
    expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
  });

  it('different page + active-filters popup open → also closes popup', () => {
    const overlays = makeOverlaysMock();
    overlays.activePopup = 'active-filters';
    overlays.popupOpen = true;
    const { nav } = makeNav({ overlays });
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.navigateTo('filters');
    expect(overlays.closePopup).toHaveBeenCalledTimes(1);
  });

  it('leaving filters clears filtersBaseChooseMode', () => {
    const { nav } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.navigateTo('filters');
    nav.enterBasesImport();
    expect(nav.filtersBaseChooseMode).toBe(true);
    nav.navigateTo('ops');
    expect(nav.filtersBaseChooseMode).toBe(false);
  });
});

describe('FrameNavigationService — openDiffIntent (T3 strict side-effect order)', () => {
  it('records the canonical 6-step sequence', () => {
    const overlays = makeOverlaysMock();
    overlays.popupOpen = true;
    const { nav } = makeNav({ overlays });
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);

    const order: string[] = [];
    overlays.closeQueueIsland.mockImplementation(() => order.push('closeQueueIsland'));
    overlays.closeFiltersIsland.mockImplementation(() => order.push('closeFiltersIsland'));
    overlays.closePopup.mockImplementation(() => order.push('closePopup'));
    viewport.applyPageTransform.mockImplementation(() => order.push('applyPageTransform'));

    nav.openDiffIntent();

    // Spec shard 03 + spec shard 02 lock this order:
    // 1. overlays.closeQueueIsland()
    // 2. overlays.closeFiltersIsland()
    // 3. if (overlays.popupOpen) overlays.closePopup()
    // 4. this.#activePage = 'ops'
    // 5. this.#toolsActiveTab = 'file_diff'
    // 6. viewport.applyPageTransform(true)
    expect(order).toEqual([
      'closeQueueIsland',
      'closeFiltersIsland',
      'closePopup',
      'applyPageTransform',
    ]);
    expect(nav.activePage).toBe('ops');
    expect(nav.toolsActiveTab).toBe('file_diff');
    expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
  });

  it('skips closePopup when no popup is open', () => {
    const overlays = makeOverlaysMock();
    overlays.popupOpen = false;
    const { nav } = makeNav({ overlays });
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.openDiffIntent();
    expect(overlays.closePopup).not.toHaveBeenCalled();
  });
});

describe('FrameNavigationService — enterBasesImport / exitBasesImport', () => {
  it('enterBasesImport sets flag + tab + activePage', () => {
    const { nav } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.enterBasesImport();
    expect(nav.filtersBaseChooseMode).toBe(true);
    expect(nav.filtersActiveTab).toBe('files');
    expect(nav.activePage).toBe('filters');
    expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
  });

  it('enterBasesImport from filters does not re-trigger activePage assignment', () => {
    const { nav } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.navigateTo('filters');
    viewport.applyPageTransform.mockClear();
    nav.enterBasesImport();
    // applyPageTransform still called (for the bases-import branch itself)
    expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
  });

  it('exitBasesImport clears the flag', () => {
    const { nav } = makeNav();
    nav.enterBasesImport();
    nav.exitBasesImport();
    expect(nav.filtersBaseChooseMode).toBe(false);
  });
});

describe('FrameNavigationService — stats intents', () => {
  it('showStatsPage clears statsPreviewFile', () => {
    const { nav } = makeNav();
    // Pre-populate via openStatsNote's callback (covered separately).
    // Here we test the bare setter behavior.
    nav.showStatsPage();
    expect(nav.statsPreviewFile).toBeNull();
  });

  // openStatsNote requires openVaultmanFileSuggestModal which opens an
  // Obsidian modal; mock it via vi.mock if the test environment cannot
  // open one. The internal helper is `openVaultmanFileSuggestModal` from
  // src/utils/fileSuggestModal.ts. Add at the top of the test file:
  //
  //   vi.mock('../../src/utils/fileSuggestModal', () => ({
  //     openVaultmanFileSuggestModal: vi.fn((_app, callback) => {
  //       callback({ path: 'mock-stats.md' } as TFile);
  //     }),
  //   }));
});

describe('FrameNavigationService — surface derivations', () => {
  it('dockItems returns frame pages when layout content is frame-pages', () => {
    const plugin = makeMockPlugin({
      pageOrder: ['ops', 'statistics', 'filters'],
      layout: { dock: { content: 'frame-pages', labels: { visible: true, position: 'bottom' }, presentation: { mode: 'bar' } }, tabs: { content: 'none', labels: { visible: false } } },
    });
    const { nav } = makeNav({ plugin, selectedCount: 0 });
    const ids = nav.dockItems.map((i) => i.id);
    expect(ids).toEqual(['ops', 'statistics', 'filters']);
  });

  it('dockUsesFramePages is true when layout.dock.content === "frame-pages"', () => {
    const plugin = makeMockPlugin({
      layout: { dock: { content: 'frame-pages' }, tabs: { content: 'none' } },
    });
    const { nav } = makeNav({ plugin });
    expect(nav.dockUsesFramePages).toBe(true);
  });

  it('statistics item has dot=true when selectedCount > 0', () => {
    const plugin = makeMockPlugin({
      layout: { dock: { content: 'frame-pages' }, tabs: { content: 'none' } },
    });
    const { nav } = makeNav({ plugin, selectedCount: 5 });
    const stats = nav.dockItems.find((i) => i.id === 'statistics');
    expect(stats?.dot).toBe(true);
  });
});

describe('FrameNavigationService — selectSurfaceItem', () => {
  it('frame-pages branch calls navigateTo', () => {
    const { nav } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.selectSurfaceItem('frame-pages', 'filters');
    expect(nav.activePage).toBe('filters');
  });

  it('filter-tabs branch sets filtersActiveTab and navigates to filters if needed', () => {
    const { nav } = makeNav();
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.selectSurfaceItem('filter-tabs', 'files');
    expect(nav.filtersActiveTab).toBe('files');
    expect(nav.activePage).toBe('filters');
  });

  it('detached item dispatches plugin.spawnTabLeaf and returns', () => {
    const plugin = makeMockPlugin({
      layout: { dock: { content: 'frame-pages' }, tabs: { content: 'none' } },
    });
    plugin.leafDetachService = {
      ...plugin.leafDetachService,
      getState: vi.fn().mockReturnValue({ 'page-tools': true }),
    } as never;
    const { nav } = makeNav({ plugin });
    const viewport = makeViewportMock();
    nav.attachViewport(viewport);
    nav.selectSurfaceItem('frame-pages', 'ops');
    expect(plugin.spawnTabLeaf).toHaveBeenCalledWith('page-tools');
    expect(nav.activePage).not.toBe('ops'); // returned before nav
  });
});

describe('FrameNavigationService — page-order validity effect', () => {
  it('setPageOrder to a list that excludes activePage resets activePage to first', () => {
    const { nav } = makeNav();
    nav.setPageOrder(['filters', 'statistics']); // excludes 'ops' (default activePage)
    // Reactivity must propagate; flushSync to be safe.
    flushSync();
    expect(nav.activePage).toBe('filters');
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
pnpm exec vitest run --project component test/component/frameNavigationService.test.ts
```

Expected: FAIL — `FrameNavigationService`, `FRAME_NAVIGATION_KEY` not defined (module does not exist).

## Task 1.3: Create `frameNavigation.svelte.ts`

- [ ] **Step 1: Create the module**

```typescript
// src/components/frame/frameNavigation.svelte.ts
import type { TFile } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import type { FabDef } from '../../types/typePrimitives';
import { translate } from '../../index/i18n/lang';
import { openVaultmanFileSuggestModal } from '../../utils/fileSuggestModal';
import { tabIdFromInner, type TabId } from '../../registry/tabRegistry';
import { FTabs, type TabConfig } from '../../types/typeTab';
import {
  resolveLayoutSettings,
  type LayoutSettings,
  type LayoutSurfaceContent,
} from '../../services/serviceLayout';
import type { LeafDetachState } from '../../services/serviceLeafDetach';
import type { explorerFiles } from '../../providers/explorerFiles';
import type { explorerProps } from '../../providers/explorerProps';
import type { explorerTags } from '../../providers/explorerTags';
import type { FrameOverlayController } from './frameOverlays.svelte';
import type { FrameViewportController } from './frameViewport';
import type { FrameNavReorderController } from './frameNavReorder.svelte';
import {
  createFramePageFabs,
  createFramePageIcons,
  createFramePageLabels,
  resolveFramePageOrder,
} from './framePages';
import type { FiltersSearchTab } from './frameFiltersSearch';

export const FRAME_NAVIGATION_KEY: unique symbol = Symbol('frame.navigation');

export type SurfaceNavItem = TabConfig & {
  label: string;
  disabled?: boolean;
  faint?: boolean;
  dot?: boolean;
};

export type FiltersTab = FiltersSearchTab;

export class FrameNavigationService {
  readonly #plugin: VaultmanPlugin;
  readonly #overlays: FrameOverlayController;
  readonly #getSelectedCount: () => number;
  readonly #getFileList: () => explorerFiles | undefined;
  readonly #getPropExplorer: () => explorerProps | undefined;
  readonly #getTagsExplorer: () => explorerTags | undefined;

  #viewport: FrameViewportController | null = null;
  #navReorder: FrameNavReorderController | null = null;

  #pageOrder = $state<string[]>([]);
  #pageRenderKey = $state(0);
  #activePage = $state<string>('ops');
  #toolsActiveTab = $state('layout');
  #filtersActiveTab = $state<FiltersTab>('props');
  #statsPreviewFile = $state<TFile | null>(null);
  #filtersBaseChooseMode = $state(false);

  readonly #pageLabels: Record<string, string>;
  readonly #pageIcons: Record<string, string>;

  constructor(
    plugin: VaultmanPlugin,
    overlays: FrameOverlayController,
    getSelectedCount: () => number,
    getFileList: () => explorerFiles | undefined,
    getPropExplorer: () => explorerProps | undefined,
    getTagsExplorer: () => explorerTags | undefined,
  ) {
    this.#plugin = plugin;
    this.#overlays = overlays;
    this.#getSelectedCount = getSelectedCount;
    this.#getFileList = getFileList;
    this.#getPropExplorer = getPropExplorer;
    this.#getTagsExplorer = getTagsExplorer;

    this.#pageOrder = resolveFramePageOrder(plugin.settings.pageOrder);
    this.#activePage = this.#pageOrder[0] ?? 'ops';
    this.#pageLabels = createFramePageLabels();
    this.#pageIcons = createFramePageIcons();

    // Reactive: if pageOrder mutates to exclude activePage, reset.
    $effect.root(() => {
      $effect(() => {
        if (!this.#pageOrder.includes(this.#activePage)) {
          this.#activePage = this.#pageOrder[0] ?? 'ops';
        }
      });
      $effect(() => {
        void this.pageIndex; // declare dep
        this.#viewport?.applyPageTransform(true);
      });
    });
  }

  attachViewport(viewport: FrameViewportController): void {
    this.#viewport = viewport;
  }

  attachNavReorder(navReorder: FrameNavReorderController): void {
    this.#navReorder = navReorder;
  }

  get viewport(): FrameViewportController {
    if (!this.#viewport) {
      throw new Error('FrameNavigationService.viewport accessed before attachViewport()');
    }
    return this.#viewport;
  }

  get navReorder(): FrameNavReorderController {
    if (!this.#navReorder) {
      throw new Error('FrameNavigationService.navReorder accessed before attachNavReorder()');
    }
    return this.#navReorder;
  }

  get activePage(): string {
    return this.#activePage;
  }

  get pageOrder(): readonly string[] {
    return this.#pageOrder;
  }

  setPageOrder(order: readonly string[]): void {
    this.#pageOrder = [...order];
  }

  get pageIndex(): number {
    return this.#pageOrder.indexOf(this.#activePage);
  }

  get pageRenderKey(): number {
    return this.#pageRenderKey;
  }

  bumpRenderKey(): void {
    this.#pageRenderKey += 1;
  }

  get toolsActiveTab(): string {
    return this.#toolsActiveTab;
  }

  set toolsActiveTab(v: string) {
    this.#toolsActiveTab = v;
  }

  get filtersActiveTab(): FiltersTab {
    return this.#filtersActiveTab;
  }

  set filtersActiveTab(v: FiltersTab) {
    this.#filtersActiveTab = v;
  }

  get statsPreviewFile(): TFile | null {
    return this.#statsPreviewFile;
  }

  get filtersBaseChooseMode(): boolean {
    return this.#filtersBaseChooseMode;
  }

  set filtersBaseChooseMode(v: boolean) {
    this.#filtersBaseChooseMode = v;
  }

  get layoutSettings(): LayoutSettings {
    return resolveLayoutSettings(this.#plugin.settings.layout);
  }

  get detachedTabs(): LeafDetachState {
    return this.#plugin.leafDetachService?.getState() ?? {};
  }

  get filterTabsExternallyMounted(): boolean {
    const layout = this.layoutSettings;
    return layout.dock.content === 'filter-tabs' || layout.tabs.content === 'filter-tabs';
  }

  get framePageTabs(): readonly SurfaceNavItem[] {
    return this.#pageOrder.map((pageId) => ({
      id: pageId,
      icon: this.#pageIcons[pageId] ?? 'lucide-circle',
      label: this.#pageLabels[pageId] ?? pageId,
    }));
  }

  get filterTabItems(): readonly SurfaceNavItem[] {
    return FTabs.map((tab) => ({
      ...tab,
      label: tab.label ?? (tab.labelKey ? translate(tab.labelKey) : tab.id),
    }));
  }

  get topTabItems(): SurfaceNavItem[] {
    return this.#itemsForSurface(this.layoutSettings.tabs.content);
  }

  get topTabActive(): string {
    return this.#activeForSurface(this.layoutSettings.tabs.content);
  }

  get topExternalTabIds(): string[] {
    return this.#externalIdsForSurface(this.layoutSettings.tabs.content);
  }

  get dockItems(): SurfaceNavItem[] {
    return this.#itemsForSurface(this.layoutSettings.dock.content);
  }

  get dockActive(): string {
    return this.#activeForSurface(this.layoutSettings.dock.content);
  }

  get dockExternalTabIds(): string[] {
    return this.#externalIdsForSurface(this.layoutSettings.dock.content);
  }

  get dockUsesFramePages(): boolean {
    return this.layoutSettings.dock.content === 'frame-pages';
  }

  get pageFabs(): Record<string, { left: FabDef | null; right: FabDef | null }> {
    return createFramePageFabs(
      this.#plugin,
      () => this.#overlays.toggleQueueIsland(),
      () => this.#overlays.toggleFiltersIsland(),
      {
        filtersBaseChooseMode: this.#filtersBaseChooseMode,
        enterBasesImportMode: () => this.enterBasesImport(),
        exitBasesImportMode: () => this.exitBasesImport(),
        statsPreviewActive: this.#statsPreviewFile !== null,
        openStatsNote: () => this.openStatsNote(),
        showStatsPage: () => this.showStatsPage(),
      },
    );
  }

  get leftFab(): FabDef | null {
    return this.pageFabs[this.#activePage]?.left ?? null;
  }

  get rightFab(): FabDef | null {
    return this.pageFabs[this.#activePage]?.right ?? null;
  }

  navigateTo(page: string): void {
    if (this.#activePage !== page) {
      this.#overlays.closeQueueIsland();
      this.#overlays.closeFiltersIsland();
      if (this.#overlays.activePopup === 'active-filters') this.#overlays.closePopup();
    }
    if (page !== 'filters') this.#filtersBaseChooseMode = false;
    this.#activePage = page;
    this.#viewport?.applyPageTransform(true);
  }

  openDiffIntent(): void {
    this.#overlays.closeQueueIsland();
    this.#overlays.closeFiltersIsland();
    if (this.#overlays.popupOpen) this.#overlays.closePopup();
    this.#activePage = 'ops';
    this.#toolsActiveTab = 'file_diff';
    this.#viewport?.applyPageTransform(true);
  }

  enterBasesImport(): void {
    this.#filtersBaseChooseMode = true;
    this.#filtersActiveTab = 'files';
    if (this.#activePage !== 'filters') this.#activePage = 'filters';
    this.#viewport?.applyPageTransform(true);
  }

  exitBasesImport(): void {
    this.#filtersBaseChooseMode = false;
  }

  openStatsNote(): void {
    openVaultmanFileSuggestModal(this.#plugin.app, (file) => {
      this.#statsPreviewFile = file;
      this.#activePage = 'statistics';
      this.#viewport?.applyPageTransform(true);
    });
  }

  showStatsPage(): void {
    this.#statsPreviewFile = null;
  }

  selectSurfaceItem(content: LayoutSurfaceContent, id: string): void {
    const detachedTabId = this.#detachedTabIdForSurfaceItem(content, id);
    if (detachedTabId) {
      void this.#plugin.spawnTabLeaf(detachedTabId);
      return;
    }
    if (content === 'filter-tabs') {
      this.#filtersActiveTab = id as FiltersTab;
      if (this.#activePage !== 'filters') this.navigateTo('filters');
      return;
    }
    if (content === 'frame-pages') {
      this.navigateTo(id);
    }
  }

  #itemsForSurface(content: LayoutSurfaceContent): SurfaceNavItem[] {
    if (content === 'frame-pages') {
      const selected = this.#getSelectedCount();
      return this.framePageTabs.map((tab) => ({
        ...tab,
        dot: tab.id === 'statistics' && selected > 0,
      }));
    }
    if (content === 'filter-tabs') {
      return this.filterTabItems.map((tab) => {
        const disabled = this.#filtersBaseChooseMode && tab.id !== 'files';
        return { ...tab, disabled, faint: disabled };
      });
    }
    return [];
  }

  #activeForSurface(content: LayoutSurfaceContent): string {
    if (content === 'filter-tabs') {
      return this.#activePage === 'filters' ? this.#filtersActiveTab : '';
    }
    if (content === 'frame-pages') return this.#activePage;
    return '';
  }

  #externalIdsForSurface(content: LayoutSurfaceContent): string[] {
    return this.#itemsForSurface(content)
      .map((item) => (this.#detachedTabIdForSurfaceItem(content, item.id) ? item.id : null))
      .filter((id): id is string => Boolean(id));
  }

  #detachedTabIdForSurfaceItem(content: LayoutSurfaceContent, id: string): TabId | null {
    const tabId = this.#tabIdForSurfaceItem(content, id);
    return tabId && this.detachedTabs[tabId] === true ? tabId : null;
  }

  #tabIdForSurfaceItem(content: LayoutSurfaceContent, id: string): TabId | null {
    if (content === 'filter-tabs') return tabIdFromInner(id);
    if (content === 'frame-pages' && id === 'ops') return 'page-tools';
    return null;
  }
}
```

**Implementation note on `$effect.root`:** Reactive effects inside a class constructor need a root scope. `$effect.root(() => { $effect(() => { ... }); })` creates one that lasts for the lifetime of the instance. The root teardown is not exposed here because frame's lifetime owns the service; if a future test needs to dispose, expose `dispose()` then. For C1, fire-and-forget is fine — the frame mounts once and lives for the view's lifetime.

- [ ] **Step 2: Run the test — expect PASS for all blocks except surface derivations**

```bash
pnpm exec vitest run --project component test/component/frameNavigationService.test.ts
```

Expected: most PASS. The surface-derivation tests may need real `resolveLayoutSettings` returning the expected shape — fix `makeMockPlugin` defaults if needed (the `layout` override needs `dock.labels.visible`, `dock.presentation.mode`, etc., per `LayoutSettings`).

If `makeMockPlugin`'s default `layout: null` fails the surface tests, audit `resolveLayoutSettings` — it likely returns a sensible default when given null. Check `src/services/serviceLayout.ts` and adjust the test override to match the default shape.

- [ ] **Step 3: Iterate until all tests pass**

Run tests, fix mock or implementation. Both should converge to green. Do NOT relax assertions — the T3 order test is the load-bearing contract and must remain strict.

- [ ] **Step 4: `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors. Any error here likely means a missing import or type mismatch in `frameNavigation.svelte.ts`.

## Task 1.4: Refactor `frameVaultman.svelte` to use the service

- [ ] **Step 1: Update imports**

In `src/components/frame/frameVaultman.svelte` add after the existing `frameNavReorder` import:

```svelte
import { FrameNavigationService, FRAME_NAVIGATION_KEY } from './frameNavigation.svelte';
import { setContext } from 'svelte';
```

- [ ] **Step 2: Replace `initFrameState` + page state declarations with service instantiation**

Replace lines 96-186 (the entire page-navigation cluster including overlays, page-state declarations, `viewport`/`navReorder` constructors, `pageFabs`/`leftFab`/`rightFab`, `pageIndex`) with:

```svelte
// ─── Frame state setup ───
const overlays = new FrameOverlayController(
  plugin,
  ExplorerQueueComp,
  ExplorerActiveFiltersComp,
  { onImportBases: () => nav.enterBasesImport() },
);

const nav = new FrameNavigationService(
  plugin,
  overlays,
  () => selectedCount,
  () => fileList,
  () => propExplorer,
  () => tagsExplorer,
);

const viewport = new FrameViewportController(() => nav.pageIndex);
nav.attachViewport(viewport);

const navReorder = new FrameNavReorderController({
  getPageOrder: () => [...nav.pageOrder],
  setPageOrder: (order) => nav.setPageOrder(order),
  incrementRenderKey: () => nav.bumpRenderKey(),
  saveOrder: (order) => {
    plugin.settings.pageOrder = order;
    void plugin.saveSettings();
  },
});
nav.attachNavReorder(navReorder);

setContext(FRAME_NAVIGATION_KEY, nav);

$effect(() => installFrameOverlayCommandHooks(plugin, overlays));

// T3 — register openDiffViewHook with identity-check cleanup
$effect(() => {
  const hook = () => nav.openDiffIntent();
  plugin.openDiffViewHook = hook;
  return () => {
    if (plugin.openDiffViewHook === hook) plugin.openDiffViewHook = null;
  };
});
```

**The forward reference** `() => nav.enterBasesImport()` in `overlays` constructor is safe — the closure is invoked only after `nav` is constructed (lazy access through the closure body).

- [ ] **Step 3: Delete moved functions/declarations**

Delete from `frameVaultman.svelte`:

- `function initFrameState()` and `const initialFrameState` declarations.
- `let pageOrder = $state<string[]>(...)`.
- `let pageRenderKey = $state(0)`.
- `let filtersBaseChooseMode = $state(false)`.
- `let statsPreviewFile = $state<TFile | null>(null)`.
- `const pageLabels` / `const pageIcons` (they live inside the service now).
- `const layoutSettings = $derived(...)` (now `nav.layoutSettings`).
- `const framePageTabs = $derived.by(...)` (now `nav.framePageTabs`).
- `const filterTabItems = $derived.by(...)` (now `nav.filterTabItems`).
- `const pageFabs = $derived.by(...)`, `const leftFab = $derived.by(...)`, `const rightFab = $derived.by(...)` (now `nav.pageFabs` / `nav.leftFab` / `nav.rightFab`).
- `let activePage = $state(...)`.
- `let toolsActiveTab = $state('layout')`.
- `let pageIndex = $derived(...)`.
- `function navigateTo(page)`.
- `function enterBasesImportMode()`.
- `function exitBasesImportMode()`.
- `function openStatsNote()`.
- `function showStatsPage()`.
- `function openDiffView()`.
- The `$effect(() => { plugin.openDiffViewHook = openDiffView; ... })` block (now declared inline above).
- The `$effect(() => { void pageIndex; viewport.applyPageTransform(true); })` block (moved into service `$effect.root`).
- The `$effect(() => { if (!pageOrder.includes(activePage)) ... })` block (moved into service `$effect.root`).
- `let filtersActiveTab = $state<FiltersTab>('props')`.
- `const filterTabsExternallyMounted = $derived(...)` (now `nav.filterTabsExternallyMounted`).
- `const topTabItems`/`topTabActive`/`topExternalTabIds`/`dockItems`/`dockActive`/`dockExternalTabIds`/`dockUsesFramePages` derivations.
- `function itemsForSurface`, `activeForSurface`, `selectSurfaceItem`, `externalIdsForSurface`, `detachedTabIdForSurfaceItem`, `tabIdForSurfaceItem`.
- `let detachedTabs = $state<LeafDetachState>({})` (per O4 resolution; nav proxies `leafDetachService`).

**Keep in frame:**
- Stats counters (`selectedCount`/`queuedCount`/`filterRuleCount`/`addOpCount`/`updateStats`/`renderAddonsStats`).
- Explorer instances (`fileList`/`propExplorer`/`tagsExplorer`/`selectedFilePaths`).
- All `filtersX` state declarations except `filtersBaseChooseMode` and `filtersActiveTab` (moved).
- `dockDrawerOpen` (moves in C3).
- The filters-search routing `$effect` (lines 368-396; stays per O2 resolution).
- The active-filters popup refresh `$effect` (lines 572-576; gets popups proxy in C2).
- `bindDashboardMeasurement` + viewport-measure state (per O6 resolution).
- Window focus binding + `onWindowFocus`/`onWindowBlur` + `elasticRootClasses`.
- `onMount` #1 (subscriptions) — but **remove** the `detachedTabs = state` line (per O4); keep the subscription for its `updateStats` side-effect.
- `onMount` #2 (window focus).
- The three dashboard snippets (move in C4).
- The `frameIslandAndDock` snippet (moves in C3).
- `PopupOverlay` mount and all popup state (popups state moves in C2; mount stays).
- The `icon` action.

- [ ] **Step 4: Update onMount #1 to drop the parallel `detachedTabs` state**

In `onMount` callback (originally lines 580-615), delete:

```ts
const unsubLeafDetach = plugin.leafDetachService?.subscribe((state) => {
  detachedTabs = state;
});
detachedTabs = plugin.leafDetachService?.getState() ?? {};
```

Replace with:

```ts
// Subscription kept for side-effect (queue/filter refresh tied to detach
// events that bubble through plugin.leafDetachService → updateStats). The
// actual state is read via nav.detachedTabs on each render.
const unsubLeafDetach = plugin.leafDetachService?.subscribe(() => {
  updateStats();
});
```

And in the teardown:

```ts
return () => {
  unsubFilter();
  unsubLeafDetach?.();
  plugin.queueService.off('changed', onQueueChanged);
  plugin.app.metadataCache.off('resolved', onVaultResolved);
};
```

- [ ] **Step 5: Replace template-side reads with `nav.X`**

In the dashboard snippets (lines 640-695) and the main template (lines 762-844), substitute:

| Inline today | Replacement |
|---|---|
| `filterTabItems` | `nav.filterTabItems` |
| `filtersActiveTab` (in `dashboardFilters` snippet only — read site) | `nav.filtersActiveTab` |
| `selectSurfaceItem('filter-tabs', tab.id)` | `nav.selectSurfaceItem('filter-tabs', tab.id)` |
| `activePage` | `nav.activePage` |
| `pageRenderKey` | `nav.pageRenderKey` |
| `detachedTabs['page-tools']` | `nav.detachedTabs['page-tools']` |
| `toolsActiveTab` in `bind:activeTab={toolsActiveTab}` | per POC outcome (1.1): either `bind:activeTab={nav.toolsActiveTab}` or `activeTab={nav.toolsActiveTab} onActiveTabChange={(v) => nav.toolsActiveTab = v}` |
| `statsPreviewFile` | `nav.statsPreviewFile` |
| `showStatsPage` (the callback ref) | `() => nav.showStatsPage()` |
| `setFiltersOperationScope` | (stays — moves in C2) |
| `filtersBaseChooseMode` in `bind:` | `bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}` (per POC outcome — same constraint as T4) |
| `pageOrder` (in `{#each pageOrder ...}`) | `nav.pageOrder` |
| `pageId` references when rendering page strip per pageOrder | unchanged (block-local local) |
| `topTabItems`, `topTabActive`, `topExternalTabIds`, `dockItems`, `dockActive`, `dockExternalTabIds`, `dockUsesFramePages`, `layoutSettings`, `leftFab`, `rightFab` (in `frameIslandAndDock` snippet + dashboard `Dashboard3Column` mount) | `nav.X` for each |
| `selectSurfaceItem(layoutSettings.X.content, id)` (in `NavbarTabs`/`NavbarDock` `onSelect`) | `nav.selectSurfaceItem(nav.layoutSettings.X.content, id)` |

The `<NavbarTabs>` and `<NavbarDock>` mounts (in `frameIslandAndDock` and at the top of the template) keep all their other props identical — only the variable sources change.

- [ ] **Step 6: `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors. Most likely failure modes:

- Type mismatch on `nav.dockItems` consumer: ensure the shell still types compatibly with `SurfaceNavItem[]`. If `SurfaceNavItem` was inline-typed in frame, re-import it from `./frameNavigation.svelte`.
- Missing import of `LayoutSurfaceContent` in frame: if frame no longer references it directly (since selectSurfaceItem moved to nav), the import becomes orphaned. Remove the import line.

- [ ] **Step 7: Run baseline snapshot test — expect PASS**

```bash
pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts
```

Expected: PASS — DOM unchanged. The frame's render output is byte-identical because:
- Same component tree.
- Same prop values (now sourced from `nav.X` instead of inline locals; semantically identical).
- Same effect ordering (the moved `$effect`s fire from the service's `$effect.root`, which initializes at construction time — before any render).

If a snapshot fails: investigate immediately. The most likely cause is an effect-ordering subtlety (e.g., `viewport.applyPageTransform(true)` firing at construction vs after mount). The fix is usually to adjust the service's `$effect.root` body or move the offending `$effect` back into frame.

- [ ] **Step 8: Run full unit + component suite**

```bash
pnpm exec vitest run --project component test/component/frameNavigationService.test.ts
pnpm exec vitest run --project component test/component/frameVaultmanRootClasses.test.ts
pnpm exec vitest run --project component test/component/frameDashboardAddons.test.ts
pnpm exec vitest run --project component test/component/frameFaintMultiWindow.test.ts
```

Expected: all PASS. The latter three are pre-existing frame tests that must not regress.

- [ ] **Step 9: `pnpm verify`**

```bash
pnpm verify
```

Expected: PASS — full unit + component suite + lint.

## Task 1.5: Live `plugin-dev` smoke

- [ ] **Step 1: Reload + open**

```bash
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian command id=vaultman:open-view-menu vault=plugin-dev
```

Expected: plugin reloads without console error; view menu opens.

- [ ] **Step 2: Exercise T3 + page navigation**

```bash
obsidian command id=vaultman:open-diff vault=plugin-dev
```

Expected: lands on `ops` page with `file_diff` sub-tab. Click dock items to navigate `ops → filters → statistics → ops`; verify each transition has the same animation as pre-C1.

- [ ] **Step 3: Bases import smoke**

Trigger the bases-import flow (per existing UX). Confirm `filtersBaseChooseMode` toggles, sees the X exit button, exits cleanly.

- [ ] **Step 4: `dev:errors`**

```bash
obsidian dev:errors vault=plugin-dev
```

Expected: `No errors captured.`

If anything red here: revert C1 (`git revert <C1 sha>`), investigate, re-land.

## Task 1.6: Commit

- [ ] **Step 1: Stage**

```bash
git add src/components/frame/frameNavigation.svelte.ts \
        src/components/frame/frameVaultman.svelte \
        test/component/frameNavigationService.test.ts \
        test/component/_helpers/BindablePoc.svelte \
        test/component/_helpers/bindablePoc.test.ts
```

- [ ] **Step 2: Commit (HEREDOC body)**

```bash
git commit -m "$(cat <<'EOF'
feat(O): extract FrameNavigationService

Move activePage / pageOrder / toolsActiveTab / statsPreviewFile /
filtersBaseChooseMode / filtersActiveTab + navigation methods
(navigateTo, enterBasesImport, exitBasesImport, openStatsNote,
showStatsPage) + T3 openDiffIntent + surface derivations
(itemsForSurface / activeForSurface / dockItems / topTabItems
etc.) + selectSurfaceItem into
src/components/frame/frameNavigation.svelte.ts.

Frame now sets FRAME_NAVIGATION_KEY context. Future shells (C3 +
C4) consume via getContext. T4 toolsActiveTab is bindable via the
nav.toolsActiveTab getter/setter pair. T3 plugin.openDiffViewHook
registration is now a 3-line \$effect registering
() => nav.openDiffIntent() with identity-check cleanup.

detachedTabs frame \$state dropped (per spec O4); nav proxies
plugin.leafDetachService.getState(). The subscription remains in
onMount for its updateStats() side-effect.

POC verified: <fill in from Task 1.1 result>.

frameVaultman.svelte: 866 → ~720 LOC.

Tests: test/component/frameNavigationService.test.ts (constructor,
late-binding, all methods, **strict T3 side-effect order**,
surface derivations, page-order validity effect).
Smoke: pages navigation, vaultman:open-diff command, bases-import
toggle, dev:errors clean.

Refs: .agents/docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/03-api-frame-navigation-service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git status
git log -1 --stat
wc -l src/components/frame/frameVaultman.svelte
```

Expected: clean tree; commit visible with the 5 staged files; frame LOC ~720.

---

## Rollback

C1 is independently revertible. If a downstream issue surfaces after C1 lands:

1. `git revert <C1 sha>` restores frame + drops the new files.
2. `test/component/frameVaultmanBaseline.test.ts` remains (pre-step 0); validates the restored state.
3. Investigate, fix, re-land.

C2 / C3 / C4 / C5 all build on C1's API surface. If C1 is reverted, all later commits become invalid and must be re-derived from the new C1.

## Verification gate

- `pnpm exec vitest run --project component test/component/frameNavigationService.test.ts` → PASS.
- `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` → PASS (snapshots unchanged).
- `pnpm verify` → PASS.
- `obsidian dev:errors vault=plugin-dev` → `No errors captured.`
- `frameVaultman.svelte` LOC ≈ 720 (-146 from 866).
