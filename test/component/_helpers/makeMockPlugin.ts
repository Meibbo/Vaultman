import { vi } from 'vitest';
import type { VaultmanPlugin } from '../../../src/main';
import { ThemeService } from '../../../src/services/serviceTheme.svelte';
import type { FilterGroup } from '../../../src/types/typeFilter';
import { DEFAULT_ELASTIC_UI_SETTINGS } from '../../../src/types/typeElasticUi';
import { mockApp, mockTFile } from '../../helpers/obsidian-mocks';

export interface MockPluginOverrides {
	pageOrder?: string[];
	explorerOperationScope?: 'auto' | 'filtered' | 'selected';
	islandDismissOnOutsideClick?: boolean;
	layout?: unknown;
	themeMode?: 'thin' | 'balanced' | 'thick';
	isFilesIndexed?: boolean;
	queueOpCount?: number;
}

function noopIndex() {
	return {
		nodes: [],
		revision: 0,
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

function makeThemeService(mode: 'thin' | 'balanced' | 'thick'): ThemeService {
	const theme = new ThemeService();
	theme.mode = mode;
	theme.identity = DEFAULT_ELASTIC_UI_SETTINGS.identity;
	theme.faintModeEnabled = DEFAULT_ELASTIC_UI_SETTINGS.faintModeEnabled;
	theme.reducedMotion = DEFAULT_ELASTIC_UI_SETTINGS.reducedMotion;
	theme.foulDetection = DEFAULT_ELASTIC_UI_SETTINGS.foulDetection;
	theme.activePresetId = DEFAULT_ELASTIC_UI_SETTINGS.themePresetId;
	return theme;
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

export function makeMockPlugin(overrides: MockPluginOverrides = {}): VaultmanPlugin {
	const visibleFile = mockTFile('Notes/visible.md');
	const app = mockApp({ files: [visibleFile] });
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = vi.fn(
		() => ({}),
	);
	(app.metadataCache as unknown as { off: (name: string, cb: () => void) => void }).off = vi.fn();
	(app.workspace as unknown as { containerEl: HTMLElement }).containerEl =
		document.createElement('div');

	const filterRoot: FilterGroup = { type: 'group', op: 'and', children: [] };
	const queueOpCount = overrides.queueOpCount ?? 0;
	const themeService = makeThemeService(overrides.themeMode ?? 'thin');

	return {
		app,
		manifest: { id: 'vaultman' },
		settings: {
			pageOrder: overrides.pageOrder ?? ['ops', 'statistics', 'filters'],
			explorerOperationScope: overrides.explorerOperationScope ?? 'auto',
			islandDismissOnOutsideClick: overrides.islandDismissOnOutsideClick ?? true,
			layout: overrides.layout ?? null,
			mouseGestures: { fab: {}, toolbar: {} },
			elasticUi: { ...DEFAULT_ELASTIC_UI_SETTINGS },
			contextMenuHideRules: [],
			contextMenuShowInEditorMenu: true,
			explorerFilesShowHidden: false,
			filterTemplates: [],
			filtersShowTabLabels: true,
			fnrRegexDefault: false,
			manualDndEnabled: false,
			viewFieldVisibility: {},
		},
		saveSettings: vi.fn(async () => undefined),
		addChild: vi.fn(),
		removeChild: vi.fn(),
		themeService,
		leafDetachService: makeLeafDetachService(),
		overlayState: {
			stack: [],
			isOpen: vi.fn(() => false),
			push: vi.fn(),
			popById: vi.fn(),
		},
		filterService: {
			activeFilter: filterRoot,
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
			logicalOpCount: queueOpCount,
			isEmpty: queueOpCount === 0,
			add: vi.fn(),
			addBatch: vi.fn(),
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
		openDiffViewHook: null,
		openQueuePopupHook: null,
		openFiltersPopupHook: null,
		openViewMenuHook: null,
		openSortMenuHook: null,
		openContentSearchHook: null,
		spawnTabLeaf: vi.fn(async () => undefined),
		isFilesIndexed: overrides.isFilesIndexed ?? true,
	} as unknown as VaultmanPlugin;
}
