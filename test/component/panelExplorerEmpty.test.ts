import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import { clearActivePerfProbe, createPerfProbe, setActivePerfProbe } from '../../src/dev/perfProbe';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerProvider, ExplorerViewMode } from '../../src/types/typeExplorer';
import type { TreeNode } from '../../src/types/typeNode';
import type { ViewEmptyState } from '../../src/types/typeViews';
import { mockTFile } from '../helpers/obsidian-mocks';

function plugin(): VaultmanPlugin {
	return {
		app: {},
		propertyIndex: { fileCount: 0 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn() },
		viewService: {
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
	} as unknown as VaultmanPlugin;
}

function provider(overrides: Partial<ExplorerProvider> = {}): ExplorerProvider {
	return {
		id: 'empty-test',
		getTree: vi.fn(() => []),
		getFiles: vi.fn(() => []),
		handleNodeClick: vi.fn(),
		handleContextMenu: vi.fn(),
		...overrides,
	};
}

function render(
	target: HTMLElement,
	props: {
		viewMode?: ExplorerViewMode;
		searchTerm?: string;
		provider?: ExplorerProvider;
	},
) {
	return mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
		target,
		props: {
			plugin: plugin(),
			provider: props.provider ?? provider(),
			viewMode: props.viewMode ?? 'tree',
			searchTerm: props.searchTerm ?? '',
			icon: vi.fn(() => ({ update: vi.fn() })),
		},
	});
}

describe('PanelExplorer empty landing', () => {
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
		clearActivePerfProbe();
		vi.unstubAllGlobals();
	});

	it('renders the default empty landing for an empty tree', () => {
		app = render(target, { viewMode: 'tree' });
		flushSync();

		expect(target.textContent).toContain('No items');
		expect(target.querySelector('[data-empty-kind="empty"]')).not.toBeNull();
	});

	it('renders the default empty landing for an empty grid', () => {
		app = render(target, { viewMode: 'grid' });
		flushSync();

		expect(target.textContent).toContain('No files');
		expect(target.querySelector('[data-empty-kind="empty"]')).not.toBeNull();
	});

	it('renders the default empty landing for an empty table without mounting the table', () => {
		app = render(target, { viewMode: 'table' });
		flushSync();

		expect(target.textContent).toContain('No items');
		expect(target.querySelector('[data-empty-kind="empty"]')).not.toBeNull();
		expect(target.querySelector('.vm-node-table')).toBeNull();
	});

	it.each(['cards', 'list'] as const)(
		'renders a fallback empty landing for unsupported %s mode',
		(viewMode) => {
			app = render(target, { viewMode });
			flushSync();

			expect(target.textContent).toContain('No items');
			expect(target.querySelector('[data-empty-kind="empty"]')).not.toBeNull();
		},
	);

	it.each(['list'] as const)(
		'renders unavailable copy for unsupported %s mode when files exist',
		(viewMode) => {
			app = render(target, {
				viewMode,
				provider: provider({ getFiles: vi.fn(() => [mockTFile('Notes/A.md')]) }),
			});
			flushSync();

			expect(target.textContent).toContain(
				`${viewMode[0].toUpperCase()}${viewMode.slice(1)} view not available`,
			);
			expect(target.textContent).toContain('Switch to tree or grid');
			expect(target.textContent).not.toContain('No items');
		},
	);

	it('renders cards mode instead of fallback copy when nodes exist', () => {
		app = render(target, {
			viewMode: 'cards',
			provider: provider({
				getTree: vi.fn(() => [{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, count: 2 }]),
			}),
		});
		flushSync();

		expect(target.querySelector('.vm-node-cards')).not.toBeNull();
		expect(target.querySelector('[data-id="alpha"]')).not.toBeNull();
		expect(target.textContent).not.toContain('Cards view not available');
	});

	it('uses provider empty state copy for import and loading states', () => {
		const getEmptyState = vi.fn(
			(context: { mode: ExplorerViewMode; searchTerm: string }): ViewEmptyState | undefined => ({
				kind: context.mode === 'grid' ? 'loading' : 'import',
				label: context.mode === 'grid' ? 'Indexing Bases' : 'No compatible Bases',
				detail: context.searchTerm,
			}),
		);

		app = render(target, {
			viewMode: 'tree',
			searchTerm: 'project',
			provider: provider({ getEmptyState }),
		});
		flushSync();

		expect(target.textContent).toContain('No compatible Bases');
		expect(target.textContent).toContain('project');
		expect(target.querySelector('[data-empty-kind="import"]')).not.toBeNull();
		expect(getEmptyState).toHaveBeenCalledWith({ mode: 'tree', searchTerm: 'project' });

		void unmount(app);
		app = render(target, {
			viewMode: 'grid',
			provider: provider({ getEmptyState }),
		});
		flushSync();

		expect(target.textContent).toContain('Indexing Bases');
		expect(target.querySelector('[data-empty-kind="loading"]')).not.toBeNull();
	});

	it('uses search empty copy when search term is non-empty', () => {
		app = render(target, { viewMode: 'tree', searchTerm: '  missing  ' });
		flushSync();

		expect(target.textContent).toContain('No matches');
		expect(target.textContent).toContain('Try a different search term.');
		expect(target.querySelector('[data-empty-kind="search"]')).not.toBeNull();
	});

	it('records active probe metrics for tree refresh and badge bubbling', () => {
		const probe = createPerfProbe({ now: () => 0 });
		const nodes: TreeNode[] = [{ id: 'status', label: 'status', depth: 0, meta: {} }];
		setActivePerfProbe(probe.api);

		app = render(target, {
			viewMode: 'tree',
			provider: provider({ getTree: vi.fn(() => nodes) }),
		});
		flushSync();

		const snapshot = probe.snapshot();
		expect(snapshot.timings['panelExplorer.getTree'].count).toBeGreaterThan(0);
		expect(snapshot.timings['panelExplorer.bubbleHiddenTreeBadges'].count).toBeGreaterThan(0);
		expect(snapshot.timings['panelExplorer.bubbleHiddenTreeBadges'].totalNodes).toBeGreaterThan(0);
	});

	it('records active probe metrics for file refreshes', () => {
		const probe = createPerfProbe({ now: () => 0 });
		setActivePerfProbe(probe.api);

		app = render(target, {
			viewMode: 'list',
			provider: provider({ getFiles: vi.fn(() => [mockTFile('Notes/A.md')]) }),
		});
		flushSync();

		expect(probe.snapshot().counters['panelExplorer.getFiles']).toMatchObject({
			count: expect.any(Number),
			totalRows: expect.any(Number),
		});
		expect(probe.snapshot().counters['panelExplorer.getFiles'].totalRows).toBeGreaterThan(0);
	});
});
