---
title: Spec 2 plan — F&R two-input + recent searches row stepper
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-13-toolbar-coexistence-fnr-recents/index|toolbar-coexistence-fnr-recents plan]]"
created: 2026-05-13T19:00:00
updated: 2026-05-13T19:00:00
tags:
  - agent/plan
  - search-island
  - fnr
  - recent-searches
created_by: opus
updated_by: opus
---

# Spec 2 Plan — F&R Two-Input + Recent Searches Row Stepper

> Source spec: [[docs/work/polish/specs/2026-05-13-toolbar-coexistence-fnr-recents/02-fnr-recents|02-fnr-recents]]
>
> Depends on shard 01 (Toolbar must already route search through overlay state).

## File Map

| File                                                    | Role                       |
| ------------------------------------------------------- | -------------------------- |
| `src/types/typeSettings.ts`                             | Add `fnrReplaceAlwaysVisible`, `recentSearchesRows`. |
| `src/main.ts`                                           | Seed defaults.             |
| `src/services/serviceFnRIsland.svelte.ts`               | Add `replacement` state + `setReplacement`. |
| `src/components/layout/Toolbar.svelte`                  | Remove stacked block; add Replace input + pill; rename strip; add stepper. |
| `src/components/settings/SettingsUI.svelte`             | Surface both keys.         |
| `src/styles/popup/_islands.scss`                        | New rules for replace row, recent strip, stepper. |
| `test/unit/services/serviceFnRIslandReplacement.test.ts`| New — service unit tests.  |
| `test/component/searchIslandFnRTwoInput.test.ts`        | New — pill + replace input. |
| `test/component/recentSearchesRowStepper.test.ts`       | New — strip + stepper.     |

## Task 2.0: Add two new settings keys

**Files:**

- Modify: `src/types/typeSettings.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Append keys**

In `VaultmanSettings`:

```ts
	/** Render the F&R replace input always-visible when true; otherwise
	 *  it lives behind the collapsible "F&R" pill (default). */
	fnrReplaceAlwaysVisible: boolean;
	/** Max visible rows in the recent-searches strip inside the search
	 *  island. Range 1..8. Default 4. */
	recentSearchesRows: number;
```

- [ ] **Step 2: Seed defaults**

In `DEFAULT_SETTINGS`:

```ts
fnrReplaceAlwaysVisible: false,
recentSearchesRows: 4,
```

- [ ] **Step 3: Type check**

```bash
pnpm run check
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/types/typeSettings.ts src/main.ts
git commit -m "feat(settings): add fnrReplaceAlwaysVisible and recentSearchesRows"
```

## Task 2.1: Add `replacement` state + `setReplacement` to FnRIslandService

**Files:**

- Modify: `src/services/serviceFnRIsland.svelte.ts`
- Create: `test/unit/services/serviceFnRIslandReplacement.test.ts`

- [ ] **Step 1: Write failing unit test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { FnRIslandService } from '../../../src/services/serviceFnRIsland.svelte';

describe('FnRIslandService replacement field', () => {
	it('exposes empty replacement by default', () => {
		const s = new FnRIslandService();
		expect(s.snapshot().replacement).toBe('');
	});

	it('setReplacement updates state and notifies', () => {
		const s = new FnRIslandService();
		const listener = vi.fn();
		s.subscribe(listener);
		s.setReplacement('renamed');
		expect(s.snapshot().replacement).toBe('renamed');
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('no-op when value unchanged', () => {
		const s = new FnRIslandService();
		const listener = vi.fn();
		s.subscribe(listener);
		s.setReplacement('');
		expect(listener).not.toHaveBeenCalled();
	});

	it('submit dispatches payload with replacement', () => {
		const dispatch = vi.fn();
		const s = new FnRIslandService({ dispatch });
		s.setQuery('foo');
		s.setReplacement('bar');
		s.submit();
		expect(dispatch).toHaveBeenCalledTimes(1);
		const arg = dispatch.mock.calls[0][0];
		expect(arg.query).toBe('foo');
		expect(arg.replacement).toBe('bar');
	});
});
```

