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

describe('Toolbar toolbar menu placement', () => {
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

	it('renders view + sort menus on the right side of the crear button with minimalist class', () => {
		const service = new FnRIslandService();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();

		const header = target.querySelector('.vm-filters-header');
		expect(header).toBeTruthy();

		const crear = header!.querySelector('.vm-filters-crear');
		const viewBtn = header!.querySelector('[aria-label="View mode"]');
		const sortBtn = header!.querySelector('[aria-label="Sort"]');

		expect(crear).toBeTruthy();
		expect(viewBtn).toBeTruthy();
		expect(sortBtn).toBeTruthy();

		const children = Array.from(header!.children);
		const crearIdx = children.findIndex((node) => node.contains(crear!));
		const viewIdx = children.findIndex((node) => node.contains(viewBtn!));
		const sortIdx = children.findIndex((node) => node.contains(sortBtn!));

		expect(crearIdx).toBeGreaterThanOrEqual(0);
		expect(viewIdx).toBeGreaterThan(crearIdx);
		expect(sortIdx).toBeGreaterThan(crearIdx);

		// minimalist class applied to the menu container/buttons.
		const minimalist = header!.querySelector('.vm-toolbar-menu-min');
		expect(minimalist).toBeTruthy();
		expect(minimalist!.contains(viewBtn!) || minimalist!.contains(sortBtn!)).toBe(true);
	});

	it('renders search and node expansion commands in the toolbar button cluster', () => {
		const service = new FnRIslandService();
		const onToggleNodeExpansion = vi.fn();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service, {
				nodeExpansionSummary: { canToggle: true, hasExpandedParents: false },
				onToggleNodeExpansion,
			}),
		});
		flushSync();

		const search = target.querySelector<HTMLElement>('[aria-label="Search"]');
		const expansion = target.querySelector<HTMLElement>('[data-vm-toolbar-node-expansion]');
		expect(search).toBeTruthy();
		expect(expansion).toBeTruthy();

		search!.click();
		flushSync();
		expect(target.querySelector('.vm-filters-header-search-wrap')).toBeTruthy();

		expansion!.click();
		expect(onToggleNodeExpansion).toHaveBeenCalledOnce();
	});

	it('keeps search syntax help inside the searchbox instead of beside the toolbar FABs', () => {
		const service = new FnRIslandService();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();

		target.querySelector<HTMLElement>('[aria-label="Search"]')!.click();
		flushSync();

		const searchWrap = target.querySelector('.vm-filters-header-search-wrap');
		const toolbar = target.querySelector('.vm-toolbar-menu-min');
		const help = target.querySelector('.vm-filters-search-help');

		expect(searchWrap).toBeTruthy();
		expect(toolbar).toBeTruthy();
		expect(help).toBeTruthy();
		expect(searchWrap!.contains(help!)).toBe(true);
		expect(toolbar!.contains(help!)).toBe(false);
	});

	it('uses concise props search category labels while starting in all mode', () => {
		const service = new FnRIslandService();
		const filtersSearchCategory = { tags: 0, props: 0, files: 0, content: 0 };
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service, {
				activeTab: 'props',
				filtersSearchCategory,
			}),
		});
		flushSync();

		const search = target.querySelector<HTMLElement>('[aria-label="Search"]');
		expect(search).toBeTruthy();
		search!.click();
		flushSync();

		const category = target.querySelector<HTMLButtonElement>('.vm-filters-search-mode.has-label');
		expect(category).toBeTruthy();
		expect(category!.textContent?.trim()).toBe('Props');
		expect(filtersSearchCategory.props).toBe(0);

		category!.click();
		flushSync();

		expect(category!.textContent?.trim()).toBe('Values');
	});
});
