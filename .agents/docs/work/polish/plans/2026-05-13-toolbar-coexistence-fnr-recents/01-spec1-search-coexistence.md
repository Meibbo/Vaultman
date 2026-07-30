---
title: Spec 1 plan — search overlay coexistence + inline toolbar variant
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-13-toolbar-coexistence-fnr-recents/index|toolbar-coexistence-fnr-recents plan]]"
created: 2026-05-13T19:00:00
updated: 2026-05-13T19:00:00
tags:
  - agent/plan
  - search-island
  - overlay-state
  - toolbar
created_by: opus
updated_by: opus
---

# Spec 1 Plan — Search Overlay Coexistence + Inline Toolbar Variant

> Source spec: [[docs/work/polish/specs/2026-05-13-toolbar-coexistence-fnr-recents/01-search-coexistence|01-search-coexistence]]

## File Map

| File                                                  | Role                       |
| ----------------------------------------------------- | -------------------------- |
| `src/types/typeSettings.ts`                           | Add `toolbarSearchMode`.   |
| `src/main.ts`                                         | Seed default in `DEFAULT_SETTINGS`. |
| `src/components/frame/frameOverlays.svelte.ts`        | Add search island toggle/open/close. |
| `src/components/frame/frameVaultman.svelte`           | Audit exclusion call sites; pass search controls into Toolbar. |
| `src/components/layout/Toolbar.svelte`                | Route search-open through overlay state; render inline variant. |
| `src/components/settings/SettingsUI.svelte`           | Surface `toolbarSearchMode` toggle. |
| `test/unit/services/frameOverlaysSearchIsland.test.ts` | New — controller behavior. |
| `test/component/searchIslandCoexistence.test.ts`      | New — Toolbar + overlayState integration. |
| `test/component/toolbarSearchInlineVariant.test.ts`   | New — inline mode rendering. |
| `src/styles/components/_toolbar.scss` (or equivalent) | Inline-mode layout rules.  |

## Task 1.0: Add `toolbarSearchMode` setting

**Files:**

- Modify: `src/types/typeSettings.ts`
- Modify: `src/main.ts` (DEFAULT_SETTINGS export)

- [ ] **Step 1: Add setting key to `VaultmanSettings`**

Append to `VaultmanSettings` (after `layoutTheme` block in `src/types/typeSettings.ts`):

```ts
	/** Render the search affordance inline in the toolbar primitives row,
	 *  or as the lifted overlay island. Inline mode keeps a permanent search
	 *  input between the toolbar buttons; clicking expand promotes to overlay. */
	toolbarSearchMode: 'island' | 'inline';
```

- [ ] **Step 2: Seed default**

Locate `DEFAULT_SETTINGS` (typically in `src/main.ts`). Add the new key beside the other layout-related defaults:

```ts
toolbarSearchMode: 'island',
```

- [ ] **Step 3: Verify type-check passes**

Run:

```bash
pnpm run check
```

Expected: no errors mentioning `toolbarSearchMode`.

- [ ] **Step 4: Commit**

```bash
git add src/types/typeSettings.ts src/main.ts
git commit -m "feat(settings): add toolbarSearchMode key with island default"
```

## Task 1.1: Register `search-island` overlay id in controller

**Files:**

