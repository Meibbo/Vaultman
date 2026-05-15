import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ContentTab from '../../src/components/pages/tabContent.svelte';
import ExplorerQueue from '../../src/components/containers/explorerQueue.svelte';
import ExplorerActiveFilters from '../../src/components/containers/explorerActiveFilters.svelte';
import { FoulDetectionService } from '../../src/services/serviceFoulDetection.svelte';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type {
	ActiveFilterEntry,
	ContentMatch,
	INodeIndex,
	QueueChange,
} from '../../src/types/typeContracts';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile, type TFile } from '../helpers/obsidian-mocks';

class MutableIndex<TNode extends { id: string }> implements INodeIndex<TNode> {
	private current: TNode[] = [];
	private subs = new Set<() => void>();
	private currentRevision = 0;

	get nodes(): readonly TNode[] {
		return this.current;
	}

	get flatIds(): readonly string[] {
		return this.current.map((node) => node.id);
	}

	get revision(): number {
		return this.currentRevision;
	}

	async refresh(): Promise<void> {
		this.emit(this.current);
	}

	subscribe(cb: () => void): () => void {
		this.subs.add(cb);
		return () => this.subs.delete(cb);
	}

	byId(id: string): TNode | undefined {
		return this.current.find((node) => node.id === id);
	}

	getSearchBuffer(id: string): string {
		return this.byId(id)?.id.toLowerCase() ?? '';
	}

	emit(nodes: TNode[]): void {
		this.current = nodes;
		this.currentRevision += 1;
		for (const cb of this.subs) cb();
	}
}

function queueChange(id: string): QueueChange {
	return {
		id,
		group: 'property',
		change: {
			id,
			type: 'property',
			action: 'set',
			property: 'status',
			value: 'draft',
			details: `Set status ${id}`,
			files: [],
			customLogic: true,
			logicFunc: () => null,
		},
	};
}

