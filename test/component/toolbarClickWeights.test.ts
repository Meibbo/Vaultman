import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';

function baseProps(overrides: Record<string, unknown> = {}) {
	return {
		activeTab: 'tags',
		filtersSearch: '',
		filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0 },
		onSearchChange: vi.fn(),
		searchHistory: [],
		onSearchHistoryCommit: vi.fn(),
		sortBy: 'date',
		sortDirection: 'asc' as const,
		viewMode: 'grid',
		addMode: false,
		operationScope: 'auto' as const,
		filesShowSelectedOnly: false,
		tagsExplorer: undefined,
		propExplorer: undefined,
		fileList: undefined,
		nodeExpansionSummary: { canToggle: true, hasExpandedParents: false },
		icon: vi.fn(() => ({ update: vi.fn() })),
		addOpCount: 0,
		fnrIslandService: new FnRIslandService(),
		onCrear: vi.fn(),
		...overrides,
	};
}

describe('Toolbar menu click weights', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		vi.useFakeTimers();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.useRealTimers();
	});

	function render(props: Record<string, unknown> = {}) {
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(props),
		});
		flushSync();
	}

	it('double clicking the view control cycles operation scope instead of opening the popup', () => {
		const onOperationScopeChange = vi.fn();
		render({ onOperationScopeChange });
		const viewBtn = target.querySelector<HTMLElement>('[aria-label="View mode"]')!;

		viewBtn.click();
		vi.advanceTimersByTime(80);
		viewBtn.click();
		vi.advanceTimersByTime(300);
		flushSync();

		expect(onOperationScopeChange).toHaveBeenCalledWith('selected');
		expect(target.querySelector('.vm-viewmode-popup')).toBeNull();
	});

	it('double clicking the sort control toggles node expansion', () => {
		const onToggleNodeExpansion = vi.fn();
		render({ onToggleNodeExpansion });
		const sortBtn = target.querySelector<HTMLElement>('[aria-label="Sort"]')!;

		sortBtn.click();
		vi.advanceTimersByTime(80);
		sortBtn.click();
		vi.advanceTimersByTime(300);
		flushSync();

		expect(onToggleNodeExpansion).toHaveBeenCalledOnce();
		expect(target.querySelector('.vm-sort-popup')).toBeNull();
	});

	it('alt clicking the view control restores tree view', () => {
		render();
		const viewBtn = target.querySelector<HTMLElement>('[aria-label="View mode"]')!;

		viewBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
		viewBtn.click();
		vi.advanceTimersByTime(260);
		flushSync();

		expect(
			target.querySelector('.vm-viewmode-popup [aria-label="Tree"]')?.classList.contains(
				'is-accent',
			),
		).toBe(true);
	});

	it('alt clicking the sort control restores name descending sort', () => {
		render();
		const sortBtn = target.querySelector<HTMLElement>('[aria-label="Sort"]')!;

		sortBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
		sortBtn.click();
		vi.advanceTimersByTime(260);
		flushSync();

		expect(target.querySelector('.vm-sort-popup [aria-label*="Name ↓"]')).not.toBeNull();
	});

	it('middle clicking the view control restores tree view', () => {
		render();
		const viewBtn = target.querySelector<HTMLElement>('[aria-label="View mode"]')!;

		viewBtn.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		viewBtn.click();
		vi.advanceTimersByTime(260);
		flushSync();

		expect(
			target.querySelector('.vm-viewmode-popup [aria-label="Tree"]')?.classList.contains(
				'is-accent',
			),
		).toBe(true);
	});

	it('middle clicking the sort control restores name descending sort', () => {
		render();
		const sortBtn = target.querySelector<HTMLElement>('[aria-label="Sort"]')!;

		sortBtn.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		sortBtn.click();
		vi.advanceTimersByTime(260);
		flushSync();

		expect(target.querySelector('.vm-sort-popup [aria-label*="Name ↓"]')).not.toBeNull();
	});
});
