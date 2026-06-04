<script lang="ts">
	import { TFile, setIcon } from 'obsidian';
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

	type FiltersTab = 'props' | 'tags' | 'content';
	type SearchTab = 'props' | 'files' | 'tags';

	let {
		plugin,
		filtersActiveTab = $bindable('props'),
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		settingsRevision = 0,
		getSelectedFiles,
		filteredCount,
		addOpCount = 0,
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: Record<SearchTab, number>;
		tagsExplorer: TagsExplorerPanel | null;
		propExplorer: PropsExplorerPanel | undefined;
		settingsRevision?: number;
		getSelectedFiles: () => TFile[];
		filteredCount: number;
		addOpCount?: number;
	} = $props();

	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(true);
	let contentPreviewing = $state(false);
	let contentRegexError = $state('');

	const explorerActiveTab = $derived(
		filtersActiveTab === 'content' ? 'props' : filtersActiveTab,
	);
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

	const contentScopeHint = $derived.by(() => {
		const scope = operationScope;
		const selected = getSelectedFiles();
		if (scope === 'selected' || (scope === 'auto' && selected.length > 0)) {
			return translate('content.scope_hint_selected').replace(
				'{count}',
				String(selected.length),
			);
		}
		return translate('content.scope_hint_filtered').replace(
			'{count}',
			String(filteredCount),
		);
	});

	function switchFiltersTab(tab: FiltersTab) {
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
	}

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
	}

	async function previewContentReplace() {
		contentRegexError = '';
		if (!contentFind) {
			contentPreviewResult = null;
			return;
		}

		const flags = 'g' + (contentCaseSensitive ? '' : 'i');
		const escaped = contentIsRegex
			? contentFind
			: contentFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		try {
			new RegExp(escaped, flags);
		} catch {
			contentRegexError = translate('content.invalid_regex');
			return;
		}

		contentPreviewing = true;
		const scope = operationScope;
		const selected = getSelectedFiles();
		const files =
			scope === 'selected' || (scope === 'auto' && selected.length > 0)
				? selected
				: plugin.filterService.filteredFiles;

		let totalMatches = 0;
		const fileResults: ContentPreviewResult['files'] = [];
		const MAX_FILES = 10;
		const MAX_SNIPPETS = 3;
		const CONTEXT = 40;
		let matchFileCount = 0;

		for (const file of files) {
			try {
				const content = await plugin.app.vault.read(file);
				const matches = [...content.matchAll(new RegExp(escaped, flags))];
				if (matches.length > 0) {
					matchFileCount++;
					totalMatches += matches.length;
					if (fileResults.length < MAX_FILES) {
						fileResults.push({
							file,
							matchCount: matches.length,
							snippets: matches.slice(0, MAX_SNIPPETS).map((match) => {
								const start = match.index ?? 0;
								const end = start + match[0].length;
								return {
									before: content.slice(Math.max(0, start - CONTEXT), start),
									match: match[0],
									after: content.slice(end, end + CONTEXT),
								};
							}),
						});
					}
				}
			} catch (error) {
				console.error(error);
			}
			if (matchFileCount % 20 === 0)
				await new Promise((resolve) => setTimeout(resolve, 0));
		}

		contentPreviewResult = {
			totalMatches,
			files: fileResults,
			moreFiles: Math.max(0, matchFileCount - fileResults.length),
		};
		contentPreviewing = false;
		contentPreviewOpen = true;
	}

	function queueContentReplace() {
		if (!contentFind) return;
		const scope = operationScope;
		const selected = getSelectedFiles();
		const files =
			scope === 'selected' || (scope === 'auto' && selected.length > 0)
				? selected
				: plugin.filterService.filteredFiles;

		plugin.queueService.add({
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

<NavbarTabs
	activeTab={filtersActiveTab}
	showLabels={showTabLabels}
	onTabChange={switchFiltersTab}
	{icon}
/>

{#if filtersActiveTab !== 'content'}
	<NavbarFilters
		activeTab={explorerActiveTab}
		bind:filtersSearch
		bind:filtersSearchCategory
		{tagsExplorer}
		{propExplorer}
		fileList={undefined}
		{addOpCount}
		{minimalStyle}
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
				{contentPreviewing}
				{contentRegexError}
				{contentScopeHint}
				{previewContentReplace}
				{queueContentReplace}
			/>
		{/if}
	</div>
{/key}
