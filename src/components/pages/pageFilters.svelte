<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { MarkdownView, Menu, Notice, TFile } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import { resolveCommandActions } from '../../logic/logicCommandActions';
	import {
		PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER,
		resolveExclusiveSlotNodes,
		resolveValueMoveToggleNodes,
	} from '../../logic/logicPanelWidgetProjection';
	import type { PanelWidgetNode } from '../../types/typePanelWidget';
	import {
		executeObsidianCommand,
		listObsidianCommands,
	} from '../../utils/obsidianCommands';
	import FiltersTagsTab from './tabTags.svelte';
	import FiltersPropsTab from './tabProps.svelte';
	import FilesTab from './tabFiles.svelte';
	import TabContent from './tabContent.svelte';
	import SnippetsTab from './tabSnippets.svelte';
	import PluginsTab from './tabPlugins.svelte';
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';
	import type { PropsExplorerPanel } from '../containers/explorerProps';
	import type { TagsExplorerPanel } from '../containers/explorerTags';
	import type { SnippetsExplorerPanel } from '../containers/explorerSnippets';
	import type { PluginsExplorerPanel } from '../containers/explorerPlugins';
	import type { ContentPreviewResult } from '../../types/typeUI';
	import type { SavedLayout } from '../../types/typeSettings';
	import {
		type PendingChange,
		FIND_REPLACE_CONTENT,
	} from '../../types/typeOps';
	import { translate } from '../../i18n/index';
	import {
		buildNativeSearchPreview,
		NativeSearchAdapter,
	} from '../../services/serviceNativeSearchAdapter';
	import { bookmarkSearchQuery } from '../../services/serviceCoreBookmarks';
	import {
		extraContextRange,
		showMoreAfter,
		showMoreBefore,
	} from '../../logic/logicExtraContext';
	import { CopySearchResultsModal } from '../../services/serviceCopySearchResultsModal';
	import {
		sortContentPreviewFiles,
		type ContentSortBy,
		type ContentSortDirection,
	} from '../../logic/logicContentPreview';
	import { refreshExplorerViewport } from '../../logic/logicExplorerViewportActivation';
	import { sortDirectionGlyph } from '../../logic/logicSort';
	import { observeActiveContentFile } from '../../logic/logicContentActiveFile';
	import { contentMenuNode } from '../../logic/logicContentContextMenu';
	import { queuedRenameBadgeForPath } from '../../logic/logicRenameBadges';
	import {
		advanceTextSearchRun,
		applyTextSearchIntent,
		completeTextSearchRun,
		createTextSearchRun,
		reconcileTextSearchRun,
		sameTextSearchIntent,
		shouldLaunchTextSearch,
		textSearchControl,
		textSearchLaunchToken,
		textSearchShouldScan,
		type TextSearchRun,
	} from '../../logic/logicTextSearchState';
	import { measureSceneSync } from '../../logic/logicScenePerformance';
	import type {
		NavbarPanelWidgetState,
		ScenePanelWidgetActionPort,
	} from '../../types/typePanelWidget';

	type FiltersTab =
		| 'files'
		| 'props'
		| 'tags'
		| 'content'
		| 'snippets'
		| 'plugins';
	type SearchTab = Exclude<FiltersTab, 'content'>;
	type HeaderMenuAction = {
		id: 'filters' | 'queue' | 'statistics';
		label: string;
		icon: string;
		count?: number;
		warning?: boolean;
		tooltip?: string;
		onClick: () => void;
		onDoubleClick?: () => void;
	};
	type HeaderAction = {
		id: string;
		label: string;
		icon: string;
		disabled?: boolean;
		onClick: (event: MouseEvent) => void;
	};
	type ContentScopeSummary = {
		baseFileCount: number;
		resultFileCount: number | null;
		totalFileCount: number;
		filterCount: number;
		hasContentQuery: boolean;
		isSearching: boolean;
		usesSelectedScope: boolean;
	};

	const CONTENT_SORT_OPTIONS: {
		id: ContentSortBy;
		labelKey: string;
		icon: string;
		defaultDirection: ContentSortDirection;
	}[] = [
		{
			id: 'count',
			labelKey: 'sort.by.count',
			icon: 'lucide-list-ordered',
			defaultDirection: 'desc',
		},
		{
			id: 'name',
			labelKey: 'sort.by.name',
			icon: 'lucide-a-large-small',
			defaultDirection: 'asc',
		},
		{
			id: 'mtime',
			labelKey: 'sort.by.modified',
			icon: 'lucide-calendar-clock',
			defaultDirection: 'desc',
		},
		{
			id: 'ctime',
			labelKey: 'sort.by.created',
			icon: 'lucide-calendar-plus',
			defaultDirection: 'desc',
		},
	];

	let {
		plugin,
		filtersActiveTab = $bindable('files'),
		filtersSearchByTab = $bindable({
			props: '',
			tags: '',
			files: '',
			snippets: '',
			plugins: '',
		}),
		filtersSearchCategory = $bindable({
			tags: 0,
			props: 0,
			files: 0,
			snippets: 0,
			plugins: 0,
		}),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		snippetsExplorer = $bindable(),
		pluginsExplorer = $bindable(),
		settingsRevision = 0,
		frameWidth = 0,
		getSelectedFiles,
		filteredCount,
		filterRuleCount = 0,
		contentSearchScopeRevision,
		contentScopeFilteredCount,
		contentScopeTotalCount,
		contentScopeFilterCount,
		clearFiltersRevision = 0,
		showDock = true,
		queuedCount = 0,
		queueWarningCount = 0,
		onOpenFilters,
		onViewFiltersChanged,
		onContentFilterChanged,
		onClearFilters,
		onOpenQueue,
		onClearQueue,
		onOpenStatistics,
		addOpCount = 0,
		expansionRevision = 0,
		floatingTocEnabled = false,
		onToggleFloatingToc,
		getFloatingTocState,
		applyFloatingTocState,
		icon,
		initialShowToolbar = null,
		onShowToolbarChange,
		onPanelWidgetStateChange,
		sceneInstanceId = '',
		generation = 0,
		onPublishPanelWidget,
		onClearPanelWidget,
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersTab;
		filtersSearchByTab: Record<SearchTab, string>;
		filtersSearchCategory: Record<SearchTab, number>;
		fileList: FilesExplorerPanel | undefined;
		selectedCount: number;
		tagsExplorer: TagsExplorerPanel | null;
		propExplorer: PropsExplorerPanel | undefined;
		snippetsExplorer: SnippetsExplorerPanel | undefined;
		pluginsExplorer: PluginsExplorerPanel | undefined;
		settingsRevision?: number;
		frameWidth?: number;
		getSelectedFiles: () => TFile[];
		filteredCount: number;
		filterRuleCount?: number;
		contentSearchScopeRevision: string;
		contentScopeFilteredCount: number;
		contentScopeTotalCount: number;
		contentScopeFilterCount: number;
		clearFiltersRevision?: number;
		showDock?: boolean;
		queuedCount?: number;
		queueWarningCount?: number;
		onOpenFilters?: () => void;
		onViewFiltersChanged?: () => void;
		onContentFilterChanged?: () => void;
		onClearFilters?: () => void;
		onOpenQueue?: () => void;
		onClearQueue?: () => void;
		onOpenStatistics?: () => void;
		addOpCount?: number;
		expansionRevision?: number;
		floatingTocEnabled?: boolean;
		onToggleFloatingToc?: () => void;
		getFloatingTocState?: () => import('../../types/typeSettings').SavedFloatingTocState;
		applyFloatingTocState?: (
			state?: import('../../types/typeSettings').SavedFloatingTocState,
		) => void;
		icon: (el: HTMLElement, name: string) => any;
		initialShowToolbar?: boolean | null;
		onShowToolbarChange?: (val: boolean) => void;
		onPanelWidgetStateChange?: (state: NavbarPanelWidgetState | null) => void;
		sceneInstanceId?: string;
		generation?: number;
		onPublishPanelWidget?: (
			publication: import('../../types/typePanelWidget').ScenePanelWidgetPublication,
		) => void;
		onClearPanelWidget?: (
			owner: Pick<
				import('../../types/typePanelWidget').ScenePanelWidgetEnvelope,
				'sceneInstanceId' | 'providerId' | 'generation'
			>,
		) => void;
	} = $props();

	export function setShowToolbar(val: boolean): void {
		localShowToolbar = val;
	}

	/**
	 * Seed the Text search from outside — the editor context menu's "search
	 * selected text", when the user has asked for that to land here instead of
	 * in core's pane. Writing the state the input is bound to drives exactly the
	 * same path as typing it.
	 */
	export function setContentQuery(
		query: string,
		modifiers?: { caseSensitive: boolean; isRegex: boolean },
	): void {
		if (modifiers) {
			contentCaseSensitive = modifiers.caseSensitive;
			contentIsRegex = modifiers.isRegex;
		}
		contentFind = query;
	}

	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentIsExclusion = $state(false);
	// U121-016/017: the Text lifecycle is a phase machine, not a boolean. It
	// carries the traversal cursor so returning to this tab (the pane stays
	// mounted, BT4-022) resumes instead of restarting.
	let contentSearchRun = $state<TextSearchRun>(
		createTextSearchRun({
			query: '',
			isRegex: false,
			caseSensitive: false,
			isExclusion: false,
			scopeRevision: 0,
		}),
	);
	// Deliberately NOT reactive: the adapter reports progress continuously, and
	// folding it into `contentSearchRun` would re-trigger the search effect on
	// every scanned file. It is folded in only when the user pauses.
	let contentScanCursor = 0;
	let contentSearchLaunchToken = '';
	let contentFrozenApplyToken = '';
	// U121-019 #51: core's own switch — `SearchView.setExtraContext(boolean)`,
	// one flag for the view rather than a control per row. On, every match grows
	// to the list item, section or line containing it.
	let contentExtraContext = $state(false);
	// Bounds a single match has been opened up to, keyed `path:index` — core's
	// two hover chevrons move one match and re-render that match alone.
	let contentMatchRanges = $state<Record<string, [number, number]>>({});
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(true);
	let contentRegexError = $state('');
	let contentSortBy = $state<ContentSortBy>('count');
	let contentSortDirection = $state<ContentSortDirection>('desc');
	let collapsedContentFilePaths = $state<string[]>([]);
	let activeContentRevealPath = $state<string | null>(null);
	let activeContentFilePath = $state<string | null>(null);
	let contentRevealRevision = $state(0);
	let lastClearFiltersRevision = $state<number | null>(null);
	let visitedTabs = $state<Record<FiltersTab, boolean>>({
		files: filtersActiveTab === 'files',
		props: filtersActiveTab === 'props',
		tags: filtersActiveTab === 'tags',
		content: filtersActiveTab === 'content',
		snippets: filtersActiveTab === 'snippets',
		plugins: filtersActiveTab === 'plugins',
	});

	function createNativeSearchAdapter(): NativeSearchAdapter {
		return new NativeSearchAdapter(plugin.app);
	}

	const nativeSearchAdapter = createNativeSearchAdapter();

	onMount(() => {
		const { workspace, vault } = plugin.app;
		return observeActiveContentFile(
			{
				current: () => workspace.getActiveFile(),
				onFileOpen: (listener) => {
					const ref = workspace.on('file-open', listener);
					return () => workspace.offref(ref);
				},
				onRename: (listener) => {
					const ref = vault.on('rename', listener);
					return () => vault.offref(ref);
				},
				onDelete: (listener) => {
					const ref = vault.on('delete', listener);
					return () => vault.offref(ref);
				},
			},
			(path) => {
				activeContentFilePath = path;
			},
		);
	});

	// BT4-022: panes keep their panels mounted but hidden (height 0), so the
	// virtual window empties; re-render the activated panel next frame.
	$effect(() => {
		const tab = filtersActiveTab;
		window.requestAnimationFrame(() => {
			refreshExplorerViewport(tab, {
				files: fileList,
				props: propExplorer,
				tags: tagsExplorer,
				snippets: snippetsExplorer,
				plugins: pluginsExplorer,
			});
		});
	});

	const explorerActiveTab = $derived<SearchTab>(
		filtersActiveTab === 'content' ? 'props' : filtersActiveTab,
	);
	const explorerSearchTab = $derived<SearchTab>(explorerActiveTab);
	const filtersSearch = $derived(filtersSearchByTab[explorerSearchTab] ?? '');
	const isExplorerControlTab = $derived(filtersActiveTab !== 'content');
	const showTabLabels = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.filtersShowTabLabels;
	});
	const operationScope = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.explorerOperationScope;
	});
	let localShowToolbar = $state<boolean | null>(
		untrack(() => initialShowToolbar ?? null),
	);
	let panelWidgetSearchExpanded = $state(false);
	const showToolbar = $derived.by(() => {
		void settingsRevision;
		if (localShowToolbar !== null) return localShowToolbar;
		return plugin.settings.showToolbar !== false;
	});
	const orderCellsByActivation = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.orderCellsByActivation === true;
	});
	const sortLevelInline = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.sortLevelInline !== false;
	});
	const toolbarToolsMenu = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.toolbarToolsMenu === true;
	});
	const toolbarOverflowStrategy = $derived.by(() => {
		void settingsRevision;
		const strategy = plugin.settings.toolbarOverflowStrategy;
		return strategy === 'scroll' || strategy === 'wrap'
			? strategy
			: 'condensed';
	});
	const createActionsPlacement = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.createActionsPlacement === 'toolbar'
			? 'toolbar'
			: 'searchbox';
	});
	const commandActions = $derived.by(() => {
		void settingsRevision;
		return resolveCommandActions(
			listObsidianCommands(plugin.app),
			plugin.settings.toolbarCommandActions ?? [],
		);
	});
	// When hidden, the toolbar slides out of the frame and peeks back on hover of
	// the top edge, so it can be re-enabled from its own tabs menu.
	function toggleToolbar() {
		localShowToolbar = !showToolbar;
		onShowToolbarChange?.(localShowToolbar);
	}
	// Local mirror so a save updates the submenu list immediately (quiet persist,
	// no page remount); synced from settings for external changes (delete).
	let savedLayouts = $state<SavedLayout[]>([]);
	$effect(() => {
		void settingsRevision;
		savedLayouts = plugin.settings.savedLayouts ?? [];
	});
	function saveLayout(layout: SavedLayout) {
		layout.floatingToc = getFloatingTocState?.();
		const next = [
			...savedLayouts.filter((entry) => entry.name !== layout.name),
			layout,
		];
		plugin.settings.savedLayouts = next;
		savedLayouts = next;
		void plugin.saveData(plugin.settings);
		new Notice(translate('viewmenu.saved_config_notice'));
	}
	const minimalStyle = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.minimalStyle;
	});
	const addonCellStyle = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.addonCellStyle;
	});
	$effect(() => {
		snippetsExplorer?.setCellStyle(addonCellStyle);
		pluginsExplorer?.setCellStyle(addonCellStyle);
	});
	const filterTabOptions = $derived.by(() => {
		void settingsRevision;
		return [
			{
				id: 'files',
				label: translate('filter.tab.files'),
				icon: 'lucide-folder',
			},
			{
				id: 'props',
				label: translate('filter.tab.props'),
				icon: 'lucide-archive',
			},
			{ id: 'tags', label: translate('filter.tab.tags'), icon: 'lucide-tag' },
			{
				id: 'content',
				label: translate('filter.tab.content'),
				icon: 'lucide-file-search',
			},
			{
				id: 'snippets',
				label: translate('filter.tab.snippets'),
				icon: 'lucide-file-code',
			},
			{
				id: 'plugins',
				label: translate('filter.tab.plugins'),
				icon: 'lucide-plug',
			},
		];
	});
	const tabMenuActions = $derived.by<HeaderMenuAction[]>(() => {
		void settingsRevision;
		if (showDock) return [];
		return [
			{
				id: 'statistics',
				label: translate('nav.statistics'),
				icon: 'lucide-chart-column',
				onClick: () => onOpenStatistics?.(),
			},
			{
				id: 'filters',
				label: translate('filters.active'),
				icon: 'lucide-filter',
				count: filterRuleCount,
				warning: filterRuleCount > 0 && filteredCount === 0,
				tooltip:
					filterRuleCount > 0 && filteredCount === 0
						? translate('filters.active_zero')
						: undefined,
				onClick: () => onOpenFilters?.(),
				onDoubleClick: () => onClearFilters?.(),
			},
			{
				id: 'queue',
				label: translate('ops.tab.queue'),
				icon: 'lucide-list-checks',
				count: queuedCount,
				warning: queueWarningCount > 0,
				tooltip:
					queueWarningCount > 0
						? translate('ops.queue.warning', {
								count: queuedCount,
								warnings: queueWarningCount,
							})
						: undefined,
				onClick: () => onOpenQueue?.(),
				onDoubleClick: () => onClearQueue?.(),
			},
		];
	});

	function contentPreviewMatchedFileCount(
		result: ContentPreviewResult,
	): number {
		return (
			result.matchedFiles?.length ?? result.files.length + result.moreFiles
		);
	}

	function contentSearchUsesSelectedScope(): boolean {
		const scope = operationScope;
		const selected = getSelectedFiles();
		return scope === 'selected' || (scope === 'auto' && selected.length > 0);
	}

	/**
	 * The scope the Text search runs over.
	 *
	 * Derived, not computed on demand: underneath it is
	 * `getFilesIgnoringContentSearch(true)`, which walks every file in the vault,
	 * applies the filter tree and sorts the result through a collator. That ran
	 * on **every pass of the search effect** — so once per keystroke, and twice
	 * counting `contentScopeSummary` — which is the freeze the dev felt while
	 * typing. None of it depends on the query.
	 *
	 * `contentSearchScopeRevision` is the host's own signal that the scope or the
	 * filters moved, and the search effect already keys on it; the selection
	 * count covers the 'selected' scope, which the revision does not describe.
	 */
	const contentScopeFiles = $derived.by<TFile[]>(() => {
		void contentSearchScopeRevision;
		void selectedCount;
		if (contentSearchUsesSelectedScope()) return getSelectedFiles();
		return contentSearchCandidateFiles();
	});

	function contentSearchScopeFiles(): TFile[] {
		return contentScopeFiles;
	}

	const contentScopeSummary = $derived.by<ContentScopeSummary>(() => {
		void contentSearchScopeRevision;
		void contentScopeFilteredCount;
		const hasContentQuery = contentFind.trim().length > 0 && !contentRegexError;
		const resultFileCount =
			hasContentQuery && contentPreviewResult
				? contentPreviewMatchedFileCount(contentPreviewResult)
				: null;

		return {
			baseFileCount: contentSearchScopeFiles().length,
			resultFileCount,
			totalFileCount: contentScopeTotalCount,
			filterCount: contentScopeFilterCount,
			hasContentQuery,
			isSearching: hasContentQuery && contentPreviewResult?.isLoading === true,
			usesSelectedScope: contentSearchUsesSelectedScope(),
		};
	});
	const contentPreviewFileCount = $derived(
		contentScopeSummary.resultFileCount ?? contentScopeSummary.baseFileCount,
	);
	const contentHasActiveNonContentFilters = $derived.by(() => {
		const contentFilterCount = contentScopeSummary.hasContentQuery ? 1 : 0;
		return contentScopeSummary.filterCount - contentFilterCount > 0;
	});
	// BT5-086: how many files the non-content filters removed from the scope.
	const contentExcludedFileCount = $derived(
		Math.max(
			0,
			(contentScopeSummary.baseFileCount ?? 0) -
				(contentScopeSummary.resultFileCount ??
					contentScopeSummary.baseFileCount ??
					0),
		),
	);
	const sortedContentFiles = $derived(
		sortContentPreviewFiles(
			contentPreviewResult?.files ?? [],
			contentSortBy,
			contentSortDirection,
		),
	);
	const collapsedContentPathSet = $derived(new Set(collapsedContentFilePaths));
	const contentFilePaths = $derived(
		sortedContentFiles.map((fileResult) => fileResult.file.path),
	);
	const hasExpandedContentFiles = $derived(
		contentPreviewOpen &&
			sortedContentFiles.some(
				(fileResult) => !collapsedContentPathSet.has(fileResult.file.path),
			),
	);
	const contentSearchControl = $derived(
		textSearchControl(contentSearchRun, contentFind.length > 0),
	);
	// --- `Move to prop...` mode surface ---------------------------------------
	//
	// The mode lives on the Props explorer. The page reads it and projects it:
	// its two switches into the searchbox's existing trailing actions, and its
	// Proceed/Cancel into the exclusive slot that the reveal toggle of shard 09
	// will otherwise hold. The explorer notifies on every change, so the toolbar
	// reprojects without an unrelated action forcing a repaint.
	let valueMoveRevision = $state(0);
	$effect(() => {
		const explorer = propExplorer;
		explorer?.setValueMoveChangeHandler(() => {
			valueMoveRevision += 1;
		});
		return () => explorer?.setValueMoveChangeHandler(undefined);
	});

	const valueMoveMode = $derived.by(() => {
		void valueMoveRevision;
		return filtersActiveTab === 'props'
			? (propExplorer?.getValueMoveMode() ?? null)
			: null;
	});

	const searchTrailingActions = $derived(
		valueMoveMode
			? resolveValueMoveToggleNodes({
					write: valueMoveMode.write,
					originDisposition: valueMoveMode.originDisposition,
					labels: {
						append: translate('explorer.move_to_prop.write.append'),
						replace: translate('explorer.move_to_prop.write.replace'),
						move: translate('explorer.move_to_prop.origin.move'),
						copy: translate('explorer.move_to_prop.origin.copy'),
					},
				})
			: [],
	);

	function runSearchTrailingAction(node: PanelWidgetNode): void {
		if (node.id === 'props.move-to-prop.write') {
			propExplorer?.toggleValueMoveWrite();
			return;
		}
		if (node.id === 'props.move-to-prop.origin') {
			propExplorer?.toggleValueMoveOriginDisposition();
		}
	}

	const valueMoveSlotNodes = $derived(
		resolveExclusiveSlotNodes({
			// `reveal this file` holds the slot at rest. The move mode replaces
			// it rather than crowding it, and its state is restored on exit
			// because the toggle lives on the explorer, not in the projection.
			idleNode:
				filtersActiveTab === 'props'
					? {
							id: 'props.reveal-this-file',
							nodeKind: 'action',
							cellKind: 'action',
							presentation: 'toggle',
							label: translate('explorer.ctx.reveal_this_file'),
							icon: 'lucide-file-search-2',
							order: PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER,
							available: true,
							action: { id: 'props.reveal-this-file.toggle' },
						}
					: null,
			moveMode: valueMoveMode
				? {
						proceed: {
							id: 'props.move-to-prop.proceed',
							nodeKind: 'action',
							cellKind: 'action',
							presentation: 'button',
							label: translate('explorer.ctx.move_to_prop.proceed'),
							icon: 'lucide-check',
							order: PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER,
							available: valueMoveMode.destinations.length > 0,
							action: { id: 'props.move-to-prop.proceed' },
						},
						cancel: {
							id: 'props.move-to-prop.cancel',
							nodeKind: 'action',
							cellKind: 'action',
							presentation: 'button',
							label: translate('explorer.ctx.move_to_prop.cancel'),
							icon: 'lucide-x',
							order: PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER + 1,
							available: true,
							action: { id: 'props.move-to-prop.cancel' },
						},
					}
				: null,
		}),
	);

	const valueMoveHeaderActions = $derived<HeaderAction[]>(
		valueMoveSlotNodes.map((node) => ({
			id: node.id,
			label: node.label,
			icon: node.icon,
			disabled: !node.available,
			onClick: () => {
				if (node.id === 'props.reveal-this-file') {
					propExplorer?.toggleRevealActiveFile();
					valueMoveRevision += 1;
					return;
				}
				if (node.id === 'props.move-to-prop.cancel') {
					propExplorer?.cancelValueMoveMode();
					return;
				}
				propExplorer?.proceedValueMove();
			},
		})),
	);

	const contentHeaderActions = $derived<HeaderAction[]>(
		filtersActiveTab === 'content'
			? [
					{
						id: 'content-pause',
						label: translate(contentSearchControl.labelKey),
						icon: contentSearchControl.icon,
						disabled: contentSearchControl.disabled,
						onClick: () => {
							// Fold the live cursor in before the transition so a pause
							// records where the traversal actually stands.
							contentSearchRun = applyTextSearchIntent(
								advanceTextSearchRun(contentSearchRun, contentScanCursor),
								contentSearchControl.intent,
							);
							if (contentSearchControl.intent === 'pause') {
								nativeSearchAdapter.cancel();
								contentSearchLaunchToken = '';
							}
							if (contentSearchControl.intent === 'restart') {
								contentScanCursor = 0;
								nativeSearchAdapter.cancel();
								nativeSearchAdapter.resetRetained();
								contentSearchLaunchToken = '';
							}
						},
					},
					{
						id: 'content-has',
						label: contentIsExclusion
							? translate('filter.text_not_contains')
							: translate('filter.text_contains'),
						icon: contentIsExclusion ? 'lucide-file-minus' : 'lucide-file-text',
						onClick: () => {
							contentIsExclusion = !contentIsExclusion;
						},
					},
					{
						id: 'content-sort',
						label: translate('filter.sort_btn'),
						icon: 'lucide-arrow-up-down',
						onClick: openContentSortMenu,
					},
					{
						id: 'content-reveal',
						label: translate('filter.auto_reveal'),
						icon: 'lucide-gallery-vertical',
						disabled: sortedContentFiles.length === 0,
						onClick: () => revealActiveContentFile(),
					},
					{
						id: 'content-expand',
						label: hasExpandedContentFiles
							? translate('filter.collapse_all')
							: translate('filter.expand_all'),
						icon: hasExpandedContentFiles
							? 'lucide-chevrons-down-up'
							: 'lucide-chevrons-up-down',
						disabled: sortedContentFiles.length === 0,
						onClick: () => toggleAllContentFiles(),
					},
				]
			: [],
	);

	function ensureActiveTabVisited(tab: FiltersTab) {
		if (visitedTabs[tab]) return;
		visitedTabs = { ...visitedTabs, [tab]: true };
	}

	function isFiltersTab(tab: string): tab is FiltersTab {
		return (
			tab === 'files' ||
			tab === 'props' ||
			tab === 'tags' ||
			tab === 'content' ||
			tab === 'snippets' ||
			tab === 'plugins'
		);
	}

	function switchFiltersTab(tab: string) {
		if (!isFiltersTab(tab)) return;
		ensureActiveTabVisited(filtersActiveTab);
		ensureActiveTabVisited(tab);
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
	}

	function activateNodeContentSearch(query: string) {
		contentFind = query;
		contentIsRegex = false;
		contentRegexError = '';
		contentPreviewOpen = true;
		switchFiltersTab('content');
	}

	function setExplorerSearch(value: string) {
		filtersSearchByTab = {
			...filtersSearchByTab,
			[explorerSearchTab]: value,
		};
	}

	function nextContentSortDirection(
		sortBy: ContentSortBy,
	): ContentSortDirection {
		const option = CONTENT_SORT_OPTIONS.find(
			(candidate) => candidate.id === sortBy,
		);
		if (contentSortBy !== sortBy) return option?.defaultDirection ?? 'asc';
		return contentSortDirection === 'asc' ? 'desc' : 'asc';
	}

	function openContentSortMenu(event: MouseEvent) {
		const menu = new Menu();
		for (const option of CONTENT_SORT_OPTIONS) {
			menu.addItem((item) => {
				const isActive = contentSortBy === option.id;
				item
					.setTitle(
						`${translate(option.labelKey)}${
							isActive ? ` ${sortDirectionGlyph(contentSortDirection)}` : ''
						}`,
					)
					.setIcon(option.icon)
					.setChecked(isActive)
					.onClick(() => {
						contentSortDirection = nextContentSortDirection(option.id);
						contentSortBy = option.id;
					});
			});
		}
		menu.showAtMouseEvent(event);
	}

	function isContentFileExpanded(filePath: string): boolean {
		return !collapsedContentPathSet.has(filePath);
	}

	function toggleContentFile(filePath: string) {
		const expanding = collapsedContentPathSet.has(filePath);
		const metric = expanding
			? 'scene.action.expand-node.content'
			: 'scene.action.collapse-node.content';
		measureSceneSync(metric, { rows: 1 }, () => {
			if (expanding) {
				collapsedContentFilePaths = collapsedContentFilePaths.filter(
					(path) => path !== filePath,
				);
				return;
			}
			collapsedContentFilePaths = [...collapsedContentFilePaths, filePath];
		});
	}

	function toggleAllContentFiles() {
		if (contentFilePaths.length === 0) return;
		const expanding = !hasExpandedContentFiles;
		const metric = expanding
			? 'scene.action.expand-all.content'
			: 'scene.action.collapse-all.content';
		measureSceneSync(metric, { rows: contentFilePaths.length }, () => {
			if (!expanding) {
				collapsedContentFilePaths = contentFilePaths;
				return;
			}
			collapsedContentFilePaths = [];
			contentPreviewOpen = true;
		});
	}

	function revealActiveContentFile() {
		measureSceneSync(
			'scene.action.reveal-active-file.content',
			{ files: sortedContentFiles.length },
			() => {
				const file = plugin.app.workspace.getActiveFile();
				if (!file) {
					new Notice(translate('content.reveal_no_active_file'));
					return;
				}
				const paths = new Set(
					sortedContentFiles.map((entry) => entry.file.path),
				);
				if (!paths.has(file.path)) {
					new Notice(translate('content.reveal_not_in_results'));
					return;
				}
				activeContentRevealPath = file.path;
				contentRevealRevision += 1;
				contentPreviewOpen = true;
				collapsedContentFilePaths = collapsedContentFilePaths.filter(
					(path) => path !== file.path,
				);
			},
		);
	}

	function fileTypeIdForContentScope(file: TFile): string {
		return file.extension || 'none';
	}

	function applyContentViewFilters(files: TFile[]): TFile[] {
		const fileTypeFilter = fileList?.getActiveTypeFilter();
		if (!fileTypeFilter) return files;
		return files.filter(
			(file) => fileTypeIdForContentScope(file) === fileTypeFilter.id,
		);
	}

	function contentSearchCandidateFiles(): TFile[] {
		return applyContentViewFilters(
			plugin.filterService.getFilesIgnoringContentSearch(true),
		);
	}

	function openContentContextMenu(file: TFile, event: MouseEvent): void {
		plugin.contextMenuService.openPanelMenu(
			{
				nodeType: 'content',
				node: contentMenuNode(file),
				surface: 'panel',
				file,
			},
			event,
		);
	}

	function queuedRenameBadge(filePath: string) {
		void queuedCount;
		return queuedRenameBadgeForPath(plugin.queueService.queue, filePath);
	}

	function cancelQueuedRename(queueIndex: number): void {
		plugin.queueService.remove(queueIndex);
	}

	/**
	 * Open a match the way core opens its own.
	 *
	 * Core does not highlight anything itself: `onResultClick` calls
	 * `openFile(file, { eState: { match: { content, matches } } })` and Obsidian
	 * applies the highlight from that state — including clearing it on the next
	 * click in the note. Ours only scrolled, because it opened through
	 * `openLinkText` and then moved the cursor, which carries no match state.
	 *
	 * The content comes from the adapter's retained matches, so nothing is read
	 * from disk to do it.
	 */
	async function openContentMatch(file: TFile, offset: number) {
		const input = nativeSearchAdapter
			.retainedInputs()
			.find((entry) => entry.file.path === file.path);
		const match = input?.offsets.find(([start]) => start === offset);

		if (input && match) {
			await plugin.app.workspace.getLeaf(false).openFile(file, {
				eState: {
					match: { content: input.content, matches: [match] },
				},
			});
			return;
		}

		// The match is no longer retained (a new query cleared the floor). Fall
		// back to placing the cursor, which is what this always did.
		await plugin.app.workspace.openLinkText(file.path, '', false);
		const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		const position = view.editor.offsetToPos(offset);
		view.editor.setCursor(position);
		view.editor.scrollIntoView({ from: position, to: position }, true);
	}

	function validateContentSearch(): boolean {
		contentRegexError = '';
		if (!contentFind) {
			contentPreviewResult = null;
			return false;
		}

		const flags = 'g' + (contentCaseSensitive ? '' : 'i');

		try {
			new RegExp(
				contentIsRegex
					? contentFind
					: contentFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
				flags,
			);
		} catch {
			contentRegexError = translate('content.invalid_regex');
			return false;
		}
		return true;
	}

	function clearContentSearchState(): void {
		nativeSearchAdapter.cancel();
		nativeSearchAdapter.resetRetained();
		contentMatchRanges = {};
		nativeSearchAdapter.setMatchRanges(new Map());
		contentScanCursor = 0;
		contentSearchLaunchToken = '';
		contentSearchRun = createTextSearchRun({
			query: '',
			isRegex: false,
			caseSensitive: false,
			isExclusion: false,
			scopeRevision: contentSearchScopeRevision,
		});
		contentFind = '';
		contentReplace = '';
		contentPreviewResult = null;
		contentPreviewOpen = true;
		contentRegexError = '';
		contentIsExclusion = false;
		collapsedContentFilePaths = [];
		activeContentRevealPath = null;
		plugin.filterService.setContentSearchRule('', []);
		onContentFilterChanged?.();
	}

	$effect(() => {
		const revision = clearFiltersRevision;
		if (lastClearFiltersRevision === null) {
			lastClearFiltersRevision = revision;
			return;
		}
		if (revision === lastClearFiltersRevision) return;
		lastClearFiltersRevision = revision;
		clearContentSearchState();
	});

	$effect(() => {
		const scopeRevision = contentSearchScopeRevision;
		const tab = filtersActiveTab;
		const find = contentFind;
		const caseSensitive = contentCaseSensitive;
		const isRegex = contentIsRegex;
		const isExclusion = contentIsExclusion;
		const files = contentSearchScopeFiles();

		// U121-016: leaving the Text tab must not touch the run. The pane stays
		// mounted, so cancelling or resetting here is what used to throw away
		// in-flight progress and restart the scan on the way back.
		if (tab !== 'content') return;

		const reconciled = reconcileTextSearchRun(contentSearchRun, {
			query: find,
			isRegex,
			caseSensitive,
			isExclusion,
			scopeRevision,
		});
		if (reconciled !== contentSearchRun) {
			// Only a real intent change throws the accumulated matches away. A
			// scope-only move keeps them: it fires on this search's own tail
			// (`onContentFilterChanged` -> `updateStats` -> new scope revision),
			// and treating it as a new search cancelled the scan that had just
			// started, over and over, so nothing ever completed.
			const intentChanged = !sameTextSearchIntent(
				contentSearchRun.signature,
				reconciled.signature,
			);
			// Only an intent change cancels. `reconciled` reaching here as
			// `running` already implies a different intent — a scope-only move
			// comes back by identity — so the extra `phase === 'running'` arm this
			// used to carry was unreachable, and while reconcile still minted runs
			// on a scope move it was the other half of the crash: cancel cleared
			// the launch token, the next pass relaunched, the scan moved the scope
			// revision, and the effect re-entered until Svelte gave up.
			if (intentChanged) {
				nativeSearchAdapter.cancel();
				contentSearchLaunchToken = '';
				nativeSearchAdapter.resetRetained();
				contentScanCursor = 0;
				// Levels belong to the results of the query that just changed.
			}
			contentSearchRun = reconciled;
		}
		const run = reconciled;

		if (run.phase === 'idle') {
			contentPreviewResult = null;
			contentRegexError = '';
			collapsedContentFilePaths = [];
			plugin.filterService.setContentSearchRule('', []);
			onContentFilterChanged?.();
			return;
		}
		if (!validateContentSearch()) {
			plugin.filterService.setContentSearchRule('', [], false);
			onContentFilterChanged?.();
			return;
		}
		if (!textSearchShouldScan(run)) {
			// BT4-018 still holds for the frozen view: the partial matches become
			// the effective files filter and replace unlocks. What changed is that
			// the cursor survives, so resuming continues instead of restarting.
			const frozen = contentPreviewResult;
			if (frozen?.isLoading) {
				contentPreviewResult = { ...frozen, isLoading: false };
			}
			const matched =
				frozen?.matchedFiles ?? frozen?.files.map((entry) => entry.file) ?? [];
			// Applied once per frozen state, not on every pass. Re-applying it
			// moves the host's scope revision, which re-runs this effect, which
			// re-applies it: that loop froze the app on pause.
			// `isExclusion` is in the token because it is deliberately NOT part of
			// the search signature: toggling Has/Hasn't must re-publish the rule
			// without re-scanning a single file.
			const frozenToken = `${run.generation}:${run.phase}:${matched.length}:${isExclusion}`;
			if (contentFrozenApplyToken !== frozenToken) {
				contentFrozenApplyToken = frozenToken;
				// Freezing the view is not stopping the search. Without this the
				// adapter's poll loop stayed alive and kept publishing updates, so
				// the count climbed while the UI said "paused" — and core itself was
				// never told to stop, because `stopSearch()` lives in `cancel()`.
				nativeSearchAdapter.cancel();
				if (isExclusion) {
					plugin.filterService.setContentSearchRule(find, matched, true);
				} else {
					plugin.filterService.setContentSearchRule(find, matched);
				}
				onContentFilterChanged?.();
			}
			return;
		}
		contentFrozenApplyToken = '';

		// One scan per intent — but the token is claimed inside the timer, not
		// here. Claiming it up front meant an effect re-run during the debounce
		// cancelled the pending timer and then declined to reschedule it, so the
		// search never started at all.
		const launchToken = textSearchLaunchToken(run);
		if (!shouldLaunchTextSearch(run, contentSearchLaunchToken)) return;

		const resumeFrom = run.resumeFrom;
		// Read off the run, not off a one-shot flag. Whether the preview opens
		// empty is a question about what the user asked for, and the answer has to
		// survive every pass of this effect until the scan actually starts. It was
		// gated on `resumeFrom === 0` — but the native path never calls
		// `onProgress`, so a scan through core leaves the cursor at 0 and a Resume
		// arrived indistinguishable from a fresh search — and then on a boolean the
		// first pass consumed, so a second pass blanked it anyway. Measured on the
		// running plugin: 201 rows -> 0 -> 201 over ~500 ms, every Resume.
		const resuming = run.resumed;
		if (!resuming) {
			contentPreviewResult = {
				totalMatches: 0,
				files: [],
				moreFiles: 0,
				isLoading: true,
			};
			collapsedContentFilePaths = [];
		} else {
			// Untracked, and written at most once. Reading the preview here made it
			// a dependency of this effect, and the line below writes a fresh object
			// straight back to it — the effect invalidated itself. Nothing broke the
			// cycle either: the launch token is claimed inside the debounce timer
			// (below), and this effect's teardown clears that timer on every re-run,
			// so the scan never started and `shouldLaunchTextSearch` never turned
			// false. Only `resumeFrom > 0` reaches this branch, which is why a first
			// search was fine and Resume took the app down.
			const frozen = untrack(() => contentPreviewResult);
			if (frozen && !frozen.isLoading) {
				contentPreviewResult = { ...frozen, isLoading: true };
			}
		}
		contentPreviewOpen = true;
		const timer = window.setTimeout(() => {
			// Claimed here, once the scan is really starting.
			contentSearchLaunchToken = launchToken;
			// Deferred with the scan: setContentSearchPending re-runs the whole
			// filter pipeline synchronously, which froze typing when it fired
			// per keystroke (BT4-008).
			//
			// Skipped on a resume: pending clears the rule, which empties every
			// node in the explorer until the scan republishes it. A resume already
			// has a valid frozen rule, so re-entering pending only produced a
			// full blank/repopulate flash.
			if (!resuming) {
				if (isExclusion) {
					plugin.filterService.setContentSearchPending(find, true);
				} else {
					plugin.filterService.setContentSearchPending(find);
				}
				onContentFilterChanged?.();
			}
			void nativeSearchAdapter
				.search({
					query: find,
					isRegex,
					caseSensitive,
					scopeFiles: files,
					resumeFrom,
					// Stated so the adapter can seed the first frame from the
					// retained floor. Not `preferLocal`: that routes past core into
					// a `cachedRead` walk of the vault on the UI thread, and since
					// the native path never advances the cursor it restarted that
					// walk from index 0 on every Resume. Core is re-issued and its
					// results merge onto the floor, which is the simulated resume
					// this feature was specified as.
					resume: resuming,
					onProgress: (nextIndex) => {
						contentScanCursor = nextIndex;
					},
					onUpdate: (result) => {
						contentPreviewResult = result;
						contentPreviewOpen = true;
						// Extra context is applied by the adapter's own builds, so a poll
						// needs no rebuild here.
						if (!result.isLoading) {
							// Settling short scans as "paused" made the control invert:
							// the machine was already paused, so the dev's next click
							// read as Resume and launched a full rescan. Until the
							// traversal is genuinely ours, a finished scan is reported
							// as finished — a button that does what its label says beats
							// a more accurate label that does the wrong thing.
							contentSearchLaunchToken = '';
							contentSearchRun = completeTextSearchRun(
								advanceTextSearchRun(contentSearchRun, contentScanCursor),
							);
							const matched =
								result.matchedFiles ?? result.files.map((entry) => entry.file);
							if (isExclusion) {
								plugin.filterService.setContentSearchRule(find, matched, true);
							} else {
								plugin.filterService.setContentSearchRule(find, matched);
							}
							onContentFilterChanged?.();
						}
					},
				})
				.catch((error) => console.error(error));
		}, 250);

		// Only the debounce is torn down here. Cancelling the adapter on teardown
		// is what made a tab switch kill an in-flight scan (U121-016); the run
		// itself decides when a traversal stops.
		return () => {
			window.clearTimeout(timer);
		};
	});

	onDestroy(() => nativeSearchAdapter.destroy());

	// U121-019 #51: both are bridges to affordances core already ships. Neither
	// belongs in the renderer, so the buttons in tabContent only call these.
	// U121-019 #51: one overflow menu on the result header. Both entries are
	// occasional and the header is narrow, so they live behind a vertical
	// ellipsis rather than taking a cell each.
	// U121-019 #51: one overflow menu on the result header. Both entries are
	// occasional and the header is narrow, so they live behind a vertical
	// ellipsis rather than taking a cell each.
	/** Open one match further out, in one direction, the way core's chevrons do. */
	function showMoreContext(
		filePath: string,
		matchIndex: number,
		direction: 'before' | 'after',
	): void {
		const input = nativeSearchAdapter
			.retainedInputs()
			.find((entry) => entry.file.path === filePath);
		const offsets = input?.offsets[matchIndex];
		if (!input || !offsets) return;

		const key = `${filePath}:${String(matchIndex)}`;
		const fileCache = extraContextOptions().fileCache(filePath);
		const current =
			contentMatchRanges[key] ??
			extraContextRange(
				input.content,
				offsets,
				contentExtraContext ? fileCache : {},
			);
		const next =
			direction === 'before'
				? showMoreBefore(input.content, current, fileCache)
				: showMoreAfter(input.content, current, fileCache);
		if (next[0] === current[0] && next[1] === current[1]) return;

		contentMatchRanges = { ...contentMatchRanges, [key]: next };
		// The adapter publishes every poll, so it needs these too — otherwise the
		// next poll rebuilds this file without the override and the expansion
		// undoes itself within 150ms.
		nativeSearchAdapter.setMatchRanges(
			new Map(Object.entries(contentMatchRanges)),
		);
		republishContentPreview();
	}

	/**
	 * The match row's own menu.
	 *
	 * Three entries, and the middle one only exists when it has something to
	 * undo: a row that was never opened up has no context to put back.
	 */
	function openSnippetContextMenu(
		filePath: string,
		matchIndex: number,
		event: MouseEvent,
	): void {
		const key = `${filePath}:${String(matchIndex)}`;
		const menu = new Menu();
		const replacement = contentReplace;

		menu.addItem((item) =>
			item
				.setTitle(
					replacement.length > 0
						? translate('content.replace_occurrence')
						: translate('content.replace_occurrence_needs_value'),
				)
				.setIcon('lucide-replace')
				.setDisabled(replacement.length === 0)
				.onClick(() => {
					queueOccurrenceReplace(filePath, matchIndex);
				}),
		);

		if (contentMatchRanges[key]) {
			menu.addItem((item) =>
				item
					.setTitle(translate('content.reset_context_here'))
					.setIcon('lucide-chevrons-down-up')
					.onClick(() => {
						const { [key]: _dropped, ...rest } = contentMatchRanges;
						contentMatchRanges = rest;
						nativeSearchAdapter.setMatchRanges(
							new Map(Object.entries(contentMatchRanges)),
						);
						republishContentPreview();
					}),
			);
		}

		menu.addItem((item) =>
			item
				.setTitle(translate('content.more_context_here'))
				.setIcon('lucide-chevrons-up-down')
				.onClick(() => {
					showMoreContext(filePath, matchIndex, 'before');
					showMoreContext(filePath, matchIndex, 'after');
				}),
		);

		menu.showAtMouseEvent(event);
	}

	/**
	 * Queue a replacement of one match rather than of every match in the file.
	 *
	 * The offset the snippet already carries names which one; the executor checks
	 * that the text is still there before writing, so a note edited since the
	 * search is skipped instead of rewritten at a stale position.
	 */
	function queueOccurrenceReplace(filePath: string, matchIndex: number): void {
		const input = nativeSearchAdapter
			.retainedInputs()
			.find((entry) => entry.file.path === filePath);
		const offsets = input?.offsets[matchIndex];
		if (!input || !offsets) return;

		const find = contentFind;
		const replace = contentReplace;
		const isRegex = contentIsRegex;
		const caseSensitive = contentCaseSensitive;
		const occurrenceOffset = offsets[0];

		plugin.queueService.addOrRun({
			type: 'content_replace',
			action: 'find_replace_content',
			details: `${translate('queue.details.replace')} ${find} → ${replace}`,
			files: [input.file],
			find,
			replace,
			isRegex,
			caseSensitive,
			logicFunc: () => ({
				[FIND_REPLACE_CONTENT]: {
					pattern: find,
					replacement: replace,
					isRegex,
					caseSensitive,
					occurrenceOffset,
				},
			}),
			customLogic: true,
		} as PendingChange);
	}

	/** Rebuild the published preview at the current extra-context setting. */
	function republishContentPreview(): void {
		const inputs = nativeSearchAdapter.retainedInputs();
		if (inputs.length === 0) return;
		contentPreviewResult = buildNativeSearchPreview(
			inputs,
			contentPreviewResult?.isLoading ?? false,
			contentPreviewResult?.totalMatches,
			extraContextOptions(),
		);
	}

	/**
	 * The options every build shares. `fileCache` is only consulted when the flag
	 * is on, so an ordinary poll never touches the metadata cache.
	 */
	function extraContextOptions() {
		return {
			cache: nativeSearchAdapter.previewMemo(),
			extraContext: contentExtraContext,
			matchRanges: new Map(Object.entries(contentMatchRanges)),
			fileCache: (path: string) => {
				const file = plugin.app.vault.getAbstractFileByPath(path);
				return file instanceof TFile
					? (plugin.app.metadataCache.getFileCache(file) ?? {})
					: {};
			},
		};
	}

	function openContentHeaderMenu(event: MouseEvent): void {
		const menu = new Menu();
		const matched =
			contentPreviewResult?.matchedFiles ??
			contentPreviewResult?.files.map((entry) => entry.file) ??
			[];

		menu.addItem((item) =>
			item
				.setTitle(translate('content.copy_results'))
				.setIcon('lucide-copy')
				.setDisabled(matched.length === 0)
				.onClick(() => {
					if (matched.length === 0) {
						new Notice(translate('content.copy_no_results'));
						return;
					}
					// Our files, not core's result set: core's modal reads its own DOM,
					// which our scan stops and which never knew our scope.
					new CopySearchResultsModal(plugin.app, matched).open();
				}),
		);

		menu.addItem((item) =>
			item
				.setTitle(translate('content.show_more_context'))
				.setIcon('lucide-text')
				.setChecked(contentExtraContext)
				.onClick(() => {
					// Core's switch is view-wide and re-renders every match, so the
					// whole memo goes with it.
					contentExtraContext = !contentExtraContext;
					nativeSearchAdapter.setExtraContext(
						contentExtraContext,
						extraContextOptions().fileCache,
					);
					republishContentPreview();
				}),
		);

		menu.addItem((item) =>
			item
				.setTitle(translate('content.bookmark_search'))
				.setIcon('lucide-bookmark')
				.setDisabled(contentFind.trim().length === 0)
				.onClick(() => {
					void bookmarkSearchQuery(plugin.app, contentFind, {
						caseSensitive: contentCaseSensitive,
						isRegex: contentIsRegex,
					}).then((opened) => {
						if (!opened) new Notice(translate('content.bookmarks_unavailable'));
					});
				}),
		);

		menu.showAtMouseEvent(event);
	}

	function queueContentReplace() {
		if (!contentFind) return;
		if (!validateContentSearch()) return;
		const files = contentPreviewResult?.matchedFiles ?? [];
		if (files.length === 0) {
			new Notice(translate('content.queue_no_matches'));
			return;
		}

		plugin.queueService.addOrRun({
			type: 'content_replace',
			action: 'find_replace_content',
			// BT5-085: the queue row showed only `find → replace`, which read as a
			// value pair with no verb. Every other operation names itself.
			details: `${translate('queue.details.replace')} ${contentFind} → ${contentReplace}`,
			files: [...files],
			find: contentFind,
			replace: contentReplace,
			isRegex: contentIsRegex,
			caseSensitive: contentCaseSensitive,
			logicFunc: () => ({
				[FIND_REPLACE_CONTENT]: {
					pattern: contentFind,
					replacement: contentReplace,
					isRegex: contentIsRegex,
					caseSensitive: contentCaseSensitive,
				},
			}),
			customLogic: true,
		} as PendingChange);
	}

	const panelWidgetActionPort: ScenePanelWidgetActionPort = {
		async invoke(invocation) {
			const event =
				invocation.payload?.event instanceof MouseEvent
					? invocation.payload.event
					: new MouseEvent('click');
			if (invocation.actionId.startsWith('header:')) {
				const action = contentHeaderActions.find(
					(candidate) =>
						candidate.id === invocation.actionId.slice('header:'.length),
				);
				if (!action || action.disabled) return false;
				action.onClick(event);
				return true;
			}

			if (invocation.actionId === 'reveal-active-file') {
				measureSceneSync(
					'scene.action.reveal-active-file.files',
					undefined,
					() => fileList?.autoRevealActiveFile(),
				);
				return true;
			}

			if (invocation.actionId === 'toggle-expansion') {
				const panel =
					explorerActiveTab === 'files'
						? fileList
						: explorerActiveTab === 'props'
							? propExplorer
							: explorerActiveTab === 'tags'
								? tagsExplorer
								: undefined;
				if (!panel) return false;
				const expanded = panel.hasExpandedNodes();
				measureSceneSync(
					expanded
						? `scene.action.collapse-all.${explorerActiveTab}`
						: `scene.action.expand-all.${explorerActiveTab}`,
					undefined,
					() => {
						if (expanded) panel.collapseAll();
						else panel.expandAll();
					},
				);
				return true;
			}

			if (invocation.actionId === 'create-file') {
				await fileList?.createFromSearch(0, filtersSearch);
				return true;
			}
			if (invocation.actionId === 'create-folder') {
				await fileList?.createFromSearch(1, filtersSearch);
				return true;
			}
			if (invocation.actionId.startsWith('command:')) {
				executeObsidianCommand(
					plugin.app,
					invocation.actionId.slice('command:'.length),
				);
				return true;
			}
			return false;
		},
	};

	$effect(() => {
		const state: NavbarPanelWidgetState = {
			providerId: filtersActiveTab,
			actionPort: panelWidgetActionPort,
			activeTab: explorerActiveTab,
			filtersSearch,
			filtersSearchCategory,
			searchExpanded: panelWidgetSearchExpanded,
			onSearchExpandedChange: (expanded) => {
				panelWidgetSearchExpanded = expanded;
			},
			tagsExplorer,
			propExplorer,
			fileList,
			snippetsExplorer,
			pluginsExplorer,
			icon,
			addOpCount,
			minimalStyle,
			showDock,
			tabOptions: minimalStyle ? filterTabOptions : [],
			tabMenuActions,
			headerActions: [...contentHeaderActions, ...valueMoveHeaderActions],
			searchTrailingActions,
			onSearchTrailingAction: runSearchTrailingAction,
			activeSectionTab: filtersActiveTab,
			onSectionTabChange: switchFiltersTab,
			onContentSearch: activateNodeContentSearch,
			onFiltersSearchChange: setExplorerSearch,
			onFiltersSearchCategoryChange: (next) => {
				filtersSearchCategory = {
					...filtersSearchCategory,
					...next,
				};
			},
			showExplorerControls: isExplorerControlTab,
			expansionRevision,
			onViewFiltersChanged,
			floatingTocEnabled,
			onToggleFloatingToc,
			toolbarToolsMenu,
			toolbarOverflowStrategy,
			createActionsPlacement,
			commandActions,
			onRunCommand: (id) => executeObsidianCommand(plugin.app, id),
			sortLevelInline,
			orderCellsByActivation,
			frameWidth,
			onToggleToolbar: toggleToolbar,
			savedLayouts,
			onSaveLayout: saveLayout,
			onLayoutLoaded: (layout) => applyFloatingTocState?.(layout.floatingToc),
			toolbarShown: showToolbar,
			app: plugin.app,
			showTabLabels,
		};

		onPanelWidgetStateChange?.(state);

		if (sceneInstanceId && generation) {
			const owner = {
				sceneInstanceId,
				providerId: filtersActiveTab,
				generation,
			};
			onPublishPanelWidget?.({
				...owner,
				projection: state,
			});

			return () => {
				onClearPanelWidget?.(owner);
			};
		}
	});