- Modify: `src/components/frame/frameOverlays.svelte.ts`
- Create: `test/unit/services/frameOverlaysSearchIsland.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/unit/services/frameOverlaysSearchIsland.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameOverlayController } from '../../../src/components/frame/frameOverlays.svelte';
import { OverlayStateService } from '../../../src/services/serviceOverlayState.svelte';

function makePlugin() {
	return {
		overlayState: new OverlayStateService(),
		settings: { islandDismissOnOutsideClick: true },
	} as unknown as ConstructorParameters<typeof FrameOverlayController>[0];
}

describe('FrameOverlayController search island', () => {
	it('opens and closes search island independently of stack islands', () => {
		const plugin = makePlugin();
		const c = new FrameOverlayController(plugin, {}, {});
		c.openSearchIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('queue')).toBe(false);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(false);
		c.openQueueIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('queue')).toBe(true);
		c.closeSearchIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(false);
		expect(plugin.overlayState.isOpen('queue')).toBe(true);
	});

	it('keeps filters↔queue mutually exclusive while search stays open', () => {
		const plugin = makePlugin();
		const c = new FrameOverlayController(plugin, {}, {});
		c.openSearchIsland();
		c.openFiltersIsland();
		c.openQueueIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('queue')).toBe(true);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(false);
	});

	it('toggleSearchIsland flips state without touching stack islands', () => {
		const plugin = makePlugin();
		const c = new FrameOverlayController(plugin, {}, {});
		c.openFiltersIsland();
		c.toggleSearchIsland({} as never);
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(true);
		c.toggleSearchIsland({} as never);
		expect(plugin.overlayState.isOpen('search-island')).toBe(false);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm run test:unit -- --reporter=verbose test/unit/services/frameOverlaysSearchIsland.test.ts
```

Expected: FAIL — `openSearchIsland`, `closeSearchIsland`, `toggleSearchIsland` do not exist.

- [ ] **Step 3: Add the three methods to `FrameOverlayController`**

Edit `src/components/frame/frameOverlays.svelte.ts`. Add a third component reference parameter (or accept an options bag). Minimal diff approach: extend the constructor with an optional fourth arg.

Constructor:

```ts
constructor(
	plugin: VaultmanPlugin,
	queueComponent: unknown,
	activeFiltersComponent: unknown,
	options?: { searchIslandComponent?: unknown; onImportBases?: () => void },
) {
	this.plugin = plugin;
	this.queueComponent = queueComponent;
	this.activeFiltersComponent = activeFiltersComponent;
	this.searchIslandComponent = options?.searchIslandComponent ?? null;
	this.onImportBases = options?.onImportBases;
}
```

Add property:

```ts
private readonly searchIslandComponent: unknown | null;
```

Add methods after `closeFiltersIsland`:

```ts
toggleSearchIsland(props?: Record<string, unknown>): void {
	if (this.plugin.overlayState.isOpen('search-island')) {
		this.closeSearchIsland();
	} else {
		this.openSearchIsland(props);
	}
}

openSearchIsland(props?: Record<string, unknown>): void {
	if (this.plugin.overlayState.isOpen('search-island')) return;
	this.plugin.overlayState.push({
		id: 'search-island',
		component: this.searchIslandComponent,
		props: {
			plugin: this.plugin,
			onClose: () => this.plugin.overlayState.popById('search-island'),
			...(props ?? {}),
		},
		dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
	});
}

closeSearchIsland(): void {
	this.plugin.overlayState.popById('search-island');
}
```

Update the `installFrameOverlayCommandHooks` type to also accept `toggleSearchIsland` (no behavior change yet, just shape):

```ts
overlays: Pick<
	FrameOverlayController,
	'toggleQueueIsland' | 'toggleFiltersIsland' | 'toggleSearchIsland'
>,
```

