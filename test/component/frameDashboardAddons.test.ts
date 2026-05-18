import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import FrameVaultman from '../../src/components/frame/frameVaultman.svelte';
import type { VaultmanPlugin } from '../../src/main';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';
import { mockApp, mockTFile } from '../helpers/obsidian-mocks';

function noopIndex() {
	return {
		nodes: [],
		revision: 0,
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

function makeLeafDetachService() {
	return {
		getState: vi.fn(() => ({})),
		subscribe: vi.fn(() => vi.fn()),
		isDetached: vi.fn(() => false),
		attach: vi.fn(async () => undefined),
		detach: vi.fn(async () => undefined),
	};
}

function makeThemeService(): ThemeService {
	const theme = new ThemeService();
	theme.mode = 'balanced';
	theme.faintModeEnabled = false;
	return theme;
}

function makePlugin(): VaultmanPlugin {
	const visibleFile = mockTFile('Notes/visible.md');
	const app = mockApp({ files: [visibleFile] });
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = vi.fn(
		() => ({}),
	);
	(app.metadataCache as unknown as { off: (name: string, cb: () => void) => void }).off = vi.fn();

	return {
		app,
		manifest: { id: 'vaultman' },
		settings: {
			pageOrder: ['ops', 'statistics', 'filters'],
			layout: {
				dock: {
					content: 'none',
					labels: { visible: false, position: 'bottom' },
					presentation: { mode: 'bar', drawerDirection: 'up' },
				},
				tabs: {
					content: 'none',
					labels: { visible: false, position: 'side' },
					presentation: { mode: 'bar', drawerDirection: 'up' },
				},
			},
			contextMenuHideRules: [],
			explorerOperationScope: 'filtered',
			explorerFilesShowHidden: false,
			filtersShowTabLabels: true,
			fnrRegexDefault: false,
			islandDismissOnOutsideClick: true,
			manualDndEnabled: false,
			mouseGestures: {},
		},
		saveSettings: vi.fn(async () => undefined),
		addChild: vi.fn(),
		removeChild: vi.fn(),
		themeService: makeThemeService(),
		leafDetachService: makeLeafDetachService(),
		overlayState: {
			stack: [],
			isOpen: vi.fn(() => false),
			push: vi.fn(),
			popById: vi.fn(),
		},
		filterService: {
			activeFilter: { type: 'group', children: [] },
			filteredFiles: app.vault.getMarkdownFiles(),
			selectedFiles: [],
			setFilter: vi.fn(),
			setSelectedFiles: vi.fn(),
			setSearchFilter: vi.fn(),
			clearSearchFilter: vi.fn(),
			clearAll: vi.fn(),
			getSearchFilterRules: vi.fn(() => []),
			toggleFilterRule: vi.fn(),
			removeNode: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		},
		queueService: {
			logicalOpCount: 0,
			isEmpty: true,
			add: vi.fn(),
			remove: vi.fn(),
			requestDelete: vi.fn(),
			processAll: vi.fn(),
			clearAll: vi.fn(),
			listTransactions: vi.fn(() => []),
			on: vi.fn(() => vi.fn()),
			off: vi.fn(),
		},
		propertyIndex: { fileCount: 0, index: new Map() },
		filesIndex: noopIndex(),
		tagsIndex: noopIndex(),
		propsIndex: noopIndex(),
		contentIndex: Object.assign(noopIndex(), { setQuery: vi.fn() }),
		operationsIndex: noopIndex(),
		activeFiltersIndex: noopIndex(),
		cssSnippetsIndex: noopIndex(),
		pluginsIndex: noopIndex(),
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

describe('frameVaultman dashboard/add-ons wiring', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		installObsidianDomPolyfill();
		target = document.createElement('div');
		document.body.appendChild(target);
		rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 0,
			width: 1024,
			height: 720,
			top: 0,
			right: 1024,
			bottom: 720,
			left: 0,
			toJSON: () => ({}),
		} as DOMRect);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				private readonly cb: ResizeObserverCallback;

				constructor(cb: ResizeObserverCallback) {
					this.cb = cb;
				}

				observe(): void {
					this.cb([], this as unknown as ResizeObserver);
				}

				disconnect(): void {}
			},
		);
		vi.stubGlobal('activeWindow', window);
		vi.stubGlobal('activeDocument', document);
		vi.spyOn(document, 'hasFocus').mockReturnValue(true);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		rectSpy.mockRestore();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('mounts dashboard columns and add-ons toolbar for wide non-thin main frames', async () => {
		const plugin = makePlugin();

		app = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin },
		});
		await Promise.resolve();
		flushSync();

		expect(target.querySelector('[data-vm-dashboard]')).toBeTruthy();
		expect(target.querySelector('[data-vm-col="filters"]')).toBeTruthy();
		expect(target.querySelector('[data-vm-col="explorer"]')).toBeTruthy();
		expect(target.querySelector('[data-vm-col="addons"]')).toBeTruthy();
		expect(target.querySelector('[data-vm-addon-action="open-note"]')).toBeTruthy();
		expect(target.querySelector('.vm-page[data-page="ops"]')).toBeTruthy();
	});

	it('keeps the sliding frame surface for sidebar frames', async () => {
		const plugin = makePlugin();

		app = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'sidebar' },
		});
		await Promise.resolve();
		flushSync();

		expect(target.querySelector('[data-vm-dashboard]')).toBeNull();
		expect(target.querySelector('.vm-page-container')).toBeTruthy();
		expect(target.querySelector('.vm-page[data-page="ops"]')).toBeTruthy();
	});
});