describe('reactive explorer components', () => {
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

	it('updates Content tab when contentIndex refreshes after a query', () => {
		const file = mockTFile('note.md') as TFile;
		const contentIndex = new MutableIndex<ContentMatch>();
		const plugin = {
			app: mockApp({ files: [file] }),
			contentIndex: Object.assign(contentIndex, { setQuery: vi.fn() }),
			filterService: {
				filteredFiles: [file],
				selectedFiles: [],
			},
			queueService: {
				add: vi.fn(),
				remove: vi.fn(),
			},
			operationsIndex: new MutableIndex<QueueChange>(),
			activeFiltersIndex: new MutableIndex<ActiveFilterEntry>(),
			viewService: new ViewService(),
			propertyIndex: { fileCount: 1 },
			contextMenuService: { openPanelMenu: vi.fn() },
		} as unknown as VaultmanPlugin;

		app = mount(ContentTab as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin, query: 'needle' },
		});
		flushSync();

		contentIndex.emit([
			{
				id: 'note.md:2:4',
				filePath: 'note.md',
				line: 2,
				before: 'before ',
				match: 'needle',
				after: ' after',
			},
		]);
		flushSync();

		expect(target.textContent).toContain('note.md');
		expect(target.textContent).toContain('3: before needle after');
		expect(target.textContent).toContain('needle');
	});

	it('renders reactive content search progress while results arrive incrementally', () => {
		const file = mockTFile('note.md') as TFile;
		const contentIndex = Object.assign(new MutableIndex<ContentMatch>(), {
			setQuery: vi.fn(),
			status: {
				query: 'needle',
				phase: 'scanning',
				scanned: 1,
				total: 3,
				resultCount: 1,
			},
		});
		const plugin = {
			app: mockApp({ files: [file] }),
			contentIndex,
			filterService: {
				filteredFiles: [file],
				selectedFiles: [],
			},
			queueService: {
				add: vi.fn(),
				remove: vi.fn(),
			},
			operationsIndex: new MutableIndex<QueueChange>(),
			activeFiltersIndex: new MutableIndex<ActiveFilterEntry>(),
			viewService: new ViewService(),
			propertyIndex: { fileCount: 1 },
			contextMenuService: { openPanelMenu: vi.fn() },
		} as unknown as VaultmanPlugin;

		app = mount(ContentTab as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin, query: 'needle' },
		});
		contentIndex.emit([
			{
				id: 'note.md:2:4',
				filePath: 'note.md',
				line: 2,
				before: 'before ',
				match: 'needle',
				after: ' after',
			},
		]);
		flushSync();

		expect(target.querySelector('[data-vm-content-search-status]')?.textContent).toContain(
			'Searching',
		);
		expect(target.querySelector('[data-vm-content-search-status]')?.textContent).toContain(
			'1 / 3',
		);
		expect(target.querySelector('[data-vm-content-search-status]')?.textContent).toContain(
			'1 result',
		);
		expect(target.textContent).toContain('note.md');
	});

	it('keeps the Content tab explorer mounted while incremental results arrive', () => {
		const file = mockTFile('note.md') as TFile;
		const contentIndex = new MutableIndex<ContentMatch>();
		const plugin = {
			app: mockApp({ files: [file] }),
			contentIndex: Object.assign(contentIndex, { setQuery: vi.fn() }),
			filterService: {
				filteredFiles: [file],
				selectedFiles: [],
			},
			queueService: {
				add: vi.fn(),
				remove: vi.fn(),
			},
			operationsIndex: new MutableIndex<QueueChange>(),
			activeFiltersIndex: new MutableIndex<ActiveFilterEntry>(),
			viewService: new ViewService(),
			propertyIndex: { fileCount: 1 },
			contextMenuService: { openPanelMenu: vi.fn() },
		} as unknown as VaultmanPlugin;

		app = mount(ContentTab as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin, query: 'needle' },
		});
		contentIndex.emit([
			{
				id: 'note.md:2:4',
				filePath: 'note.md',
				line: 2,
				before: 'before ',
				match: 'needle',
				after: ' after',
			},
		]);
		flushSync();
		const firstExplorer = target.querySelector('.vm-panel-explorer');
		expect(firstExplorer).toBeTruthy();

		contentIndex.emit([
			...(contentIndex.nodes as ContentMatch[]),
			{
				id: 'note.md:5:0',
				filePath: 'note.md',
				line: 5,
				before: '',
				match: 'needle',
				after: ' again',
			},
		]);
		flushSync();

		expect(target.querySelector('.vm-panel-explorer')).toBe(firstExplorer);
		expect(target.textContent).toContain('6: needle again');
	});

	it('queues a content find and replace operation from the Content tab inputs', () => {
		const file = mockTFile('note.md') as TFile;
		const contentIndex = new MutableIndex<ContentMatch>();
		const queueAdd = vi.fn();
		const plugin = {
			app: mockApp({ files: [file] }),
			contentIndex: Object.assign(contentIndex, { setQuery: vi.fn() }),
			filterService: {
				filteredFiles: [file],
				selectedFiles: [],
			},
			queueService: {
				add: queueAdd,
			},
			operationsIndex: new MutableIndex<QueueChange>(),
			activeFiltersIndex: new MutableIndex<ActiveFilterEntry>(),
			viewService: new ViewService(),
			propertyIndex: { fileCount: 1 },
			contextMenuService: { openPanelMenu: vi.fn() },
		} as unknown as VaultmanPlugin;

		app = mount(ContentTab as unknown as Component<{ plugin: VaultmanPlugin; query: string }>, {
			target,
			props: { plugin, query: 'needle' },
		});
		flushSync();

		// The Content tab now exposes a single input that toggles between
		// search and replace via the mode pill; click the pill to switch.
		const modePill = target.querySelector<HTMLButtonElement>('.vm-content-fnr-modepill');
		expect(modePill).toBeTruthy();
		modePill!.click();
		flushSync();

		const replaceInput = target.querySelector<HTMLInputElement>(
			'input[aria-label="Replace with…"]',
		);
		expect(replaceInput).toBeTruthy();
		replaceInput!.value = 'thread';
		replaceInput!.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		const queueButton = [...target.querySelectorAll('button')].find((button) =>
			button.textContent?.includes('Queue replace'),
		) as HTMLButtonElement | undefined;
		expect(queueButton).toBeTruthy();
		queueButton!.click();
		flushSync();

		expect(queueAdd).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'content_replace',
				find: 'needle',
				replace: 'thread',
				files: [file],
			}),
		);
	});

	it('updates Queue island when operationsIndex refreshes', () => {
		const operationsIndex = new MutableIndex<QueueChange>();
		const plugin = {
			operationsIndex,
			queueService: {
				remove: vi.fn(),
				clear: vi.fn(),
				execute: vi.fn(async () => undefined),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerQueue as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		operationsIndex.emit([
			{
				id: 'op-1',
				group: 'property',
				change: {
					id: 'op-1',
					type: 'property',
					action: 'set',
					details: 'Set status',
					files: [],
					customLogic: true,
					logicFunc: () => null,
				},
			},
		]);
		flushSync();

		expect(target.textContent).toContain('Set status');
		expect(target.textContent).toContain('set');
		expect(target.querySelector('[data-id="queue-action:set"]')).toBeTruthy();
	});

	it('presents queue groups as parent rows and queued changes as plain child rows', () => {
		const operationsIndex = new MutableIndex<QueueChange>();
		const remove = vi.fn();
		const plugin = {
			operationsIndex,
			queueService: {
				remove,
				clear: vi.fn(),
				execute: vi.fn(async () => undefined),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerQueue as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		operationsIndex.emit([
			{
				id: 'op-1',
				group: 'property',
				change: {
					id: 'op-1',
					type: 'property',
					action: 'delete',
					property: 'status',
					oldValue: 'draft',
					details: 'Delete status value',
					files: [],
					customLogic: true,
					logicFunc: () => null,
				},
			},
		]);
		flushSync();

		const parent = target.querySelector<HTMLElement>('[data-id="queue-action:delete"]');
		const child = target.querySelector<HTMLElement>('[data-id="op-1"]');
		expect(parent).toBeTruthy();
		expect(child).toBeTruthy();
		expect(parent!.classList.contains('is-queue-parent')).toBe(true);
		expect(child!.classList.contains('is-queue-child')).toBe(true);
		expect(parent!.querySelector('.vm-view-list-icon')).toBeTruthy();
		expect(parent!.querySelector('.vm-view-list-badges')?.textContent).toContain('1');
		expect(child!.querySelector('.vm-view-list-label')?.textContent).toBe('value');
		expect(child!.querySelector('.vm-view-list-icon')).toBeNull();
		expect(child!.querySelector('.vm-view-list-badges')).toBeNull();

		const cancel = child!.querySelector<HTMLButtonElement>('button[aria-label="Remove queued change"]');
		expect(cancel).toBeTruthy();
		expect(cancel!.classList.contains('is-inline-cancel')).toBe(true);
		expect(child!.querySelector('.vm-view-list-actions')?.classList.contains('is-counter-slot')).toBe(
			true,
		);
		cancel!.click();
		expect(remove).toHaveBeenCalledWith('op-1');
	});

	it('renders 1000 queue ops without devirtualizing the list', () => {
		const operationsIndex = new MutableIndex<QueueChange>();
		const plugin = {
			operationsIndex,
			queueService: {
				remove: vi.fn(),
				clear: vi.fn(),
				execute: vi.fn(async () => undefined),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerQueue as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		operationsIndex.emit(Array.from({ length: 1000 }, (_, index) => queueChange(`op-${index}`)));
		flushSync();

		const renderedRows = target.querySelectorAll('.vm-view-list-row[data-id]');
		expect(renderedRows.length).toBeGreaterThan(0);
		expect(renderedRows.length).toBeLessThan(50);
		expect(target.textContent).toContain('Set status op-0');
	});

	it('foul-detection leaves queue rendering clean under thin native mode', () => {
		target.remove();
		const root = document.createElement('div');
		root.classList.add('vm-root', 'vm-mode-thin', 'vm-id-native');
		root.appendChild(target);
		document.body.appendChild(root);
		const operationsIndex = new MutableIndex<QueueChange>();
		const plugin = {
			operationsIndex,
			queueService: {
				remove: vi.fn(),
				clear: vi.fn(),
				execute: vi.fn(async () => undefined),
			},
		} as unknown as VaultmanPlugin;
		const foulDetection = new FoulDetectionService();
		foulDetection.enabled = true;

		app = mount(ExplorerQueue as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();
		operationsIndex.emit([queueChange('op-1')]);
		flushSync();

		foulDetection.checkDomMimicry(root);

		expect(foulDetection.fouls.filter((foul) => foul.kind === 'dom-mimicry')).toHaveLength(0);
		root.remove();
	});

	it('renders the Queue island toolbar without a redundant close squircle', () => {
		const operationsIndex = new MutableIndex<QueueChange>();
		const plugin = {
			operationsIndex,
			queueService: {
				remove: vi.fn(),
				clear: vi.fn(),
				execute: vi.fn(async () => undefined),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerQueue as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin, onClose: vi.fn() },
		});
		flushSync();

		const buttons = target.querySelectorAll('.vm-popup-squircles .vm-squircle');
		expect(buttons).toHaveLength(4);
		expect(target.querySelector('[aria-label="Close"]')).toBeNull();
	});

	it('updates Active Filters island when activeFiltersIndex refreshes', () => {
		const activeFiltersIndex = new MutableIndex<ActiveFilterEntry>();
		const plugin = {
			activeFiltersIndex,
			filterService: {
				filteredFiles: [],
				removeNode: vi.fn(),
				clearFilters: vi.fn(),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerActiveFilters as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		activeFiltersIndex.emit([
			{
				id: 'rule-1',
				rule: {
					id: 'rule-1',
					type: 'rule',
					filterType: 'has_property',
					property: 'status',
					values: [],
					enabled: true,
				},
			},
		]);
		flushSync();

		expect(target.textContent).toContain('has: status');
	});

	it('removes active filter rows through the list action', () => {
		const activeFiltersIndex = new MutableIndex<ActiveFilterEntry>();
		const removeNode = vi.fn();
		const rule = {
			id: 'rule-1',
			type: 'rule' as const,
			filterType: 'has_property' as const,
			property: 'status',
			values: [],
			enabled: true,
		};
		const plugin = {
			activeFiltersIndex,
			filterService: {
				filteredFiles: [],
				selectedFiles: [],
				removeNode,
				clearFilters: vi.fn(),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerActiveFilters as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		activeFiltersIndex.emit([{ id: 'rule-1', kind: 'rule', rule } as ActiveFilterEntry]);
		flushSync();

		target.querySelector<HTMLButtonElement>('button[aria-label="Remove filter"]')?.click();
		flushSync();

		expect(removeNode).toHaveBeenCalledWith(rule);
	});

	it('adds visible logic groups through serviceGroups from the Active Filters island', () => {
		const activeFiltersIndex = new MutableIndex<ActiveFilterEntry>();
		const addNode = vi.fn();
		const plugin = {
			activeFiltersIndex,
			filterService: {
				filteredFiles: [],
				removeNode: vi.fn(),
				clearFilters: vi.fn(),
				addNode,
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerActiveFilters as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		target.querySelector<HTMLButtonElement>('[aria-label="Add logic group"]')?.click();
		flushSync();

		expect(addNode).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'group',
				kind: 'logic_group',
				logic: 'and',
				label: 'Group',
				enabled: true,
				children: [],
			}),
		);
	});

	it('reorders active filter rows inside the same parent via list drag and drop', () => {
		const activeFiltersIndex = new MutableIndex<ActiveFilterEntry>();
		const root = {
			id: 'root',
			type: 'group' as const,
			logic: 'and' as const,
			children: [
				{
					id: 'rule-a',
					type: 'rule' as const,
					filterType: 'has_property' as const,
					property: 'alpha',
					values: [],
				},
				{
					id: 'rule-b',
					type: 'rule' as const,
					filterType: 'has_property' as const,
					property: 'beta',
					values: [],
				},
			],
		};
		const setFilter = vi.fn();
		const plugin = {
			activeFiltersIndex,
			filterService: {
				activeFilter: root,
				filteredFiles: [],
				removeNode: vi.fn(),
				clearFilters: vi.fn(),
				addNode: vi.fn(),
				setFilter,
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerActiveFilters as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		activeFiltersIndex.emit([
			{ id: 'rule-a', kind: 'rule', rule: root.children[0], parent: root, depth: 0 },
			{ id: 'rule-b', kind: 'rule', rule: root.children[1], parent: root, depth: 0 },
		] as ActiveFilterEntry[]);
		flushSync();

		target
			.querySelector<HTMLElement>('[data-id="rule-b"]')
			?.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
		target
			.querySelector<HTMLElement>('[data-id="rule-a"]')
			?.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
		flushSync();

		expect(root.children.map((child) => child.id)).toEqual(['rule-b', 'rule-a']);
		expect(setFilter).toHaveBeenCalledWith(expect.objectContaining({ id: 'root' }));
	});

	it('shows active filters import/export flyout from the toolbar', () => {
		const activeFiltersIndex = new MutableIndex<ActiveFilterEntry>();
		const onImportBases = vi.fn();
		const plugin = {
			activeFiltersIndex,
			filterService: {
				filteredFiles: [],
				removeNode: vi.fn(),
				clearFilters: vi.fn(),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerActiveFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, onImportBases },
		});
		flushSync();

		expect(target.querySelectorAll('.vm-squircle')).toHaveLength(4);

		const importExport = target.querySelector<HTMLButtonElement>('[aria-label="Import/export"]');
		expect(importExport).toBeTruthy();
		importExport!.click();
		flushSync();

		expect(target.textContent).toContain('Import');
		expect(target.textContent).toContain('Export');
		expect(target.querySelector<HTMLButtonElement>('[aria-label="Export filters"]')?.disabled).toBe(
			true,
		);

		target.querySelector<HTMLButtonElement>('[aria-label="Import Bases filters"]')?.click();
		flushSync();

		expect(onImportBases).toHaveBeenCalledOnce();
	});

	it('declares active filters import actions pointer-clickable inside popup chrome', () => {
		const source = readFileSync('src/styles/components/_explorer-ui.scss', 'utf8');
		expect(source).toMatch(/\.vm-import-export-flyout-action\s*\{[\s\S]*?pointer-events:\s*auto;/);
	});

	it('does not reuse the tab-pane visibility class inside the Content tab body', () => {
		const source = readFileSync('src/components/pages/tabContent.svelte', 'utf8');

		expect(source).not.toContain('<div class="vm-tab-content">');
		expect(source).toContain('<div class="vm-content-tab">');
	});

	it('does not animate tab pane activation with opacity transitions', () => {
		const source = readFileSync('src/styles/nav/_tab-bar.scss', 'utf8');
		const tabContentBlock = source.match(/&-content\s*\{[\s\S]*?\n\t\}/)?.[0] ?? '';

		expect(tabContentBlock).not.toMatch(/transition:\s*opacity/);
	});
});
