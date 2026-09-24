import { describe, expect, it, vi } from 'vitest';
import {
	ActiveFiltersIslandComponent,
	buildExplorerSelectedSnapshot,
	clearExplorerSelection,
	type SelectedNodeItem,
	type SelectedNodesSnapshot,
} from '../../src/components/layout/islandActiveFilters';
import type { VaultmanPlugin } from '../../src/main';

describe('U130-GGC-030 — FilterScene node_filters / node_selected squircle toggle', () => {
	function createMockPlugin() {
		return {
			app: {
				vault: {
					getFiles: () => [{ path: 'note1.md' }, { path: 'note2.md' }],
				},
			},
			filterService: {
				getFlatRules: vi.fn(() => [
					{
						id: 'rule-1',
						rule: 'path:startsWith',
						label: 'Folder notes',
						description: 'Matches notes in folder',
						enabled: true,
					},
				]),
				filteredVaultFiles: [{ path: 'note1.md' }],
				clearFilters: vi.fn(),
				toggleFilterRule: vi.fn(),
				deleteFilterRule: vi.fn(),
			},
		} as unknown as VaultmanPlugin;
	}

	function createMockElement(cls = '', attr: Record<string, string> = {}) {
		const el: any = {
			cls,
			attributes: new Map<string, string>(Object.entries(attr)),
			classes: new Set<string>(cls.split(' ').filter(Boolean)),
			innerText: '',
			setAttribute(k: string, v: string) {
				this.attributes.set(k, v);
			},
			getAttribute(k: string) {
				return this.attributes.get(k) ?? null;
			},
			addClass(c: string) {
				this.classes.add(c);
			},
			removeClass(c: string) {
				this.classes.delete(c);
			},
			toggleClass(c: string, force?: boolean) {
				const next = force !== undefined ? force : !this.classes.has(c);
				if (next) this.classes.add(c);
				else this.classes.delete(c);
			},
			empty: vi.fn(),
			setText(t: string) {
				this.innerText = t;
			},
			createEl: vi.fn(() => createMockElement()),
			createDiv: vi.fn((opts?: { cls?: string; attr?: Record<string, string> }) =>
				createMockElement(opts?.cls ?? '', opts?.attr ?? {}),
			),
			createSpan: vi.fn((opts?: { cls?: string; text?: string }) => {
				const span = createMockElement(opts?.cls ?? '');
				span.innerText = opts?.text ?? '';
				return span;
			}),
			addEventListener: vi.fn(),
			remove: vi.fn(),
		};
		return el;
	}

	function createMockContainer() {
		const container = createMockElement();
		return { container: container as unknown as HTMLElement };
	}

	it('mounts with default filters view and aria-pressed=false', () => {
		const plugin = createMockPlugin();
		const { container } = createMockContainer();
		const onClose = vi.fn();

		const island = new ActiveFiltersIslandComponent(container, plugin, onClose);
		island.mount();

		expect(island.getViewMode()).toBe('filters');
	});

	it('toggles view between filters and selected nodes', () => {
		const plugin = createMockPlugin();
		const { container } = createMockContainer();
		const onClose = vi.fn();

		const selectedRows: SelectedNodeItem[] = [
			{ id: 'file:doc1.md', label: 'Document 1', scene: 'files' },
			{ id: 'file:doc2.md', label: 'Document 2', scene: 'files' },
		];

		const island = new ActiveFiltersIslandComponent(
			container,
			plugin,
			onClose,
			() => [],
			vi.fn(),
			() => ({ filtered: 1, total: 2 }),
			() => selectedRows,
		);
		island.mount();

		expect(island.getViewMode()).toBe('filters');

		// Toggle to selected view
		island.toggleViewMode();
		expect(island.getViewMode()).toBe('selected');

		// Toggle back to filters view
		island.toggleViewMode();
		expect(island.getViewMode()).toBe('filters');
	});

	it('renders selected nodes view with count and empty state', () => {
		const plugin = createMockPlugin();
		const { container } = createMockContainer();
		let selectedRows: SelectedNodeItem[] = [];

		const island = new ActiveFiltersIslandComponent(
			container,
			plugin,
			vi.fn(),
			() => [],
			vi.fn(),
			() => ({ filtered: 0, total: 2 }),
			() => selectedRows,
		);
		island.mount();

		island.toggleViewMode('selected');
		expect(island.getViewMode()).toBe('selected');

		// Update rows
		const deselectSpy = vi.fn();
		selectedRows = [
			{ id: 'prop:status', label: 'Status', scene: 'props', deselect: deselectSpy },
		];
		island.render();
		expect(island.getViewMode()).toBe('selected');
	});

	it('clearing in selected view invokes onClearSelection callback', () => {
		const plugin = createMockPlugin();
		const { container } = createMockContainer();
		const onClearSelectionSpy = vi.fn();
		const onClearAllFiltersSpy = vi.fn();

		const selectedRows: SelectedNodeItem[] = [
			{ id: 'tag:todo', label: '#todo', scene: 'tags' },
		];

		const island = new ActiveFiltersIslandComponent(
			container,
			plugin,
			vi.fn(),
			() => [],
			onClearAllFiltersSpy,
			() => ({ filtered: 1, total: 2 }),
			() => selectedRows,
			onClearSelectionSpy,
		);
		island.mount();

		// In filters mode: clear calls onClearAll
		const clearBtn = (island as any).clearAllBtn;
		expect(clearBtn).toBeDefined();

		// Switch to selected mode
		island.toggleViewMode('selected');

		// Simulate clear click in selected mode
		const clickHandler = clearBtn.addEventListener.mock.calls.find(
			(call: [string, ...any[]]) => call[0] === 'click',
		)?.[1];
		expect(clickHandler).toBeDefined();
		clickHandler();

		expect(onClearSelectionSpy).toHaveBeenCalledTimes(1);
		expect(onClearAllFiltersSpy).not.toHaveBeenCalled();
	});

	it('isolated snapshot: Scene A selection does not leak into Scene B', () => {
		const plugin = createMockPlugin();
		const { container: containerA } = createMockContainer();
		const { container: containerB } = createMockContainer();

		const snapshotA: SelectedNodesSnapshot = {
			scene: 'props',
			instanceId: 'inst-A',
			revision: 1,
			rows: [{ id: 'prop:p1', label: 'Prop 1', scene: 'props' }],
		};

		const snapshotB: SelectedNodesSnapshot = {
			scene: 'files',
			instanceId: 'inst-B',
			revision: 1,
			rows: [],
		};

		const islandA = new ActiveFiltersIslandComponent(
			containerA,
			plugin,
			vi.fn(),
			() => [],
			vi.fn(),
			() => ({ filtered: 1, total: 2 }),
			() => snapshotA,
		);
		const islandB = new ActiveFiltersIslandComponent(
			containerB,
			plugin,
			vi.fn(),
			() => [],
			vi.fn(),
			() => ({ filtered: 1, total: 2 }),
			() => snapshotB,
		);

		islandA.mount();
		islandB.mount();

		islandA.toggleViewMode('selected');
		islandB.toggleViewMode('selected');

		expect((islandA as any).getSelectedRows()).toHaveLength(1);
		expect((islandB as any).getSelectedRows()).toHaveLength(0);
	});

	it('buildExplorerSelectedSnapshot builds snapshot for files scene with paths and folder labels', () => {
		const applyFn = vi.fn();
		const mockFilesExplorer = {
			selectedFilePaths: new Set(['folder:work/project', 'notes/todo.md']),
			_applyFileSelection: applyFn,
			_selectionKey: () => 'inst-1:files:files',
		};

		const snapshot = buildExplorerSelectedSnapshot('files', 'inst-1', mockFilesExplorer);

		expect(snapshot.scene).toBe('files');
		expect(snapshot.instanceId).toBe('inst-1');
		expect(snapshot.rows).toHaveLength(2);
		expect(snapshot.rows[0].id).toBe('folder:work/project');
		expect(snapshot.rows[0].label).toBe('project');
		expect(snapshot.rows[1].id).toBe('notes/todo.md');
		expect(snapshot.rows[1].label).toBe('todo.md');

		// Deselecting the second item
		snapshot.rows[1].deselect?.();
		expect(applyFn).toHaveBeenCalledWith({
			selectedPaths: new Set(['folder:work/project']),
			anchorPath: null,
		});
	});

	it('buildExplorerSelectedSnapshot falls back to getSelectedFiles when selectedFilePaths is empty', () => {
		const mockFilesExplorer = {
			selectedFilePaths: new Set<string>(),
			getSelectedFiles: () => [
				{ path: 'doc.md', basename: 'doc', name: 'doc.md' },
			],
			_selectionKey: () => 'inst-1:files:files',
		};

		const snapshot = buildExplorerSelectedSnapshot('files', 'inst-1', mockFilesExplorer);
		expect(snapshot.rows).toHaveLength(1);
		expect(snapshot.rows[0].id).toBe('doc.md');
		expect(snapshot.rows[0].label).toBe('doc');
	});

	it('buildExplorerSelectedSnapshot builds snapshot for props scene with deselect', () => {
		const applyPropFn = vi.fn();
		const mockPropsExplorer = {
			selectedNodeIds: new Set(['status', 'tags']),
			_applyPropSelection: applyPropFn,
			_selectionKey: () => 'inst-1:props:props',
		};

		const snapshot = buildExplorerSelectedSnapshot('props', 'inst-1', mockPropsExplorer);
		expect(snapshot.scene).toBe('props');
		expect(snapshot.rows).toHaveLength(2);
		expect(snapshot.rows[0].id).toBe('status');
		expect(snapshot.rows[1].id).toBe('tags');

		snapshot.rows[0].deselect?.();
		expect(applyPropFn).toHaveBeenCalledWith(new Set(['tags']));
	});

	it('buildExplorerSelectedSnapshot builds snapshot for tags scene with hashtag prefix', () => {
		const mockTagsExplorer = {
			selectedNodeIds: new Set(['inbox', '#active']),
			_touchSelection: vi.fn(),
			_render: vi.fn(),
			_selectionKey: () => 'inst-1:tags:tags',
		};

		const snapshot = buildExplorerSelectedSnapshot('tags', 'inst-1', mockTagsExplorer);
		expect(snapshot.scene).toBe('tags');
		expect(snapshot.rows).toHaveLength(2);
		expect(snapshot.rows[0].label).toBe('#inbox');
		expect(snapshot.rows[1].label).toBe('#active');

		snapshot.rows[0].deselect?.();
		expect(mockTagsExplorer.selectedNodeIds).toEqual(new Set(['#active']));
		expect(mockTagsExplorer._touchSelection).toHaveBeenCalled();
		expect(mockTagsExplorer._render).toHaveBeenCalled();
	});

	it('buildExplorerSelectedSnapshot returns empty snapshot for null/undefined explorer', () => {
		const snapshot = buildExplorerSelectedSnapshot('files', 'inst-1', null);
		expect(snapshot.scene).toBe('files');
		expect(snapshot.instanceId).toBe('inst-1');
		expect(snapshot.rows).toEqual([]);
	});

	it('clearExplorerSelection calls clearSelection on explorer if available', () => {
		const clearFn = vi.fn();
		const mockExplorer = { clearSelection: clearFn };

		clearExplorerSelection(mockExplorer);
		expect(clearFn).toHaveBeenCalledTimes(1);

		// Safe with null/undefined
		expect(() => clearExplorerSelection(null)).not.toThrow();
		expect(() => clearExplorerSelection({})).not.toThrow();
	});
});
