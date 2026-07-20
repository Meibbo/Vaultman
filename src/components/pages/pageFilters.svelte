<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { MarkdownView, Menu, Notice, TFile } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import FiltersTagsTab from './tabTags.svelte';
	import FiltersPropsTab from './tabProps.svelte';
	import FilesTab from './tabFiles.svelte';
	import TabContent from './tabContent.svelte';
	import SnippetsTab from './tabSnippets.svelte';
	import PluginsTab from './tabPlugins.svelte';
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import NavbarFilters from '../layout/navbarFilters.svelte';
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
	import { NativeSearchAdapter } from '../../services/serviceNativeSearchAdapter';
	import {
		sortContentPreviewFiles,
		type ContentSortBy,
		type ContentSortDirection,
	} from '../../logic/logicContentPreview';
	import { refreshExplorerViewport } from '../../logic/logicExplorerViewportActivation';
	import { sortDirectionGlyph } from '../../logic/logicSort';
	import { observeActiveContentFile } from '../../logic/logicContentActiveFile';

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
	} = $props();

	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentSearchPaused = $state(false);
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
	const showToolbar = $derived.by(() => {
		void settingsRevision;
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
	// When hidden, the toolbar slides out of the frame and peeks back on hover of
	// the top edge, so it can be re-enabled from its own tabs menu.
	let toolbarPeek = $state(false);
	function toggleToolbar() {
		plugin.settings.showToolbar = plugin.settings.showToolbar === false;
		void plugin.saveSettings();
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

	function contentSearchScopeFiles(): TFile[] {
		if (contentSearchUsesSelectedScope()) return getSelectedFiles();
		return contentSearchCandidateFiles();
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
	const contentHeaderActions = $derived<HeaderAction[]>(
		filtersActiveTab === 'content'
			? [
					{
						id: 'content-pause',
						label: contentSearchPaused
							? translate('content.resume_search')
							: translate('content.pause_search'),
						icon: contentSearchPaused ? 'lucide-play' : 'lucide-pause',
						disabled: !contentFind,
						onClick: () => {
							contentSearchPaused = !contentSearchPaused;
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
		if (collapsedContentPathSet.has(filePath)) {
			collapsedContentFilePaths = collapsedContentFilePaths.filter(
				(path) => path !== filePath,
			);
			return;
		}
		collapsedContentFilePaths = [...collapsedContentFilePaths, filePath];
	}

	function toggleAllContentFiles() {
		if (contentFilePaths.length === 0) return;
		if (hasExpandedContentFiles) {
			collapsedContentFilePaths = contentFilePaths;
			return;
		}
		collapsedContentFilePaths = [];
		contentPreviewOpen = true;
	}

	function revealActiveContentFile() {
		const file = plugin.app.workspace.getActiveFile();
		if (!file) {
			new Notice(translate('content.reveal_no_active_file'));
			return;
		}
		const paths = new Set(sortedContentFiles.map((entry) => entry.file.path));
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

	async function openContentMatch(file: TFile, line: number, ch: number) {
		await plugin.app.workspace.openLinkText(file.path, '', false);
		const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		view.editor.setCursor({ line, ch });
		view.editor.scrollIntoView(
			{
				from: { line, ch },
				to: { line, ch },
			},
			true,
		);
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
		contentFind = '';
		contentReplace = '';
		contentPreviewResult = null;
		contentPreviewOpen = true;
		contentRegexError = '';
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
		void contentSearchScopeRevision;
		const tab = filtersActiveTab;
		const find = contentFind;
		const caseSensitive = contentCaseSensitive;
		const isRegex = contentIsRegex;
		const files = contentSearchScopeFiles();

		if (tab !== 'content') return;
		nativeSearchAdapter.cancel();
		if (!find) {
			contentPreviewResult = null;
			contentRegexError = '';
			contentSearchPaused = false;
			collapsedContentFilePaths = [];
			plugin.filterService.setContentSearchRule('', []);
			onContentFilterChanged?.();
			return;
		}
		if (!validateContentSearch()) {
			plugin.filterService.setContentSearchRule('', []);
			onContentFilterChanged?.();
			return;
		}
		const paused = contentSearchPaused;
		if (paused) {
			// BT4-018: freeze the scan where it stands — the partial matches
			// become the effective files filter, the loading state clears, and
			// replace unlocks. Resuming re-runs the full search.
			const frozen = contentPreviewResult;
			if (frozen?.isLoading) {
				contentPreviewResult = { ...frozen, isLoading: false };
			}
			const matched =
				frozen?.matchedFiles ?? frozen?.files.map((entry) => entry.file) ?? [];
			plugin.filterService.setContentSearchRule(find, matched);
			onContentFilterChanged?.();
			return;
		}
		contentPreviewResult = {
			totalMatches: 0,
			files: [],
			moreFiles: 0,
			isLoading: true,
		};
		contentPreviewOpen = true;
		collapsedContentFilePaths = [];
		const timer = window.setTimeout(() => {
			// Deferred with the scan: setContentSearchPending re-runs the whole
			// filter pipeline synchronously, which froze typing when it fired
			// per keystroke (BT4-008).
			plugin.filterService.setContentSearchPending(find);
			onContentFilterChanged?.();
			void nativeSearchAdapter
				.search({
					query: find,
					isRegex,
					caseSensitive,
					scopeFiles: files,
					onUpdate: (result) => {
						contentPreviewResult = result;
						contentPreviewOpen = true;
						if (!result.isLoading) {
							plugin.filterService.setContentSearchRule(
								find,
								result.matchedFiles ?? result.files.map((entry) => entry.file),
							);
							onContentFilterChanged?.();
						}
					},
				})
				.catch((error) => console.error(error));
		}, 250);

		return () => {
			window.clearTimeout(timer);
			nativeSearchAdapter.cancel();
		};
	});

	onDestroy(() => nativeSearchAdapter.destroy());

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
			details: `${contentFind} → ${contentReplace}`,
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

{#if isExplorerControlTab || minimalStyle}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="vaultman-toolbar-slot"
		class:is-hidden-mode={!showToolbar}
		class:is-peeking={toolbarPeek}
		onpointerleave={() => (toolbarPeek = false)}
	>
		<NavbarFilters
			activeTab={explorerActiveTab}
			{filtersSearch}
			bind:filtersSearchCategory
			{tagsExplorer}
			{propExplorer}
			{fileList}
			{snippetsExplorer}
			{pluginsExplorer}
			{addOpCount}
			{minimalStyle}
			{showDock}
			tabOptions={minimalStyle ? filterTabOptions : []}
			{tabMenuActions}
			headerActions={contentHeaderActions}
			activeSectionTab={filtersActiveTab}
			onSectionTabChange={switchFiltersTab}
			onContentSearch={activateNodeContentSearch}
			onFiltersSearchChange={setExplorerSearch}
			showExplorerControls={isExplorerControlTab}
			{expansionRevision}
			{onViewFiltersChanged}
			{floatingTocEnabled}
			{onToggleFloatingToc}
			{toolbarToolsMenu}
			{sortLevelInline}
			{orderCellsByActivation}
			{frameWidth}
			onToggleToolbar={toggleToolbar}
			{savedLayouts}
			onSaveLayout={saveLayout}
			onLayoutLoaded={(layout) => applyFloatingTocState?.(layout.floatingToc)}
			toolbarShown={showToolbar}
			app={plugin.app}
			{showTabLabels}
			{icon}
		/>
	</div>
	{#if !showToolbar}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="vaultman-toolbar-peek"
			onpointerenter={() => (toolbarPeek = true)}
		></div>
	{/if}
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
				bind:contentPreviewResult
				bind:contentPreviewOpen
				{contentRegexError}
				{contentPreviewFileCount}
				{contentHasActiveNonContentFilters}
				{activeContentRevealPath}
				{activeContentFilePath}
				{contentRevealRevision}
				{sortedContentFiles}
				{isContentFileExpanded}
				{toggleContentFile}
				{queueContentReplace}
				{openContentMatch}
				{onOpenFilters}
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
