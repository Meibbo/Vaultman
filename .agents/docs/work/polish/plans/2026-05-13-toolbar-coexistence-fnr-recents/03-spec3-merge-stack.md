---
title: Spec 3 plan — merge stack island setting
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-13-toolbar-coexistence-fnr-recents/index|toolbar-coexistence-fnr-recents plan]]"
created: 2026-05-13T19:00:00
updated: 2026-05-13T19:00:00
tags:
  - agent/plan
  - stack-island
  - filters
  - queue
  - overlay-state
created_by: opus
updated_by: opus
---

# Spec 3 Plan — Merge Stack Island Setting

> Source spec: [[docs/work/polish/specs/2026-05-13-toolbar-coexistence-fnr-recents/03-merge-stack-island|03-merge-stack-island]]

## File Map

| File                                                       | Role                                     |
| ---------------------------------------------------------- | ---------------------------------------- |
| `src/types/typeSettings.ts`                                | Add `mergedStackIsland`.                 |
| `src/main.ts`                                              | Seed default.                            |
| `src/components/frame/frameOverlays.svelte.ts`             | Branch by setting; introduce `stackView` and `stack-island` id. |
| `src/components/containers/explorerActiveFiltersBody.svelte` | New — extracted body markup.           |
| `src/components/containers/explorerQueueBody.svelte`       | New — extracted body markup.             |
| `src/components/containers/explorerActiveFilters.svelte`   | Compose body + existing squircles.       |
| `src/components/containers/explorerQueue.svelte`           | Compose body + existing squircles.       |
| `src/components/containers/stackIsland.svelte`             | New — merged shell with arrow nav.       |
| `src/components/frame/frameVaultman.svelte`                | Register merged-mode component reference. |
| `src/components/settings/SettingsUI.svelte`                | Surface the toggle.                      |
| `src/styles/popup/_islands.scss`                           | Arrow-nav header, cross-fade rules.      |
| `test/component/mergedStackIslandToggle.test.ts`           | New.                                     |
| `test/component/mergedStackIslandArrowNav.test.ts`         | New.                                     |
| `test/unit/services/frameOverlaysMergedMode.test.ts`       | New.                                     |

## Task 3.0: Add `mergedStackIsland` setting

**Files:** `src/types/typeSettings.ts`, `src/main.ts`

- [ ] **Step 1: Append key**

```ts
	/** Render filters + queue as a single shell with arrow-nav between
	 *  the two views. Off keeps the legacy XOR pair. */
	mergedStackIsland: boolean;
```

- [ ] **Step 2: Default**

```ts
mergedStackIsland: false,
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm run check
git add src/types/typeSettings.ts src/main.ts
git commit -m "feat(settings): add mergedStackIsland default off"
```

## Task 3.1: Extract `explorerActiveFiltersBody.svelte`

**Files:**

- Create: `src/components/containers/explorerActiveFiltersBody.svelte`
- Modify: `src/components/containers/explorerActiveFilters.svelte`

- [ ] **Step 1: Pure cut-and-paste**

Open `explorerActiveFilters.svelte` and identify the body markup (the `<ViewList .../>` and its supporting state). Move that markup verbatim into a new file `explorerActiveFiltersBody.svelte`, lifting its `$props()` so the parent passes `plugin` and `onImportBases`.

`explorerActiveFiltersBody.svelte` skeleton:

```svelte
<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	// re-import everything currently used inside the body block

	let { plugin, onImportBases }: { plugin: VaultmanPlugin; onImportBases?: () => void } = $props();

	// ... existing state + helper functions copied verbatim from the
	// original file, with the squircle row markup removed ...
</script>

<!-- The body markup goes here (everything except the squircle row) -->
```

- [ ] **Step 2: Update `explorerActiveFilters.svelte` to compose**

The original file becomes a thin shell:

```svelte
<script lang="ts">
	import ExplorerActiveFiltersBody from './explorerActiveFiltersBody.svelte';
	import type { VaultmanPlugin } from '../../main';

	let {
		plugin,
		onClose,
		onImportBases,
	}: { plugin: VaultmanPlugin; onClose?: () => void; onImportBases?: () => void } = $props();
</script>

<div class="vm-active-filters-island-wrap">
	<div class="vm-active-filters-island">
		<!-- existing squircle row markup (the existing top action bar) -->
		<div class="vm-squircle-row">
			<!-- existing buttons (unchanged) -->
		</div>
		<ExplorerActiveFiltersBody {plugin} {onImportBases} />
	</div>
</div>
```