- [ ] **Step 2: Confirm failure**

```bash
pnpm run test:unit -- test/unit/services/serviceFnRIslandReplacement.test.ts
```

Expected: FAIL — `replacement` does not exist on snapshot.

- [ ] **Step 3: Extend `FnRIslandState`, snapshot, and add setter**

Edit `src/services/serviceFnRIsland.svelte.ts`:

Add to the class `FnRIslandState`:

```ts
replacement = $state<string>('');
```

Add `replacement: string` to `FnRIslandSnapshot` interface:

```ts
export interface FnRIslandSnapshot {
	activeExplorerId: string;
	mode: FnRIslandMode;
	query: string;
	resolvedQuery: string;
	replacement: string;
	flags: FnRIslandFlags;
	expanded: boolean;
	errors: TokenError[];
	regexError: string | null;
}
```

Update `snapshot()` to include the field:

```ts
return {
	activeExplorerId: this.state.activeExplorerId,
	mode: this.state.mode,
	query: this.state.query,
	resolvedQuery: this.state.query,
	replacement: this.state.replacement,
	flags: { ... },
	expanded: this.state.expanded,
	errors,
	regexError,
};
```

Add the setter beside `setQuery`:

```ts
setReplacement(value: string): void {
	if (this.state.replacement === value) return;
	this.state.replacement = value;
	this.notify();
}
```

- [ ] **Step 4: Re-run test**

```bash
pnpm run test:unit -- test/unit/services/serviceFnRIslandReplacement.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/serviceFnRIsland.svelte.ts test/unit/services/serviceFnRIslandReplacement.test.ts
git commit -m "feat(fnr): add replacement field with setReplacement"
```

## Task 2.2: Remove "Stacked · N" block from search island

**Files:**

- Modify: `src/components/layout/Toolbar.svelte`

The chips are already rendered as filter rows inside `explorerActiveFilters.svelte`; removing the in-search preview does not orphan data.

- [ ] **Step 1: Locate the stacked block**

```bash
grep -n "vm-search-stack\|Stacked" src/components/layout/Toolbar.svelte
```

- [ ] **Step 2: Delete the markup**

Remove the `<div class="vm-search-stack">…</div>` block (the section that renders `chips.length > 0 && ...` with the `Stacked · N` label).
Keep the `chips` state variable for now — Task 2.8's gate sweep removes the legacy chip-selection plumbing once it confirms nothing else references it.

- [ ] **Step 3: Build to verify**

```bash
pnpm run check
```

Expected: clean (unused-variable warnings about `chips` are acceptable at this step; resolved in Task 2.3).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Toolbar.svelte
git commit -m "refactor(toolbar): remove stacked-chip preview from search island"
```

## Task 2.3: Add F&R pill + Replace input (B2 default)

**Files:**

- Modify: `src/components/layout/Toolbar.svelte`
- Modify: `src/styles/popup/_islands.scss`
- Create: `test/component/searchIslandFnRTwoInput.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from 'svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';
import { OverlayStateService } from '../../src/services/serviceOverlayState.svelte';

function baseProps(extra: Record<string, unknown> = {}) {
	const overlay = new OverlayStateService();
	overlay.push({ id: 'search-island', component: null, props: {}, dismissOnOutsideClick: false });
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
		onCrear: vi.fn(),
		overlayState: overlay,
		toolbarSearchMode: 'island' as const,
		fnrReplaceAlwaysVisible: false,
		...extra,
	};
}

