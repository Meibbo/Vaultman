import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import DetachedTabHost from '../../src/components/frame/DetachedTabHost.svelte';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile, type WorkspaceLeaf } from '../helpers/obsidian-mocks';
import { LeafDetachService } from '../../src/services/serviceLeafDetach';
import { VaultmanTabLeafView } from '../../src/types/typeTabLeaf';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

function noopIndex() {
	return {
		nodes: [],
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

async function makePlugin(): Promise<VaultmanPlugin> {
	const visibleFile = mockTFile('Notes/visible.md');
	const app = mockApp({ files: [visibleFile] });
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = vi.fn(
		() => ({}),
	);
	const leafDetachService = new LeafDetachService({
		store: {
			loadData: async () => ({}),
			saveData: async () => undefined,
		},
		host: {
			spawnLeaf: async () => undefined,
			closeLeaf: async () => undefined,
		},
	});
	await leafDetachService.load();

	return {
		app,
		leafDetachService,
		settings: {
			filtersShowTabLabels: true,
			explorerOperationScope: 'filtered',
			explorerFilesShowHidden: false,
			contextMenuHideRules: [],
		},
		saveSettings: vi.fn(),
		addChild: vi.fn(),
		removeChild: vi.fn(),
		filterService: {
			filteredFiles: app.vault.getMarkdownFiles(),
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
		cssSnippetsIndex: noopIndex(),
		pluginsIndex: noopIndex(),
		queueService: {
			add: vi.fn(),
			remove: vi.fn(),
			requestDelete: vi.fn(),
			on: vi.fn(() => vi.fn()),
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

describe('DetachedTabHost', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		installObsidianDomPolyfill();
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

	it('renders page-tools as real PageTools content without the frame dock', async () => {
		app = mount(DetachedTabHost as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin: await makePlugin(), tabId: 'page-tools' },
		});
		flushSync();

		expect(target.querySelector('.vm-detached-tab-host')).toBeTruthy();
		expect(target.querySelector('.vm-page-tools-layout')).toBeTruthy();
		expect(target.querySelector('.vm-bottom-nav')).toBeFalsy();
	});

	it('renders explorer-files as a focused Files explorer tab without the frame dock', async () => {
		app = mount(DetachedTabHost as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin: await makePlugin(), tabId: 'explorer-files' },
		});
		await Promise.resolve();
		flushSync();

		expect(target.querySelector('.vm-detached-tab-host')).toBeTruthy();
		expect(target.querySelector('.vm-files-tab-content')).toBeTruthy();
		expect(target.querySelector('.vm-bottom-nav')).toBeFalsy();
	});

	it('keeps the Obsidian leaf container data-type aligned with the detached tab view type', async () => {
		const leaf: WorkspaceLeaf = {
			getViewState: () => ({ type: 'vaultman-tab-page-tools' }),
		};
		const view = new VaultmanTabLeafView(leaf, 'page-tools', await makePlugin());

		await view.onOpen();
		flushSync();

		expect(view.containerEl.getAttribute('data-type')).toBe('vaultman-tab-page-tools');
		expect(view.contentEl.getAttribute('data-vm-tab-id')).toBe('page-tools');
	});
});