- [ ] **Step 3: Run existing filters-island tests**

```bash
pnpm run test:component -- $(grep -rl "explorerActiveFilters" test/ | tr '\n' ' ')
```

Expected: PASS — no behavior change.

- [ ] **Step 4: Commit**

```bash
git add src/components/containers/explorerActiveFiltersBody.svelte src/components/containers/explorerActiveFilters.svelte
git commit -m "refactor(filters): extract explorerActiveFiltersBody.svelte"
```

## Task 3.2: Extract `explorerQueueBody.svelte`

Same procedure as Task 3.1 against `explorerQueue.svelte`.

- [ ] **Step 1: Create the body file**

`explorerQueueBody.svelte` receives `{ plugin }` and exposes the existing queue list rendering.

- [ ] **Step 2: Rewrite the shell to compose body + squircles**

- [ ] **Step 3: Run queue tests**

```bash
pnpm run test:component -- $(grep -rl "explorerQueue\|vm-queue" test/ | tr '\n' ' ')
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/containers/explorerQueueBody.svelte src/components/containers/explorerQueue.svelte
git commit -m "refactor(queue): extract explorerQueueBody.svelte"
```

## Task 3.3: Create the merged shell component

**Files:**

- Create: `src/components/containers/stackIsland.svelte`
- Create: `test/component/mergedStackIslandArrowNav.test.ts`

- [ ] **Step 1: Write failing component test**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, unmount } from 'svelte';
import StackIsland from '../../src/components/containers/stackIsland.svelte';

function makePlugin() {
	return {
		filterService: { activeFilters: [], removeNode: () => {} },
		activeFiltersIndex: { subscribe: () => () => {} },
		queueService: { items: [] },
	} as any;
}

describe('StackIsland merged shell arrow nav', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	beforeEach(() => { target = document.createElement('div'); document.body.appendChild(target); });
	afterEach(() => { if (app) { void unmount(app); app = null; } target.remove(); });

	it('starts in the view passed via prop', () => {
		app = mount(StackIsland, {
			target,
			props: { plugin: makePlugin(), initialView: 'filters', onClose: () => {} },
		});
		expect(target.querySelector('[data-test="stack-view-filters"]')).toBeTruthy();
		expect(target.querySelector('[data-test="stack-view-queue"]')).toBeNull();
	});

	it('right arrow swaps to queue view', () => {
		app = mount(StackIsland, {
			target,
			props: { plugin: makePlugin(), initialView: 'filters', onClose: () => {} },
		});
		target.querySelector<HTMLButtonElement>('[data-test="stack-arrow-right"]')!.click();
		expect(target.querySelector('[data-test="stack-view-queue"]')).toBeTruthy();
		expect(target.querySelector('[data-test="stack-view-filters"]')).toBeNull();
	});

	it('left arrow swaps back to filters view', () => {
		app = mount(StackIsland, {
			target,
			props: { plugin: makePlugin(), initialView: 'queue', onClose: () => {} },
		});
		target.querySelector<HTMLButtonElement>('[data-test="stack-arrow-left"]')!.click();
		expect(target.querySelector('[data-test="stack-view-filters"]')).toBeTruthy();
	});
});
```

- [ ] **Step 2: Confirm failure**

```bash
pnpm run test:component -- test/component/mergedStackIslandArrowNav.test.ts
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Create `stackIsland.svelte`**