</script>

{#if !minimalStyle}
	<NavbarTabs
		activeTab={filtersActiveTab}
		showLabels={showTabLabels}
		{minimalStyle}
		onTabChange={switchFiltersTab}
		{icon}
	/>
{/if}

<div class="vaultman-filters-tab-content">
	{#if visitedTabs.files || filtersActiveTab === 'files'}
		<div
			class="vaultman-filters-tab-pane"
			class:is-active={filtersActiveTab === 'files'}
			aria-hidden={filtersActiveTab !== 'files'}
		>
			<FilesTab
				{plugin}
				bind:fileList
				onSelectionChange={(count) => (selectedCount = count)}
			/>
		</div>
	{/if}
	{#if visitedTabs.tags || filtersActiveTab === 'tags'}
		<div
			class="vaultman-filters-tab-pane"
			class:is-active={filtersActiveTab === 'tags'}
			aria-hidden={filtersActiveTab !== 'tags'}
		>
			<FiltersTagsTab
				{plugin}
				searchTerm={filtersSearchByTab.tags}
				searchMode={filtersSearchCategory.tags}
				bind:tagsExplorer
			/>
		</div>
	{/if}
	{#if visitedTabs.props || filtersActiveTab === 'props'}
		<div
			class="vaultman-filters-tab-pane"
			class:is-active={filtersActiveTab === 'props'}
			aria-hidden={filtersActiveTab !== 'props'}
		>
			<FiltersPropsTab
				{plugin}
				searchTerm={filtersSearchByTab.props}
				searchMode={filtersSearchCategory.props}
				bind:propExplorer
			/>
		</div>
	{/if}
	{#if visitedTabs.content || filtersActiveTab === 'content'}
		<div
			class="vaultman-filters-tab-pane"
			class:is-active={filtersActiveTab === 'content'}
			aria-hidden={filtersActiveTab !== 'content'}
		>
			<TabContent
				bind:contentFind
				bind:contentReplace
				bind:contentCaseSensitive
				bind:contentIsRegex
				bind:contentIsExclusion
				bind:contentPreviewResult
				bind:contentPreviewOpen
				{contentRegexError}
				{contentPreviewFileCount}
				{contentHasActiveNonContentFilters}
				{contentExcludedFileCount}
				{activeContentRevealPath}
				{activeContentFilePath}
				{contentRevealRevision}
				{sortedContentFiles}
				{isContentFileExpanded}
				{toggleContentFile}
				{queueContentReplace}
				{openContentMatch}
				{onOpenFilters}
				{queuedRenameBadge}
				{cancelQueuedRename}
				badgeCancelClickMode={plugin.settings.badgeCancelClickMode}
				onContentContextMenu={openContentContextMenu}
				onHeaderMenu={openContentHeaderMenu}
				onShowMoreContext={showMoreContext}
				onSnippetContextMenu={openSnippetContextMenu}
			/>
		</div>
	{/if}
	{#if visitedTabs.snippets || filtersActiveTab === 'snippets'}
		<div
			class="vaultman-filters-tab-pane"
			class:is-active={filtersActiveTab === 'snippets'}
			aria-hidden={filtersActiveTab !== 'snippets'}
		>
			<SnippetsTab
				{plugin}
				active={filtersActiveTab === 'snippets'}
				searchTerm={filtersSearchByTab.snippets}
				bind:panel={snippetsExplorer}
			/>
		</div>
	{/if}
	{#if visitedTabs.plugins || filtersActiveTab === 'plugins'}
		<div
			class="vaultman-filters-tab-pane"
			class:is-active={filtersActiveTab === 'plugins'}
			aria-hidden={filtersActiveTab !== 'plugins'}
		>
			<PluginsTab
				{plugin}
				active={filtersActiveTab === 'plugins'}
				searchTerm={filtersSearchByTab.plugins}
				bind:panel={pluginsExplorer}
			/>
		</div>
	{/if}
</div>