(The `installFrameOverlayCommandHooks` body does not need to wire the new command hook yet — Task 1.4 plumbs the Toolbar's open path.)

- [ ] **Step 3b: Update `frameVaultman.svelte` call site to the new constructor shape**

The signature is now `(plugin, queueComponent, activeFiltersComponent, options?)`, so the existing 4th positional arg (`onImportBases`) must move into the options bag.

Find the existing controller construction (around line 101):

```ts
overlays: new FrameOverlayController(
	plugin,
	ExplorerQueueComp,
	ExplorerActiveFiltersComp,
	onImportBasesHandler,            // <-- existing 4th arg, if any
),
```

Replace with:

```ts
overlays: new FrameOverlayController(
	plugin,
	ExplorerQueueComp,
	ExplorerActiveFiltersComp,
	{ onImportBases: onImportBasesHandler },
),
```

(If the existing call site does not pass any 4th arg, just leave it positional — the empty options object is implicit.)

- [ ] **Step 4: Re-run test**

```bash
pnpm run test:unit -- --reporter=verbose test/unit/services/frameOverlaysSearchIsland.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/frame/frameOverlays.svelte.ts test/unit/services/frameOverlaysSearchIsland.test.ts
git commit -m "feat(overlays): register search-island id alongside queue/filters"
```

## Task 1.2: Audit `frameVaultman.svelte` exclusion call sites

**Files:**

- Modify: `src/components/frame/frameVaultman.svelte`

Goal: surgically remove `overlays.closeQueueIsland(); overlays.closeFiltersIsland();`
pairs that fire as a side effect of *opening search* or focus changes within the explorer route. Keep pairs that fire on **route exit** (navigating away from the explorer to another page).

- [ ] **Step 1: Enumerate every call site**

Run:

```bash
grep -n "closeQueueIsland\|closeFiltersIsland" src/components/frame/frameVaultman.svelte
```

For each line number returned, open the file at that range and annotate its caller with a one-line comment classifying it:

```
// EXCLUSION REASON: route-exit | search-open | focus-change | mode-toggle | settings-write
```

- [ ] **Step 2: Remove search-open and focus-change exclusions**

For every call site classified as `search-open` or `focus-change`, delete the two consecutive lines:

```svelte
overlays.closeQueueIsland();
overlays.closeFiltersIsland();
```

Keep `route-exit` and `settings-write` sites untouched. Keep `mode-toggle` sites for now (Spec 2 may need them; we revisit during Task 2.x if they get in the way).

- [ ] **Step 3: Build to confirm the file still parses**

```bash
pnpm run check
```

Expected: no Svelte parse errors. Unused-import warnings (if any) are acceptable to address inline.

- [ ] **Step 4: Run component tests as smoke**

```bash
pnpm run test:component -- test/component/searchboxIsland.test.ts test/component/navbarPillFabBadges.test.ts
```

Expected: PASS. If any test fails because it relied on the closure behavior, capture the failure in a comment on the test and either:
(a) update the test to assert the new coexistence behavior, or (b) restore the closure if the test reveals a missed exclusion class.

- [ ] **Step 5: Commit**

```bash
git add src/components/frame/frameVaultman.svelte
git commit -m "refactor(frame): stop closing stack islands on search-open and focus changes"
```

## Task 1.3: Wire Toolbar search-open through overlay state

**Files:**

- Modify: `src/components/layout/Toolbar.svelte`
- Modify: `src/components/frame/frameVaultman.svelte` (constructor wiring)
- Create: `test/component/searchIslandCoexistence.test.ts`

- [ ] **Step 1: Write failing component test**

Create `test/component/searchIslandCoexistence.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from 'svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';
import { OverlayStateService } from '../../src/services/serviceOverlayState.svelte';

function baseProps(service: FnRIslandService, overlay: OverlayStateService) {
	return {
		activeTab: 'tags' as const,
		filtersSearch: '',
		filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0 },
		onSearchChange: vi.fn(),
		searchHistory: [],
		onSearchHistoryCommit: vi.fn(),
		sortBy: 'name',
		sortDirection: 'asc' as const,
		viewMode: 'tree',
		addMode: false,
		operationScope: 'auto' as const,
		filesShowSelectedOnly: false,
		tagsExplorer: undefined,
		propExplorer: undefined,
		fileList: undefined,
		nodeExpansionSummary: { canToggle: false, hasExpandedParents: false },
		icon: vi.fn(() => ({ update: vi.fn() })),
		addOpCount: 0,
		fnrIslandService: service,
		onCrear: vi.fn(),
		overlayState: overlay,
		toolbarSearchMode: 'island' as const,
	};
}

describe('Toolbar search island coexistence', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});
	afterEach(() => {
		if (app) { void unmount(app); app = null; }
		target.remove();
	});

	it('opens search via overlay state when toggle button clicked', () => {
		const service = new FnRIslandService();
		const overlay = new OverlayStateService();
		app = mount(Toolbar, { target, props: baseProps(service, overlay) });
		const btn = target.querySelector<HTMLButtonElement>(
			'[data-test="toolbar-search-toggle"]',
		);
		expect(btn).toBeTruthy();
		btn!.click();
		expect(overlay.isOpen('search-island')).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm run test:component -- test/component/searchIslandCoexistence.test.ts
```

Expected: FAIL — `data-test="toolbar-search-toggle"` button is not yet exposing the new behavior; `overlayState` prop is unknown.

- [ ] **Step 3: Accept `overlayState` and `toolbarSearchMode` props in Toolbar**

In `src/components/layout/Toolbar.svelte`, add to the `$props()` destructure (after `fieldDefinitions = []`):

```ts
overlayState,
toolbarSearchMode = 'island',
```

And to the prop type block:

```ts
overlayState?: import('../../services/serviceOverlayState.svelte').OverlayStateService;
toolbarSearchMode?: 'island' | 'inline';
```

- [ ] **Step 4: Replace local `searchIslandOpen` toggle to use overlay state**

In the existing `toggleSearchIsland()` function (currently around line 235), replace its body with:

```ts
function toggleSearchIsland() {
	if (overlayState) {
		const open = overlayState.isOpen('search-island');
		if (open) {
			overlayState.popById('search-island');
		} else {
			overlayState.push({
				id: 'search-island',
				component: null,
				props: {},
				dismissOnOutsideClick: false,
			});
			headerMode = 'header';
			queueMicrotask(() => searchboxRoot?.querySelector('input')?.focus());
		}
		searchIslandOpen = !open;
		return;
	}
	if (fnrIslandService) {
		setFnRPopoverOpen(!fnrPopoverOpen);
		return;
	}
	searchIslandOpen = !searchIslandOpen;
	if (searchIslandOpen) {
		headerMode = 'header';
		queueMicrotask(() => searchboxRoot?.querySelector('input')?.focus());
	}
}
```

Keep `searchIslandOpen` as a derived mirror so the template stays reactive when `overlayState` is undefined:

Add near other `$derived` blocks (right after the `historyItems` derivation):

```ts
$effect(() => {
	if (!overlayState) return;
	searchIslandOpen = overlayState.isOpen('search-island');
});
```

- [ ] **Step 5: Expose `data-test="toolbar-search-toggle"` on the search button**

Locate the existing search toggle button (around line 730) and add the attribute:

```svelte
<button
	class:is-active={searchIslandOpen}
	aria-pressed={searchIslandOpen}
	data-test="toolbar-search-toggle"
	... existing attrs ...
```

- [ ] **Step 6: Pipe `overlayState` and `toolbarSearchMode` through from `frameVaultman.svelte`**

In `frameVaultman.svelte`, find the `<Toolbar ... />` call site (or wherever Toolbar is rendered) and add:

```svelte
overlayState={plugin.overlayState}
toolbarSearchMode={plugin.settings.toolbarSearchMode}
```

- [ ] **Step 7: Re-run test**

```bash
pnpm run test:component -- test/component/searchIslandCoexistence.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/Toolbar.svelte src/components/frame/frameVaultman.svelte test/component/searchIslandCoexistence.test.ts
git commit -m "feat(toolbar): route search island through overlay state"
```

## Task 1.4: Render the inline-toolbar search variant

**Files:**

- Modify: `src/components/layout/Toolbar.svelte`
- Modify: `src/styles/components/_toolbar.scss` (or whichever partial owns the current header layout — discover via `git grep "vm-toolbar"`).
- Create: `test/component/toolbarSearchInlineVariant.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from 'svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';
import { OverlayStateService } from '../../src/services/serviceOverlayState.svelte';

function baseProps(extra: Record<string, unknown> = {}) {
	return {
		activeTab: 'tags' as const,
		filtersSearch: '',
		filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0 },
		onSearchChange: vi.fn(),
		searchHistory: [],
		onSearchHistoryCommit: vi.fn(),
		sortBy: 'name',
		sortDirection: 'asc' as const,
		viewMode: 'tree',
		addMode: false,
		operationScope: 'auto' as const,
		filesShowSelectedOnly: false,
		tagsExplorer: undefined,
		propExplorer: undefined,
		fileList: undefined,
		nodeExpansionSummary: { canToggle: false, hasExpandedParents: false },
		icon: vi.fn(() => ({ update: vi.fn() })),
		addOpCount: 0,
		fnrIslandService: new FnRIslandService(),
		overlayState: new OverlayStateService(),
		onCrear: vi.fn(),
		...extra,
	};
}

describe('Toolbar inline search variant', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => { target = document.createElement('div'); document.body.appendChild(target); });
	afterEach(() => { if (app) { void unmount(app); app = null; } target.remove(); });

	it('renders inline input when toolbarSearchMode is "inline"', () => {
		app = mount(Toolbar, { target, props: baseProps({ toolbarSearchMode: 'inline' }) });
		expect(target.querySelector('[data-test="toolbar-inline-search"]')).toBeTruthy();
		expect(target.querySelector('[data-test="toolbar-search-toggle"]')).toBeNull();
	});

	it('renders island-toggle button when toolbarSearchMode is "island"', () => {
		app = mount(Toolbar, { target, props: baseProps({ toolbarSearchMode: 'island' }) });
		expect(target.querySelector('[data-test="toolbar-inline-search"]')).toBeNull();
		expect(target.querySelector('[data-test="toolbar-search-toggle"]')).toBeTruthy();
	});

	it('inline expand icon opens overlay search island', () => {
		const overlay = new OverlayStateService();
		app = mount(Toolbar, {
			target,
			props: baseProps({ toolbarSearchMode: 'inline', overlayState: overlay }),
		});
		const expand = target.querySelector<HTMLButtonElement>('[data-test="toolbar-inline-expand"]');
		expect(expand).toBeTruthy();
		expand!.click();
		expect(overlay.isOpen('search-island')).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm run test:component -- test/component/toolbarSearchInlineVariant.test.ts
```

Expected: FAIL — neither variant nor expand element exists.

- [ ] **Step 3: Render the inline variant in `Toolbar.svelte`**

Locate the toolbar primitives row (search around line 670–740). Wrap the search toggle button in a conditional block. Pseudocode in the right shape — copy as-is:

```svelte
{#if toolbarSearchMode === 'inline'}
	<div class="vm-toolbar-inline-search" data-test="toolbar-inline-search">
		<input
			class="vm-toolbar-inline-search-input"
			type="search"
			placeholder={translate('filter.search_placeholder')}
			bind:value={filtersSearch}
			oninput={(e) => onSearchChange?.((e.currentTarget as HTMLInputElement).value)}
		/>
		<button
			class="vm-toolbar-inline-search-expand"
			data-test="toolbar-inline-expand"
			aria-label={translate('toolbar.search.expand')}
			onclick={toggleSearchIsland}
		>
			<span class="vm-toolbar-inline-search-expand-icon" use:icon={'lucide-maximize-2'} />
		</button>
	</div>
{:else}
	{@html ''}
	<!-- existing search toggle button block here, unchanged, with data-test="toolbar-search-toggle" -->
{/if}
```

Replace the comment placeholder above with the **actual existing search toggle button block** preserved verbatim. Do not re-author it.

- [ ] **Step 4: Add SCSS rules**

In `src/styles/components/_toolbar.scss` (or the partial that owns toolbar primitives — confirm via `git grep "vm-toolbar"`), append:

```scss
.vm-toolbar-inline-search {
	display: flex;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
	gap: 4px;
	padding: 0 6px;

	&-input {
		flex: 1 1 auto;
		min-width: 0;
		height: 28px;
		padding: 0 8px;
		border-radius: 8px;
		border: $vm-border-width solid $vm-border-color;
		background: $vm-bg-modifier-hover;
		font-size: var(--font-ui-small);
		color: $vm-text-normal;

		&:focus-visible {
			outline: 2px solid $vm-color-accent;
			outline-offset: -1px;
		}
	}

	&-expand {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: 0;
		background: transparent;
		color: $vm-text-muted;
		border-radius: 6px;
		cursor: pointer;

		&:hover {
			background: $vm-bg-modifier-hover;
			color: $vm-text-normal;
		}
	}
}
```

- [ ] **Step 5: Add i18n key**

Locate the i18n source files referenced by `translate(...)` (look in `src/index/i18n/`). For each language file, add:

```ts
'toolbar.search.expand': 'Expand search',
```

(Use a translated equivalent where Spanish/other locales exist.)

- [ ] **Step 6: Re-run test**

```bash
pnpm run test:component -- test/component/toolbarSearchInlineVariant.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/Toolbar.svelte src/styles/components/_toolbar.scss src/index/i18n test/component/toolbarSearchInlineVariant.test.ts
git commit -m "feat(toolbar): render inline search variant gated by toolbarSearchMode"
```

## Task 1.5: Surface `toolbarSearchMode` toggle in Settings UI

**Files:**

- Modify: `src/components/settings/SettingsUI.svelte`

- [ ] **Step 1: Inspect the existing Settings UI primitives**

```bash
sed -n '1,80p' src/components/settings/SettingsUI.svelte
```

Identify the segmented-control / toggle pattern used elsewhere (e.g., for `layoutTheme`, `openMode`). Match that pattern for the new control.

- [ ] **Step 2: Add the segmented control**

Inside the appropriate settings section (group with other layout-related toggles), add:

```svelte
<div class="vm-settings-row">
	<div class="vm-settings-row-label">
		<span class="vm-settings-row-title">{translate('settings.toolbar.search_mode')}</span>
		<span class="vm-settings-row-desc">{translate('settings.toolbar.search_mode.desc')}</span>
	</div>
	<div class="vm-settings-segmented">
		<button
			class:is-active={plugin.settings.toolbarSearchMode === 'island'}
			onclick={() => { plugin.settings.toolbarSearchMode = 'island'; void plugin.saveSettings(); }}
		>{translate('settings.toolbar.search_mode.island')}</button>
		<button
			class:is-active={plugin.settings.toolbarSearchMode === 'inline'}
			onclick={() => { plugin.settings.toolbarSearchMode = 'inline'; void plugin.saveSettings(); }}
		>{translate('settings.toolbar.search_mode.inline')}</button>
	</div>
</div>
```

- [ ] **Step 3: Add i18n keys**

In every locale file:

```ts
'settings.toolbar.search_mode': 'Toolbar search mode',
'settings.toolbar.search_mode.desc': 'Choose between the overlay island and the inline toolbar input.',
'settings.toolbar.search_mode.island': 'Island',
'settings.toolbar.search_mode.inline': 'Inline',
```

- [ ] **Step 4: Build to verify**

```bash
pnpm run check && pnpm run build:plugin
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SettingsUI.svelte src/index/i18n
git commit -m "feat(settings): expose toolbarSearchMode segmented control"
```

## Task 1.6: Shard verification gate

- [ ] **Step 1: Run the full Spec 1 gate**

```bash
pnpm run lint:full
pnpm run check
pnpm run test:unit
pnpm run test:component
pnpm run build:plugin
```

Expected: all clean except known performance residuals (`stress.test.ts`, `viewTableStress.test.ts`).

- [ ] **Step 2: Commit any auto-formatter touch-ups**

```bash
git status
# if formatter ran:
git add -A
git commit -m "chore(format): apply formatter on spec 1 surface"
```