```svelte
<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import { setIcon } from 'obsidian';
	import ExplorerActiveFiltersBody from './explorerActiveFiltersBody.svelte';
	import ExplorerQueueBody from './explorerQueueBody.svelte';
	import { translate } from '../../index/i18n/lang';

	type StackView = 'filters' | 'queue';

	let {
		plugin,
		initialView = 'filters',
		onClose,
		onImportBases,
	}: {
		plugin: VaultmanPlugin;
		initialView?: StackView;
		onClose?: () => void;
		onImportBases?: () => void;
	} = $props();

	let view = $state<StackView>(initialView);

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update: (n: string) => setIcon(el, n) };
	}

	function swap(next: StackView) {
		if (view === next) return;
		view = next;
	}
</script>

<div class="vm-stack-island-merged-wrap">
	<div class="vm-stack-island-merged">
		<div class="vm-stack-merged-header">
			<button
				type="button"
				class="vm-stack-merged-arrow"
				data-test="stack-arrow-left"
				aria-label={translate('stack.arrow.left')}
				onclick={() => swap(view === 'filters' ? 'queue' : 'filters')}
			><span use:icon={'lucide-chevron-left'} /></button>
			<span class="vm-stack-merged-title">
				{translate(view === 'filters' ? 'stack.title.filters' : 'stack.title.queue')}
			</span>
			<button
				type="button"
				class="vm-stack-merged-arrow"
				data-test="stack-arrow-right"
				aria-label={translate('stack.arrow.right')}
				onclick={() => swap(view === 'filters' ? 'queue' : 'filters')}
			><span use:icon={'lucide-chevron-right'} /></button>
			<button
				type="button"
				class="vm-stack-merged-close"
				aria-label={translate('stack.close')}
				onclick={() => onClose?.()}
			><span use:icon={'lucide-x'} /></button>
		</div>
		<div class="vm-stack-merged-body" data-current-view={view}>
			{#if view === 'filters'}
				<div data-test="stack-view-filters" class="vm-stack-merged-pane">
					<ExplorerActiveFiltersBody {plugin} {onImportBases} />
				</div>
			{:else}
				<div data-test="stack-view-queue" class="vm-stack-merged-pane">
					<ExplorerQueueBody {plugin} />
				</div>
			{/if}
		</div>
	</div>
</div>
```

- [ ] **Step 4: SCSS for the merged shell**

Append to `src/styles/popup/_islands.scss`:

```scss
.vm-stack-island-merged-wrap {
	@extend %vm-island-wrap;
}

.vm-stack-island-merged {
	@extend %vm-island-body;
	padding-top: 12px;
	gap: 0;
}

.vm-stack-merged-header {
	display: grid;
	grid-template-columns: 32px 1fr 32px 32px;
	align-items: center;
	gap: 4px;
	padding-bottom: 6px;
	border-bottom: $vm-border-width solid $vm-border-color;
}

.vm-stack-merged-title {
	text-align: center;
	font-weight: 700;
	color: $vm-text-normal;
	font-size: var(--font-ui-small);
}

.vm-stack-merged-arrow,
.vm-stack-merged-close {
	width: 28px;
	height: 28px;
	border-radius: 8px;
	border: 0;
	background: transparent;
	color: $vm-text-muted;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;

	&:hover {
		background: $vm-bg-modifier-hover;
		color: $vm-text-normal;
	}
}

.vm-stack-merged-body {
	position: relative;
	overflow: hidden;
	flex: 1 1 auto;
}

.vm-stack-merged-pane {
	animation: vm-stack-merged-fade-in 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes vm-stack-merged-fade-in {
	from { opacity: 0; transform: translateX(12px); }
	to { opacity: 1; transform: translateX(0); }
}
```

- [ ] **Step 5: i18n**

```ts
'stack.title.filters': 'Active filters',
'stack.title.queue':   'Operation queue',
'stack.arrow.left':    'Previous view',
'stack.arrow.right':   'Next view',
'stack.close':         'Close',
```

- [ ] **Step 6: Re-run test**

```bash
pnpm run test:component -- test/component/mergedStackIslandArrowNav.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/containers/stackIsland.svelte src/styles/popup/_islands.scss src/index/i18n test/component/mergedStackIslandArrowNav.test.ts
git commit -m "feat(stack): merged shell with arrow-nav header"
```

## Task 3.4: Branch `frameOverlays.svelte.ts` by `mergedStackIsland`

**Files:**

- Modify: `src/components/frame/frameOverlays.svelte.ts`
- Create: `test/unit/services/frameOverlaysMergedMode.test.ts`

- [ ] **Step 1: Failing unit test**

```ts
import { describe, expect, it } from 'vitest';
import { FrameOverlayController } from '../../../src/components/frame/frameOverlays.svelte';
import { OverlayStateService } from '../../../src/services/serviceOverlayState.svelte';

function makePlugin(merged: boolean) {
	return {
		overlayState: new OverlayStateService(),
		settings: { islandDismissOnOutsideClick: true, mergedStackIsland: merged },
	} as any;
}

describe('FrameOverlayController merged stack mode', () => {
	it('off: separate overlay ids stay XOR (existing behavior)', () => {
		const plugin = makePlugin(false);
		const c = new FrameOverlayController(plugin, {}, {}, { stackIslandComponent: {} });
		c.openQueueIsland();
		c.openFiltersIsland();
		expect(plugin.overlayState.isOpen('queue')).toBe(false);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(true);
	});

	it('on: uses single stack-island id and swaps stackView', () => {
		const plugin = makePlugin(true);
		const c = new FrameOverlayController(plugin, {}, {}, { stackIslandComponent: {} });
		c.openQueueIsland();
		expect(plugin.overlayState.isOpen('stack-island')).toBe(true);
		expect(c.stackView).toBe('queue');
		c.openFiltersIsland();
		expect(plugin.overlayState.isOpen('stack-island')).toBe(true);
		expect(c.stackView).toBe('filters');
	});

	it('on: toggleQueueIsland on same view closes; on other view swaps', () => {
		const plugin = makePlugin(true);
		const c = new FrameOverlayController(plugin, {}, {}, { stackIslandComponent: {} });
		c.openFiltersIsland();
		c.toggleQueueIsland();
		expect(plugin.overlayState.isOpen('stack-island')).toBe(true);
		expect(c.stackView).toBe('queue');
		c.toggleQueueIsland();
		expect(plugin.overlayState.isOpen('stack-island')).toBe(false);
	});
});
```

