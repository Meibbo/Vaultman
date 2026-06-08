<script lang="ts">
	import { onDestroy } from 'svelte';
	import { MarkdownView, Menu, Notice, TFile } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import FiltersTagsTab from './tabTags.svelte';
	import FiltersPropsTab from './tabProps.svelte';
	import FilesTab from './tabFiles.svelte';
	import TabContent from './tabContent.svelte';
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import NavbarFilters from '../layout/navbarFilters.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';
	import type { PropsExplorerPanel } from '../containers/explorerProps';
	import type { TagsExplorerPanel } from '../containers/explorerTags';
	import type { ContentPreviewResult } from '../../types/typeUI';
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

	type FiltersTab = 'files' | 'props' | 'tags' | 'content';
	type SearchTab = 'props' | 'files' | 'tags';
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
		filtersSearchByTab = $bindable({ props: '', tags: '', files: '' }),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		settingsRevision = 0,
		getSelectedFiles,
		filteredCount,
		showDock = true,
		queueWarningCount = 0,
		onOpenFilters,
		onClearFilters,
		onOpenQueue,
		onClearQueue,
		onOpenStatistics,
		addOpCount = 0,
		expansionRevision = 0,
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
		settingsRevision?: number;
		getSelectedFiles: () => TFile[];
		filteredCount: number;
		showDock?: boolean;
		queueWarningCount?: number;
		onOpenFilters?: () => void;
		onClearFilters?: () => void;
		onOpenQueue?: () => void;
		onClearQueue?: () => void;
		onOpenStatistics?: () => void;
		addOpCount?: number;
		expansionRevision?: number;
		icon: (el: HTMLElement, name: string) => any;
	} = $props();

	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(true);
	let contentRegexError = $state('');
	let contentSortBy = $state<ContentSortBy>('count');
	let contentSortDirection = $state<ContentSortDirection>('desc');
	let collapsedContentFilePaths = $state<string[]>([]);
	let visitedTabs = $state<Record<FiltersTab, boolean>>({
		files: filtersActiveTab === 'files',
		props: filtersActiveTab === 'props',
		tags: filtersActiveTab === 'tags',
		content: filtersActiveTab === 'content',
	});

	function createNativeSearchAdapter(): NativeSearchAdapter {
		return new NativeSearchAdapter(plugin.app);
	}

	const nativeSearchAdapter = createNativeSearchAdapter();

	const explorerActiveTab = $derived(
		filtersActiveTab === 'content' ? 'props' : filtersActiveTab,
	);
	const explorerSearchTab = $derived<SearchTab>(
		filtersActiveTab === 'files'
			? 'files'
			: filtersActiveTab === 'tags'
				? 'tags'
				: 'props',
	);
	const filtersSearch = $derived(filtersSearchByTab[explorerSearchTab] ?? '');
	const showTabLabels = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.filtersShowTabLabels;
	});
	const operationScope = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.explorerOperationScope;
	});
	const minimalStyle = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.minimalStyle;
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
				count: plugin.filterService.activeFilter.children.length,
				warning:
					plugin.filterService.activeFilter.children.length > 0 &&
					filteredCount === 0,
				tooltip:
					plugin.filterService.activeFilter.children.length > 0 &&
					filteredCount === 0
						? translate('filters.active_zero')
						: undefined,
				onClick: () => onOpenFilters?.(),
				onDoubleClick: () => onClearFilters?.(),
			},
			{
				id: 'queue',
				label: translate('ops.tab.queue'),
				icon: 'lucide-list-checks',
				count: plugin.queueService.queue.length,
				warning: queueWarningCount > 0,
				tooltip:
					queueWarningCount > 0
						? translate('ops.queue.warning', {
								count: plugin.queueService.queue.length,
								warnings: queueWarningCount,
							})
						: undefined,
				onClick: () => onOpenQueue?.(),
				onDoubleClick: () => onClearQueue?.(),
			},
		];
	});

	const contentScopeHint = $derived.by(() => {
		const scope = operationScope;
		const selected = getSelectedFiles();
		if (scope === 'selected' || (scope === 'auto' && selected.length > 0)) {
			return translate('content.scope_hint_selected').replace(
				'{count}',
				String(selected.length),
			);
		}
		const baseCount =
			plugin.filterService.getFilesIgnoringContentSearch().length;
		return translate('content.scope_hint_filtered').replace(
			'{count}',
			String(baseCount),
		);
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
						id: 'content-sort',
						label: translate('filter.sort_btn'),
						icon: 'lucide-arrow-up-down',
						onClick: openContentSortMenu,
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

	function switchFiltersTab(tab: FiltersTab) {
		ensureActiveTabVisited(filtersActiveTab);
		ensureActiveTabVisited(tab);
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
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
							isActive ? (contentSortDirection === 'asc' ? ' ↑' : ' ↓') : ''
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

	$effect(() => {
		void filteredCount;
		const tab = filtersActiveTab;
		const find = contentFind;
		const caseSensitive = contentCaseSensitive;
		const isRegex = contentIsRegex;
		const scope = operationScope;
		const selected = getSelectedFiles();
		const files =
			scope === 'selected' || (scope === 'auto' && selected.length > 0)
				? selected
				: plugin.filterService.getFilesIgnoringContentSearch();

		if (tab !== 'content') return;
		nativeSearchAdapter.cancel();
		if (!find) {
			contentPreviewResult = null;
			contentRegexError = '';
			collapsedContentFilePaths = [];
			plugin.filterService.setContentSearchRule('', []);
			return;
		}
		if (!validateContentSearch()) {
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

{#if filtersActiveTab !== 'content' || minimalStyle}
	<NavbarFilters
		activeTab={explorerActiveTab}
		{filtersSearch}
		bind:filtersSearchCategory
		{tagsExplorer}
		{propExplorer}
		{fileList}
		{addOpCount}
		{minimalStyle}
		{showDock}
		tabOptions={minimalStyle ? filterTabOptions : []}
		{tabMenuActions}
		headerActions={contentHeaderActions}
		activeSectionTab={filtersActiveTab}
		onSectionTabChange={(tab) => switchFiltersTab(tab as FiltersTab)}
		onFiltersSearchChange={setExplorerSearch}
		showExplorerControls={filtersActiveTab !== 'content'}
		{expansionRevision}
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
				bind:contentPreviewResult
				bind:contentPreviewOpen
				{contentRegexError}
				{contentScopeHint}
				{sortedContentFiles}
				{isContentFileExpanded}
				{toggleContentFile}
				{queueContentReplace}
				{openContentMatch}
			/>
		</div>
	{/if}
</div>
