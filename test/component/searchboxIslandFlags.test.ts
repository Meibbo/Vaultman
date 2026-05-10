import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';

function baseProps(service: FnRIslandService, overrides: Record<string, unknown> = {}) {
	return {
		activeTab: 'tags',
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
		...overrides,
	};
}

describe('searchbox island modifier toggles', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
	});

	function flag(kind: 'matchCase' | 'wholeWord' | 'regex'): HTMLButtonElement {
		const el = target.querySelector<HTMLButtonElement>(
			`.vm-filters-search-flag[data-flag="${kind}"]`,
		);
		expect(el, `flag ${kind}`).toBeTruthy();
		return el!;
	}

	function openSearchIsland(): void {
		const button = target.querySelector<HTMLElement>('[aria-label="Search"]');
		expect(button).toBeTruthy();
		button!.click();
		flushSync();
	}

	it('renders three flag buttons inside the searchbox island', () => {
		const service = new FnRIslandService();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();
		openSearchIsland();
		expect(target.querySelectorAll('.vm-filters-search-flag').length).toBe(3);
		// All three live inside the searchbox island root, not the outer toolbar.
		const wrap = target.querySelector('.vm-filters-header-search-wrap');
		expect(wrap?.contains(flag('matchCase'))).toBe(true);
		expect(wrap?.contains(flag('wholeWord'))).toBe(true);
		expect(wrap?.contains(flag('regex'))).toBe(true);
	});

	it('toggles matchCase / wholeWord / regex through the service', () => {
		const service = new FnRIslandService();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();
		openSearchIsland();

		flag('matchCase').click();
		flushSync();
		expect(service.snapshot().flags.matchCase).toBe(true);

		flag('wholeWord').click();
		flushSync();
		expect(service.snapshot().flags.wholeWord).toBe(true);
		expect(service.snapshot().flags.regex).toBe(false);
	});

	it('regex ON disables the wholeWord toggle (mutual exclusion)', () => {
		const service = new FnRIslandService();
		service.setFlag('wholeWord', true);
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();
		openSearchIsland();

		flag('regex').click();
		flushSync();

		const snap = service.snapshot();
		expect(snap.flags.regex).toBe(true);
		expect(snap.flags.wholeWord).toBe(false);

		const ww = flag('wholeWord');
		expect(ww.disabled).toBe(true);
		expect(ww.classList.contains('is-disabled')).toBe(true);
	});

	it('surfaces an inline error for unknown templating tokens and disables crear', () => {
		const service = new FnRIslandService();
		service.setQuery('hello {{bogus}}');
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service, { filtersSearch: 'hello {{bogus}}' }),
		});
		flushSync();
		openSearchIsland();

		const error = target.querySelector('.vm-filters-search-error');
		expect(error).toBeTruthy();
		expect(error!.textContent).toMatch(/Unknown token "bogus"/);
		expect(error!.getAttribute('data-error-kind')).toBe('token');

		const crear = target.querySelector<HTMLButtonElement>('.vm-filters-crear');
		expect(crear).toBeTruthy();
		expect(crear!.disabled).toBe(true);
	});

	it('surfaces a regex error when regex flag is on with invalid pattern', () => {
		const service = new FnRIslandService();
		service.setQuery('([)');
		service.setFlag('regex', true);
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service, { filtersSearch: '([)' }),
		});
		flushSync();
		openSearchIsland();

		const error = target.querySelector('.vm-filters-search-error');
		expect(error).toBeTruthy();
		expect(error!.getAttribute('data-error-kind')).toBe('regex');
		expect(error!.textContent).toMatch(/regex:/);

		const crear = target.querySelector<HTMLButtonElement>('.vm-filters-crear');
		expect(crear!.disabled).toBe(true);
	});
});
