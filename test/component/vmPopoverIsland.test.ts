import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount, type Component } from 'svelte';
import vmPopover from '../../src/components/overlays/vmPopover.svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';

const popoverBody = createRawSnippet(() => ({
	render: () => '<span data-vm-popover-body>Find body</span>',
}));

describe('vmPopover', () => {
	let host: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
		const root = document.createElement('div');
		root.classList.add('vm-root');
		host.appendChild(root);
	});

	afterEach(() => {
		if (app) void unmount(app);
		host.remove();
	});

	it('renders open popover content into the local .vm-root portal target', () => {
		app = mount(vmPopover as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: { open: true, triggerLabel: 'Find', children: popoverBody },
		});
		flushSync();

		const root = host.querySelector('.vm-root');
		expect(root?.querySelector('[data-vm-popover-body]')?.textContent).toBe('Find body');
	});

	it('opens when the trigger is clicked', () => {
		app = mount(vmPopover as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: { open: false, triggerLabel: 'Find', children: popoverBody },
		});
		flushSync();

		host.querySelector<HTMLButtonElement>('.vm-btn-find')?.click();
		flushSync();

		expect(host.querySelector('[data-vm-popover-body]')).toBeTruthy();
	});
});

function toolbarProps(service: FnRIslandService) {
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
	};
}

describe('Toolbar Find/Replace vmPopover migration', () => {
	let host: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
		const root = document.createElement('div');
		root.classList.add('vm-root');
		host.appendChild(root);
	});

	afterEach(() => {
		if (app) void unmount(app);
		host.remove();
	});

	it('renders the expanded FnR island inside the local vmPopover portal', () => {
		const service = new FnRIslandService();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: toolbarProps(service),
		});
		flushSync();

		service.expand();
		flushSync();

		const portal = host.querySelector('.vm-root .vm-popover-content');
		expect(portal).toBeTruthy();
		expect(portal?.querySelector('.vm-filters-header-search-wrap')).toBeTruthy();
		expect(portal?.querySelector<HTMLButtonElement>('.vm-filters-search-modepill')?.dataset.mode).toBe(
			'search',
		);
	});

	it('closes the vmPopover when the service collapses a trigger-open replace island', () => {
		const service = new FnRIslandService();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: toolbarProps(service),
		});
		flushSync();

		const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Search"]');
		expect(trigger).toBeTruthy();
		trigger!.click();
		flushSync();
		expect(host.querySelector('.vm-root .vm-popover-content')).toBeTruthy();

		service.setMode('replace');
		service.expand();
		flushSync();
		expect(trigger!.getAttribute('aria-pressed')).toBe('true');

		service.collapse();
		flushSync();

		expect(service.snapshot().expanded).toBe(false);
		expect(trigger!.getAttribute('aria-pressed')).toBe('false');
		expect(host.querySelector('.vm-root .vm-popover-content')?.getAttribute('data-state')).not.toBe(
			'open',
		);
	});
});
