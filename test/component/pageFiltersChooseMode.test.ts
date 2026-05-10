import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageFilters from '../../src/components/pages/pageFilters.svelte';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile } from '../helpers/obsidian-mocks';
import { createFiltersSearchState } from '../../src/components/frame/frameFiltersSearch';

function noopIndex() {
	return {
		nodes: [],
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

function plugin(): VaultmanPlugin {
	const baseFile = mockTFile('Dashboards/Projects.base');
	const visibleFile = mockTFile('Notes/visible.md');
	const hiddenFile = mockTFile('Notes/.secret.md');
	const hiddenConfigFile = mockTFile('.obsidian/snippets/theme.css');
	const app = mockApp({
		files: [baseFile, visibleFile, hiddenFile, hiddenConfigFile],
		adapterFiles: new Map([
			[
				'Dashboards/Projects.base',
				[
					'views:',
					'  - type: table',
					'    name: Open Projects',
					'    filters:',
					'      and:',
					'        - status == "open"',
				].join('\n'),
			],
		]),
	});
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = vi.fn(
		() => ({}),
	);

	return {
		app,
		settings: {
			filtersShowTabLabels: true,
			explorerOperationScope: 'filtered',
			explorerFilesShowHidden: false,
		},
		saveSettings: vi.fn(),
		filterService: {
			filteredFiles: [],
			selectedFiles: [],
			setSelectedFiles: vi.fn(),
			setFilter: vi.fn(),
			setSearchFilter: vi.fn(),
			clearSearchFilter: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		},
		filesIndex: noopIndex(),
		tagsIndex: noopIndex(),
		propsIndex: noopIndex(),
		contentIndex: Object.assign(noopIndex(), { setQuery: vi.fn() }),
		operationsIndex: noopIndex(),
		activeFiltersIndex: noopIndex(),
		queueService: {
			add: vi.fn(),
			remove: vi.fn(),
		},
		contextMenuService: {
			registerAction: vi.fn(),
			openPanelMenu: vi.fn(),
		},
		decorationManager: {
			decorate: vi.fn(() => ({ icons: [], badges: [], highlights: [] })),
			subscribe: vi.fn(() => vi.fn()),
		},
		viewService: {
			getModel: vi.fn(({ nodes }: { nodes: Array<{ id: string; label: string }> }) => ({
				rows: nodes.map((node) => ({
					id: node.id,
					label: node.label,
					icon: 'lucide-file',
					layers: [],
				})),
				columns: [],
				groups: [],
				selection: { ids: new Set() },
				focus: { id: null },
				sort: { id: 'manual', direction: 'asc' },
				search: { query: '' },
				virtualization: { rowHeight: 32, overscan: 5 },
				capabilities: {},
			})),
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
		iconicService: {
			getIcon: vi.fn(),
			getTagIcon: vi.fn(),
		},
	} as unknown as VaultmanPlugin;
}

describe('PageFilters Bases choose mode', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	it('forces files tab and disables other tabs while showing Bases import targets', async () => {
		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: plugin(),
				filtersActiveTab: 'props',
				filtersBaseChooseMode: true,
			},
		});
		flushSync();
		await Promise.resolve();
		await new Promise((resolve) => setTimeout(resolve, 0));
		flushSync();

		const filesTab = target.querySelector<HTMLElement>('[aria-label="Files"]');
		const propsTab = target.querySelector<HTMLElement>('[aria-label="Props"]');

		expect(filesTab?.classList.contains('is-active')).toBe(true);
		expect(propsTab?.getAttribute('aria-disabled')).toBe('true');
		expect(propsTab?.classList.contains('is-faint')).toBe(true);
		expect(target.textContent).toContain('Projects');
		expect(target.textContent).toContain('Open Projects');
	});

	it('wires plugin command hooks to the navbar view and sort menus', () => {
		const vm = plugin() as VaultmanPlugin & {
			openViewMenuHook?: (() => void) | null;
			openSortMenuHook?: (() => void) | null;
		};
		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'props',
			},
		});
		flushSync();

		expect(typeof vm.openViewMenuHook).toBe('function');
		expect(typeof vm.openSortMenuHook).toBe('function');

		vm.openViewMenuHook?.();
		flushSync();
		expect(target.querySelector('.vm-viewmode-popup')).toBeTruthy();

		vm.openSortMenuHook?.();
		flushSync();
		expect(target.querySelector('.vm-sort-popup')).toBeTruthy();
	});

	it('queues crear tag operations with scope-resolved files', () => {
		const vm = plugin();
		const searches = createFiltersSearchState();
		searches.tags = 'newtag';

		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'tags',
				filtersSearchByTab: searches,
				filtersOperationScope: 'filtered',
			},
		});
		flushSync();

		target.querySelector<HTMLButtonElement>('.vm-filters-crear')?.click();
		flushSync();

		expect(vm.queueService.add).toHaveBeenCalledOnce();
		const change = (vm.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change).toMatchObject({
			type: 'tag',
			action: 'add',
			tag: 'newtag',
		});
		expect(change.files).toEqual(vm.app.vault.getMarkdownFiles());
	});

	it('routes add-prop FnR submissions into scope-resolved queue changes', () => {
		const vm = plugin() as VaultmanPlugin & {
			activeFnRIslandService?: {
				setMode(mode: string): void;
				setQuery(query: string): void;
				submit(): void;
			} | null;
		};

		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'props',
				filtersOperationScope: 'filtered',
			},
		});
		flushSync();

		vm.activeFnRIslandService?.setMode('add-prop');
		vm.activeFnRIslandService?.setQuery('status: ready');
		vm.activeFnRIslandService?.submit();
		flushSync();

		expect(vm.queueService.add).toHaveBeenCalledOnce();
		const change = (vm.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change).toMatchObject({
			type: 'property',
			action: 'set',
			property: 'status',
			value: 'ready',
		});
		expect(change.files).toEqual(vm.app.vault.getMarkdownFiles());
	});

	it('wires prop.set context actions to the panel FnR island', () => {
		const vm = plugin() as VaultmanPlugin & {
			activeFnRIslandService?: { snapshot(): { mode: string; query: string; expanded: boolean } } | null;
		};

		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'props',
			},
		});
		flushSync();

		const action = (
			vm.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([candidate]) => candidate.id === 'prop.set')?.[0];
		expect(action).toBeTruthy();

		action.run({
			nodeType: 'prop',
			node: {
				id: 'status',
				label: 'status',
				depth: 0,
				meta: { propName: 'status', propType: 'text', isValueNode: false },
			},
			surface: 'panel',
		});
		flushSync();

		expect(vm.activeFnRIslandService?.snapshot()).toMatchObject({
			mode: 'add-prop',
			query: 'status: ',
			expanded: true,
		});
	});

	it('toggles dot-prefixed files from the Files sort menu and persists the setting', () => {
		const vm = plugin();

		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'files',
				filtersViewMode: 'tree',
			},
		});
		flushSync();

		expect(target.textContent).toContain('visible');
		expect(target.textContent).not.toContain('.secret');
		expect(target.textContent).not.toContain('.obsidian');

		(
			vm as VaultmanPlugin & {
				openSortMenuHook?: (() => void) | null;
			}
		).openSortMenuHook?.();
		flushSync();

		const hiddenToggle = target.querySelector<HTMLButtonElement>(
			'[aria-label="Show hidden files and folders"]',
		);
		expect(hiddenToggle).toBeTruthy();
		expect(hiddenToggle?.getAttribute('aria-pressed')).toBe('false');

		hiddenToggle?.click();
		flushSync();

		expect(vm.settings.explorerFilesShowHidden).toBe(true);
		expect(vm.saveSettings).toHaveBeenCalledOnce();
		expect(target.textContent).toContain('.secret');
		expect(target.textContent).toContain('.obsidian');
		expect(hiddenToggle?.getAttribute('aria-pressed')).toBe('true');
	});

	it('toggles manual DnD from the sort menu and persists the setting', () => {
		const vm = plugin();

		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'files',
				filtersViewMode: 'grid',
			},
		});
		flushSync();

		(
			vm as VaultmanPlugin & {
				openSortMenuHook?: (() => void) | null;
			}
		).openSortMenuHook?.();
		flushSync();

		const manualToggle = target.querySelector<HTMLButtonElement>('[data-vm-sort-manual-dnd]');
		expect(manualToggle).toBeTruthy();
		expect(manualToggle?.getAttribute('aria-pressed')).toBe('false');

		manualToggle?.click();
		flushSync();

		expect(vm.settings.manualDndEnabled).toBe(true);
		expect(vm.saveSettings).toHaveBeenCalledOnce();
		expect(manualToggle?.getAttribute('aria-pressed')).toBe('true');
		expect(target.querySelector('.vm-node-grid')?.classList.contains('is-manual-dnd')).toBe(true);
	});
});