- [ ] **Step 2: Confirm failure**

```bash
pnpm run test:unit -- test/unit/services/frameOverlaysMergedMode.test.ts
```

Expected: FAIL — merged-mode branches do not exist; `stackView` not on the controller; constructor signature mismatch.

- [ ] **Step 3: Extend the constructor**

Update `FrameOverlayController` constructor:

```ts
constructor(
	plugin: VaultmanPlugin,
	queueComponent: unknown,
	activeFiltersComponent: unknown,
	options?: {
		searchIslandComponent?: unknown;
		stackIslandComponent?: unknown;
		onImportBases?: () => void;
	},
) {
	this.plugin = plugin;
	this.queueComponent = queueComponent;
	this.activeFiltersComponent = activeFiltersComponent;
	this.searchIslandComponent = options?.searchIslandComponent ?? null;
	this.stackIslandComponent = options?.stackIslandComponent ?? null;
	this.onImportBases = options?.onImportBases;
}
```

Add new property:

```ts
private readonly stackIslandComponent: unknown | null;
stackView = $state<'filters' | 'queue'>('filters');
```

- [ ] **Step 4: Branch the toggles**

Rewrite `toggleQueueIsland` and `toggleFiltersIsland`:

```ts
toggleQueueIsland(): void {
	if (this.plugin.settings.mergedStackIsland) {
		this.toggleMergedView('queue');
		return;
	}
	this.closeFiltersIsland();
	if (this.activePopup === 'active-filters') this.closePopup();
	if (this.plugin.overlayState.isOpen('queue')) {
		this.closeQueueIsland();
	} else {
		this.openQueueIsland();
	}
}

toggleFiltersIsland(): void {
	if (this.plugin.settings.mergedStackIsland) {
		this.toggleMergedView('filters');
		return;
	}
	this.closeQueueIsland();
	if (this.plugin.overlayState.isOpen('active-filters')) {
		this.closeFiltersIsland();
	} else {
		this.openFiltersIsland();
	}
}

openQueueIsland(): void {
	if (this.plugin.settings.mergedStackIsland) {
		this.openMergedShell('queue');
		return;
	}
	if (this.plugin.overlayState.isOpen('queue')) return;
	this.plugin.overlayState.push({
		id: 'queue',
		component: this.queueComponent,
		props: { plugin: this.plugin, onClose: () => this.plugin.overlayState.popById('queue') },
		dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
	});
}

openFiltersIsland(): void {
	if (this.plugin.settings.mergedStackIsland) {
		this.openMergedShell('filters');
		return;
	}
	if (this.plugin.overlayState.isOpen('active-filters')) return;
	this.plugin.overlayState.push({
		id: 'active-filters',
		component: this.activeFiltersComponent,
		props: {
			plugin: this.plugin,
			onClose: () => this.plugin.overlayState.popById('active-filters'),
			onImportBases: () => {
				this.closeFiltersIsland();
				this.onImportBases?.();
			},
		},
		dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
	});
}
```

Add the merged-mode helpers:

```ts
private toggleMergedView(target: 'filters' | 'queue'): void {
	const open = this.plugin.overlayState.isOpen('stack-island');
	if (!open) {
		this.openMergedShell(target);
		return;
	}
	if (this.stackView === target) {
		this.plugin.overlayState.popById('stack-island');
		return;
	}
	this.stackView = target;
}

private openMergedShell(target: 'filters' | 'queue'): void {
	this.stackView = target;
	if (this.plugin.overlayState.isOpen('stack-island')) return;
	this.plugin.overlayState.push({
		id: 'stack-island',
		component: this.stackIslandComponent,
		props: {
			plugin: this.plugin,
			initialView: target,
			onClose: () => this.plugin.overlayState.popById('stack-island'),
			onImportBases: () => {
				this.plugin.overlayState.popById('stack-island');
				this.onImportBases?.();
			},
		},
		dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
	});
}
```

