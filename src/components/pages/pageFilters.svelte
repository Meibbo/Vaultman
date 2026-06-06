<script lang="ts">
	import { onDestroy } from 'svelte';
	import { MarkdownView, Notice, TFile, setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import { fade } from 'svelte/transition';
	import FiltersTagsTab from './tabTags.svelte';
	import FiltersPropsTab from './tabProps.svelte';
	import TabContent from './tabContent.svelte';
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import NavbarFilters from '../layout/navbarFilters.svelte';
	import type { PropsExplorerPanel } from '../containers/explorerProps';
	import type { TagsExplorerPanel } from '../containers/explorerTags';
	import type { ContentPreviewResult } from '../../types/typeUI';
	import {
		type PendingChange,
		FIND_REPLACE_CONTENT,
	} from '../../types/typeOps';
	import { translate } from '../../i18n/index';
	import { NativeSearchAdapter } from '../../services/serviceNativeSearchAdapter';

	type FiltersTab = 'props' | 'tags' | 'content';
	type SearchTab = 'props' | 'files' | 'tags';

	let {
		plugin,
		filtersActiveTab = $bindable('props'),
		filtersSearchByTab = $bindable({ props: '', tags: '', files: '' }),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		settingsRevision = 0,
		getSelectedFiles,
		filteredCount,
		addOpCount = 0,
		expansionRevision = 0,
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersTab;
		filtersSearchByTab: Record<SearchTab, string>;
		filtersSearchCategory: Record<SearchTab, number>;
		tagsExplorer: TagsExplorerPanel | null;
		propExplorer: PropsExplorerPanel | undefined;
		settingsRevision?: number;
		getSelectedFiles: () => TFile[];
		filteredCount: number;
		addOpCount?: number;
		expansionRevision?: number;
	} = $props();

	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(true);
	let contentRegexError = $state('');

	function createNativeSearchAdapter(): NativeSearchAdapter {
		return new NativeSearchAdapter(plugin.app);
	}

	const nativeSearchAdapter = createNativeSearchAdapter();

	const explorerActiveTab = $derived(
		filtersActiveTab === 'content' ? 'props' : filtersActiveTab,
	);
	const explorerSearchTab = $derived<SearchTab>(
		filtersActiveTab === 'tags' ? 'tags' : 'props',
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

	function switchFiltersTab(tab: FiltersTab) {
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
	}

	function setExplorerSearch(value: string) {
		filtersSearchByTab = {
			...filtersSearchByTab,
			[explorerSearchTab]: value,
		};
	}

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
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
		fileList={undefined}
		{addOpCount}
		{minimalStyle}
		tabOptions={minimalStyle ? filterTabOptions : []}
		activeSectionTab={filtersActiveTab}
		onSectionTabChange={(tab) => switchFiltersTab(tab as FiltersTab)}
		onFiltersSearchChange={setExplorerSearch}
		showExplorerControls={filtersActiveTab !== 'content'}
		{expansionRevision}
		{icon}
	/>
{/if}

{#key filtersActiveTab}
	<div
		class="vaultman-filters-tab-content"
		in:fade={{ duration: 180 }}
		out:fade={{ duration: 180 }}
	>
		{#if filtersActiveTab === 'tags'}
			<FiltersTagsTab
				{plugin}
				searchTerm={filtersSearch}
				searchMode={filtersSearchCategory.tags}
				bind:tagsExplorer
			/>
		{:else if filtersActiveTab === 'props'}
			<FiltersPropsTab
				{plugin}
				searchTerm={filtersSearch}
				searchMode={filtersSearchCategory.props}
				bind:propExplorer
			/>
		{:else if filtersActiveTab === 'content'}
			<TabContent
				bind:contentFind
				bind:contentReplace
				bind:contentCaseSensitive
				bind:contentIsRegex
				bind:contentPreviewResult
				bind:contentPreviewOpen
				{contentRegexError}
				{contentScopeHint}
				{queueContentReplace}
				{openContentMatch}
			/>
		{/if}
	</div>
{/key}