describe('Search island F&R two-input', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => { target = document.createElement('div'); document.body.appendChild(target); });
	afterEach(() => { if (app) { void unmount(app); app = null; } target.remove(); });

	it('B2 default: replace input hidden, pill visible', () => {
		app = mount(Toolbar, { target, props: baseProps() });
		expect(target.querySelector('[data-test="fnr-pill"]')).toBeTruthy();
		expect(target.querySelector('[data-test="fnr-replace-input"]')).toBeNull();
	});

	it('B2 default: clicking pill reveals replace input', () => {
		app = mount(Toolbar, { target, props: baseProps() });
		target.querySelector<HTMLButtonElement>('[data-test="fnr-pill"]')!.click();
		expect(target.querySelector('[data-test="fnr-replace-input"]')).toBeTruthy();
	});

	it('B1 mode: replace input always visible', () => {
		app = mount(Toolbar, { target, props: baseProps({ fnrReplaceAlwaysVisible: true }) });
		expect(target.querySelector('[data-test="fnr-replace-input"]')).toBeTruthy();
	});

	it('replace input writes through to FnRIslandService', () => {
		const service = new FnRIslandService();
		app = mount(Toolbar, {
			target,
			props: baseProps({ fnrReplaceAlwaysVisible: true, fnrIslandService: service }),
		});
		const input = target.querySelector<HTMLInputElement>('[data-test="fnr-replace-input"]')!;
		input.value = 'renamed';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		expect(service.snapshot().replacement).toBe('renamed');
	});
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm run test:component -- test/component/searchIslandFnRTwoInput.test.ts
```

Expected: FAIL — pill and replace input absent.

- [ ] **Step 3: Accept new prop in Toolbar**

In `$props()` destructure of `Toolbar.svelte`:

```ts
fnrReplaceAlwaysVisible = false,
```

And in prop type block:

```ts
fnrReplaceAlwaysVisible?: boolean;
```

- [ ] **Step 4: Add local `fnrPillExpanded` state**

Near other `$state` declarations in the search-island scope:

```ts
let fnrPillExpanded = $state(false);
const replaceVisible = $derived(fnrReplaceAlwaysVisible || fnrPillExpanded);
```

- [ ] **Step 5: Insert pill + replace input above the suggestions section**

Inside the search-island markup, immediately under the existing find input row, insert:

```svelte
{#if !fnrReplaceAlwaysVisible}
	<button
		type="button"
		class="vm-search-fnr-pill"
		class:is-expanded={fnrPillExpanded}
		data-test="fnr-pill"
		onclick={() => (fnrPillExpanded = !fnrPillExpanded)}
		aria-pressed={fnrPillExpanded}
	>
		<span use:icon={'lucide-replace'} class="vm-search-fnr-pill-icon" />
		<span>{translate('search.fnr.pill')}</span>
	</button>
{/if}

{#if replaceVisible}
	<div class="vm-search-replace-row">
		<span use:icon={'lucide-corner-down-right'} class="vm-search-replace-icon" />
		<input
			data-test="fnr-replace-input"
			class="vm-search-replace-input"
			type="text"
			placeholder={replacePlaceholderForTab(activeTab)}
			value={fnrIslandService?.snapshot().replacement ?? ''}
			oninput={(e) => fnrIslandService?.setReplacement((e.currentTarget as HTMLInputElement).value)}
		/>
	</div>
{/if}
```

Add the helper near the top of the `<script>` block:

```ts
function replacePlaceholderForTab(tab: FiltersTab): string {
	switch (tab) {
		case 'props':   return translate('search.fnr.replace_placeholder.prop');
		case 'tags':    return translate('search.fnr.replace_placeholder.tag');
		case 'files':   return translate('search.fnr.replace_placeholder.file');
		case 'content': return translate('search.fnr.replace_placeholder.content');
	}
}
```

- [ ] **Step 6: SCSS for the new rows**

Append to `src/styles/popup/_islands.scss`:

```scss
.vm-search-fnr-pill {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	border-radius: 999px;
	border: $vm-border-width solid $vm-border-color;
	background: $vm-bg-modifier-hover;
	color: $vm-text-muted;
	font-size: var(--font-ui-smaller);
	cursor: pointer;
	align-self: flex-start;
	transition: background 0.15s, color 0.15s, transform 0.15s;

	&.is-expanded {
		background: color-mix(in srgb, $vm-color-accent 18%, transparent);
		color: $vm-text-normal;
	}

	&-icon {
		display: inline-flex;
		width: 12px;
		height: 12px;
	}
}

.vm-search-replace-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;
	border: $vm-border-width solid $vm-border-color;
	border-radius: 10px;
	background: $vm-bg-primary;
}

.vm-search-replace-input {
	flex: 1 1 auto;
	min-width: 0;
	background: transparent;
	border: 0;
	color: $vm-text-normal;
	font-size: var(--font-ui-small);
	outline: none;
}
```

- [ ] **Step 7: i18n keys**

In every locale file:

```ts
'search.fnr.pill': 'F&R',
'search.fnr.replace_placeholder.prop':    'Rename → new property',
'search.fnr.replace_placeholder.tag':     'Rename → new tag',
'search.fnr.replace_placeholder.file':    'Rename → new file name',
'search.fnr.replace_placeholder.content': 'Replace → new text',
```

- [ ] **Step 8: Pipe `fnrReplaceAlwaysVisible` through `frameVaultman.svelte`**

In the `<Toolbar ... />` call site:

```svelte
fnrReplaceAlwaysVisible={plugin.settings.fnrReplaceAlwaysVisible}
```

- [ ] **Step 9: Re-run test**

```bash
pnpm run test:component -- test/component/searchIslandFnRTwoInput.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 10: Commit**

```bash
git add src/components/layout/Toolbar.svelte src/styles/popup/_islands.scss src/components/frame/frameVaultman.svelte src/index/i18n test/component/searchIslandFnRTwoInput.test.ts
git commit -m "feat(toolbar): F&R two-input with pill default and always-visible setting"
```

## Task 2.4: Apply button label adapts to active tab

**Files:**

- Modify: `src/components/layout/Toolbar.svelte`

- [ ] **Step 1: Add the derived label**

Near the existing `crearTooltip` derivation:

```ts
const applyButtonLabel = $derived.by(() => {
	const replacement = fnrIslandService?.snapshot().replacement ?? '';
	if (replacement.length === 0) return translate('search.action.apply');
	if (activeTab === 'content') return translate('search.action.replace');
	return translate('search.action.rename');
});
```

- [ ] **Step 2: Render the label**

Update the primary Apply button inside the search island footer (currently a button with text `Apply`):

```svelte
<button class="primary" data-test="search-apply" onclick={onSearchApply}>
	{applyButtonLabel}
</button>
```

Where `onSearchApply` is a new function:

```ts
function onSearchApply() {
	fnrIslandService?.submit();
	overlayState?.popById('search-island');
}
```

- [ ] **Step 3: i18n**

```ts
'search.action.apply':   'Apply',
'search.action.rename':  'Rename',
'search.action.replace': 'Replace',
```

- [ ] **Step 4: Build**

```bash
pnpm run check && pnpm run test:component -- test/component/searchIslandFnRTwoInput.test.ts
```

Expected: clean, tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Toolbar.svelte src/index/i18n
git commit -m "feat(toolbar): adaptive Apply/Rename/Replace label per tab and replacement state"
```

## Task 2.5: Rename "Common in" → "Recent searches" + per-tab filtering

**Files:**

- Modify: `src/components/layout/Toolbar.svelte`
- Modify: `src/components/frame/frameVaultman.svelte` (history shape, if needed)

- [ ] **Step 1: Inspect `searchHistory` shape**

```bash
grep -n "searchHistory" src/components/frame/frameVaultman.svelte src/components/layout/Toolbar.svelte
```

If `searchHistory` is `string[]` today, extend the shape to a per-tab record on the producer side. If it is already `{term:string, tab:string}[]`, skip the producer change and only update the consumer.

- [ ] **Step 2: Update producer (frameVaultman.svelte) to record tab**

Where the history is appended (search for `onSearchHistoryCommit`), ensure each entry includes the current `activeTab`:

```ts
function commitHistory(term: string) {
	if (term.trim().length === 0) return;
	const entry = { term: term.trim(), tab: state.filterTab };
	state.searchHistory = [
		entry,
		...state.searchHistory.filter((e) => !(e.term === entry.term && e.tab === entry.tab)),
	].slice(0, 32);
}
```

Update the `state.searchHistory` type (in its initial declaration) to `{ term: string; tab: FiltersTab }[]`.

- [ ] **Step 3: Consumer changes in Toolbar.svelte**

Replace the existing `historyItems` derivation:

```ts
const recentHistory = $derived.by(() =>
	(searchHistory as { term: string; tab: FiltersTab }[])
		.filter((e) => e.tab === activeTab),
);
```

Replace the section label and chips block (the one that today reads `Common in {tab}` / suggestions). New markup:

```svelte
<div class="vm-search-section-label">
	<span>{translate('search.recent.title', { tab: activeTabLabel })}</span>
	<span class="meta">{recentHistory.length}</span>
</div>
<div
	class="vm-search-recent"
	style:--vm-recent-row-cap={recentSearchesRows}
	data-test="recent-search-strip"
>
	{#each recentHistory as item (item.term)}
		<button
			type="button"
			class="vm-search-recent-chip"
			data-test="recent-search-chip"
			onclick={() => onSearchChange?.(item.term)}
		>
			<span use:icon={'lucide-history'} class="vm-search-recent-chip-icon" />
			<span class="vm-search-recent-chip-text">{item.term}</span>
		</button>
	{/each}
	{#if recentHistory.length === 0}
		<div class="vm-search-empty">{translate('search.recent.empty')}</div>
	{/if}
</div>
```

Add a derived `activeTabLabel`:

```ts
const activeTabLabel = $derived(translate(`filter.tab.${activeTab}`));
```

- [ ] **Step 4: i18n keys**

```ts
'search.recent.title': 'Recent searches · {tab}',
'search.recent.empty': 'No recent searches yet',
```

Wire `translate` to support the `{tab}` interpolation if it does not already (most likely it does — check the existing `translate(...)`
signature).

- [ ] **Step 5: Build + spot-test**

```bash
pnpm run check
```

Expected: clean. Type errors about the `searchHistory` shape change must be fixed at every call site they appear (touch each producer/ consumer).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Toolbar.svelte src/components/frame/frameVaultman.svelte src/index/i18n
git commit -m "feat(toolbar): recent-searches strip per-tab from searchHistory"
```

## Task 2.6: Row stepper with bounds 1..8

**Files:**

- Modify: `src/components/layout/Toolbar.svelte`
- Modify: `src/styles/popup/_islands.scss`
- Create: `test/component/recentSearchesRowStepper.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from 'svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';
import { OverlayStateService } from '../../src/services/serviceOverlayState.svelte';

function baseProps(extra: Record<string, unknown> = {}) {
	const overlay = new OverlayStateService();
	overlay.push({ id: 'search-island', component: null, props: {}, dismissOnOutsideClick: false });
	return {
		activeTab: 'tags' as const,
		filtersSearch: '',
		filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0 },
		onSearchChange: vi.fn(),
		searchHistory: [
			{ term: 'alpha', tab: 'tags' }, { term: 'beta', tab: 'tags' },
			{ term: 'gamma', tab: 'tags' }, { term: 'delta', tab: 'tags' },
			{ term: 'epsilon', tab: 'tags' },
		],
		onSearchHistoryCommit: vi.fn(),
		onRecentSearchesRowsChange: vi.fn(),
		recentSearchesRows: 4,
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
		onCrear: vi.fn(),
		overlayState: overlay,
		toolbarSearchMode: 'island' as const,
		fnrReplaceAlwaysVisible: false,
		...extra,
	};
}

describe('Recent searches row stepper', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	beforeEach(() => { target = document.createElement('div'); document.body.appendChild(target); });
	afterEach(() => { if (app) { void unmount(app); app = null; } target.remove(); });

	it('renders current row count', () => {
		app = mount(Toolbar, { target, props: baseProps() });
		const display = target.querySelector('[data-test="recent-row-count"]');
		expect(display?.textContent).toContain('4');
	});

	it('+ increments and calls callback (bound at 8)', () => {
		const cb = vi.fn();
		app = mount(Toolbar, {
			target,
			props: baseProps({ recentSearchesRows: 7, onRecentSearchesRowsChange: cb }),
		});
		target.querySelector<HTMLButtonElement>('[data-test="recent-row-plus"]')!.click();
		expect(cb).toHaveBeenLastCalledWith(8);
	});

	it('+ disabled at 8', () => {
		app = mount(Toolbar, { target, props: baseProps({ recentSearchesRows: 8 }) });
		const plus = target.querySelector<HTMLButtonElement>('[data-test="recent-row-plus"]')!;
		expect(plus.disabled).toBe(true);
	});

	it('− disabled at 1', () => {
		app = mount(Toolbar, { target, props: baseProps({ recentSearchesRows: 1 }) });
		const minus = target.querySelector<HTMLButtonElement>('[data-test="recent-row-minus"]')!;
		expect(minus.disabled).toBe(true);
	});
});
```

- [ ] **Step 2: Confirm failure**

```bash
pnpm run test:component -- test/component/recentSearchesRowStepper.test.ts
```

Expected: FAIL — no stepper exists yet.

- [ ] **Step 3: Accept the new props**

In `Toolbar.svelte` `$props()`:

```ts
recentSearchesRows = 4,
onRecentSearchesRowsChange,
```

Types:

```ts
recentSearchesRows?: number;
onRecentSearchesRowsChange?: (rows: number) => void;
```

- [ ] **Step 4: Render stepper in the section label**

Replace the existing recent-searches section label with:

```svelte
<div class="vm-search-section-label">
	<span>{translate('search.recent.title', { tab: activeTabLabel })}</span>
	<div class="vm-recent-stepper" role="group" aria-label={translate('search.recent.rows_aria')}>
		<button
			type="button"
			data-test="recent-row-minus"
			class="vm-recent-stepper-btn"
			disabled={recentSearchesRows <= 1}
			onclick={() => onRecentSearchesRowsChange?.(Math.max(1, recentSearchesRows - 1))}
		>−</button>
		<span data-test="recent-row-count" class="vm-recent-stepper-count">{recentSearchesRows}</span>
		<button
			type="button"
			data-test="recent-row-plus"
			class="vm-recent-stepper-btn"
			disabled={recentSearchesRows >= 8}
			onclick={() => onRecentSearchesRowsChange?.(Math.min(8, recentSearchesRows + 1))}
		>+</button>
	</div>
</div>
```

- [ ] **Step 5: SCSS**

Append to `_islands.scss`:

```scss
.vm-recent-stepper {
	display: inline-flex;
	align-items: center;
	gap: 4px;

	&-btn {
		width: 18px;
		height: 18px;
		border-radius: 4px;
		border: $vm-border-width solid $vm-border-color;
		background: transparent;
		color: $vm-text-muted;
		font-family: monospace;
		font-size: 11px;
		line-height: 1;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;

		&:disabled { opacity: 0.4; cursor: not-allowed; }
		&:not(:disabled):hover { background: $vm-bg-modifier-hover; color: $vm-text-normal; }
	}

	&-count {
		min-width: 12px;
		text-align: center;
		font-variant-numeric: tabular-nums;
		font-size: var(--font-ui-smaller);
	}
}

.vm-search-recent {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	max-height: calc(var(--vm-recent-row-h, 28px) * var(--vm-recent-row-cap, 4) + 6px * (var(--vm-recent-row-cap, 4) - 1));
	overflow: hidden;
}

.vm-search-recent-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	height: var(--vm-recent-row-h, 28px);
	border-radius: 999px;
	border: $vm-border-width solid $vm-border-color;
	background: $vm-bg-modifier-hover;
	color: $vm-text-normal;
	font-size: var(--font-ui-smaller);
	cursor: pointer;
	max-width: 100%;

	&-icon { display: inline-flex; width: 12px; height: 12px; color: $vm-text-faint; }
	&-text { @include text-ellipsis; }
}
```

- [ ] **Step 6: i18n**

```ts
'search.recent.rows_aria': 'Visible rows for recent searches',
```

- [ ] **Step 7: Wire from frameVaultman.svelte**

In the Toolbar call site:

```svelte
recentSearchesRows={plugin.settings.recentSearchesRows}
onRecentSearchesRowsChange={(rows) => {
	plugin.settings.recentSearchesRows = rows;
	void plugin.saveSettings();
}}
```

- [ ] **Step 8: Re-run test**

```bash
pnpm run test:component -- test/component/recentSearchesRowStepper.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/Toolbar.svelte src/styles/popup/_islands.scss src/components/frame/frameVaultman.svelte src/index/i18n test/component/recentSearchesRowStepper.test.ts
git commit -m "feat(toolbar): inline row stepper for recent-searches strip"
```

## Task 2.7: Settings UI for both new keys

**Files:**

- Modify: `src/components/settings/SettingsUI.svelte`

- [ ] **Step 1: Add controls**

Inside the search/F&R settings section, append:

```svelte
<div class="vm-settings-row">
	<div class="vm-settings-row-label">
		<span class="vm-settings-row-title">{translate('settings.fnr.replace_always')}</span>
		<span class="vm-settings-row-desc">{translate('settings.fnr.replace_always.desc')}</span>
	</div>
	<button
		class="vm-toggle"
		class:is-on={plugin.settings.fnrReplaceAlwaysVisible}
		onclick={() => {
			plugin.settings.fnrReplaceAlwaysVisible = !plugin.settings.fnrReplaceAlwaysVisible;
			void plugin.saveSettings();
		}}
		aria-pressed={plugin.settings.fnrReplaceAlwaysVisible}
	><span class="vm-toggle-thumb" /></button>
</div>

<div class="vm-settings-row">
	<div class="vm-settings-row-label">
		<span class="vm-settings-row-title">{translate('settings.recent_rows')}</span>
		<span class="vm-settings-row-desc">{translate('settings.recent_rows.desc')}</span>
	</div>
	<input
		type="number" min="1" max="8" step="1"
		value={plugin.settings.recentSearchesRows}
		oninput={(e) => {
			const n = Math.max(1, Math.min(8, parseInt((e.currentTarget as HTMLInputElement).value, 10) || 4));
			plugin.settings.recentSearchesRows = n;
			void plugin.saveSettings();
		}}
	/>
</div>
```

- [ ] **Step 2: i18n**

```ts
'settings.fnr.replace_always': 'F&R replace always visible',
'settings.fnr.replace_always.desc': 'Show the replace input permanently instead of behind the pill.',
'settings.recent_rows': 'Recent searches rows',
'settings.recent_rows.desc': 'How many rows of chips the recent-searches strip shows (1–8).',
```

- [ ] **Step 3: Verify**

```bash
pnpm run check && pnpm run lint:full
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SettingsUI.svelte src/index/i18n
git commit -m "feat(settings): surface fnrReplaceAlwaysVisible and recentSearchesRows"
```

## Task 2.8: Shard verification gate

- [ ] **Step 1: Run gate**

```bash
pnpm run lint:full
pnpm run check
pnpm run test:unit
pnpm run test:component
pnpm run build:plugin
```

Expected: all clean (modulo deferred perf tests).

- [ ] **Step 2: Sweep up any unused legacy state**

If `chips`, `setChips`, or related variables from the old stacked block remain unused in `Toolbar.svelte`, delete them now (and any reactivity that depended on them). Re-run the gate.

- [ ] **Step 3: Commit cleanup**

```bash
git status
git add -A
git commit -m "chore(toolbar): drop legacy chip state from search island"
```