- [ ] **Step 5: Pass `stackIslandComponent` from `frameVaultman.svelte`**

In the controller construction, change to pass options:

```ts
overlays: new FrameOverlayController(
	plugin,
	ExplorerQueueComp,
	ExplorerActiveFiltersComp,
	{
		stackIslandComponent: StackIslandComp,
		onImportBases: () => { /* existing handler */ },
	},
),
```

Import:

```ts
import StackIslandComp from '../containers/stackIsland.svelte';
```

- [ ] **Step 6: Re-run unit test**

```bash
pnpm run test:unit -- test/unit/services/frameOverlaysMergedMode.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/frame/frameOverlays.svelte.ts src/components/frame/frameVaultman.svelte test/unit/services/frameOverlaysMergedMode.test.ts
git commit -m "feat(overlays): mergedStackIsland branch with stackView swap"
```

## Task 3.5: Toggle behavior round-trip test

**Files:**

- Create: `test/component/mergedStackIslandToggle.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { FrameOverlayController } from '../../src/components/frame/frameOverlays.svelte';
import { OverlayStateService } from '../../src/services/serviceOverlayState.svelte';

function makePlugin(merged: boolean) {
	return {
		overlayState: new OverlayStateService(),
		settings: { islandDismissOnOutsideClick: true, mergedStackIsland: merged },
	} as any;
}

describe('mergedStackIsland round-trip', () => {
	it('off→on: behavior switches without reload', () => {
		const plugin = makePlugin(false);
		const c = new FrameOverlayController(plugin, {}, {}, { stackIslandComponent: {} });
		c.openFiltersIsland();
		expect(plugin.overlayState.isOpen('active-filters')).toBe(true);
		c.closeFiltersIsland();
		plugin.settings.mergedStackIsland = true;
		c.openFiltersIsland();
		expect(plugin.overlayState.isOpen('stack-island')).toBe(true);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(false);
	});
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm run test:component -- test/component/mergedStackIslandToggle.test.ts
git add test/component/mergedStackIslandToggle.test.ts
git commit -m "test(overlays): mergedStackIsland off/on round-trip"
```

## Task 3.6: Surface `mergedStackIsland` toggle in Settings UI

**Files:** `src/components/settings/SettingsUI.svelte`

- [ ] **Step 1: Add the toggle row**

Inside the layout settings section:

```svelte
<div class="vm-settings-row">
	<div class="vm-settings-row-label">
		<span class="vm-settings-row-title">{translate('settings.stack.merged')}</span>
		<span class="vm-settings-row-desc">{translate('settings.stack.merged.desc')}</span>
	</div>
	<button
		class="vm-toggle"
		class:is-on={plugin.settings.mergedStackIsland}
		onclick={() => {
			plugin.settings.mergedStackIsland = !plugin.settings.mergedStackIsland;
			void plugin.saveSettings();
		}}
		aria-pressed={plugin.settings.mergedStackIsland}
	><span class="vm-toggle-thumb" /></button>
</div>
```

- [ ] **Step 2: i18n**

```ts
'settings.stack.merged': 'Merge stack island',
'settings.stack.merged.desc': 'Render filters + queue as a single shell with arrow navigation between the two views.',
```

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/SettingsUI.svelte src/index/i18n
git commit -m "feat(settings): surface mergedStackIsland toggle"
```

## Task 3.7: Shard verification gate

- [ ] **Step 1: Full gate**

```bash
pnpm run lint:full
pnpm run check
pnpm run test:unit
pnpm run test:component
pnpm run build:plugin
```

Expected: clean (modulo deferred perf tests).

- [ ] **Step 2: Cross-spec smoke**

Run the integrated suite to confirm shards 01 and 02 still pass with shard 03 changes:

```bash
pnpm run test:component -- test/component/searchIslandCoexistence.test.ts test/component/searchIslandFnRTwoInput.test.ts test/component/recentSearchesRowStepper.test.ts test/component/toolbarSearchInlineVariant.test.ts test/component/mergedStackIslandArrowNav.test.ts test/component/mergedStackIslandToggle.test.ts
```

Expected: PASS.

- [ ] **Step 3: Final commit if anything moved**

```bash
git status
git add -A
git commit -m "chore: final spec 3 gate sweep"
```
