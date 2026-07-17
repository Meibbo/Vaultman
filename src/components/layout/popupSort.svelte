<script lang="ts">
	import { untrack } from 'svelte';
	import { translate } from '../../i18n/index';
	import type {
		ExplorerSortState,
		ExplorerTabId,
		SortScopeKey,
	} from '../../types/typeUI';
	import { DEFAULT_EXPLORER_SORT_DIR } from '../../logic/logicSort';
	import {
		activeScopeSort,
		normalizeExplorerSortState,
		replaceActiveScopeSort,
	} from '../../logic/logicScopedSort';
	import {
		nodeTypeFilterPatch,
		nodeTypeFiltersForState,
		toggleNodeTypeFilter,
	} from '../../logic/logicNodeTypeFilters';

	type FiltersTab = ExplorerTabId;

	type SortOption = {
		id: string;
		iconName: string;
		labelKey: string;
	};

	const SORT_OPTIONS: Record<FiltersTab, SortOption[]> = {
		props: [
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{
				id: 'mtime',
				iconName: 'lucide-calendar-clock',
				labelKey: 'sort.by.modified',
			},
			{
				id: 'ctime',
				iconName: 'lucide-calendar-plus',
				labelKey: 'sort.by.created',
			},
			{ id: 'sub', iconName: 'lucide-indent', labelKey: 'sort.by.sub' },
		],
		tags: [
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{
				id: 'mtime',
				iconName: 'lucide-calendar-clock',
				labelKey: 'sort.by.modified',
			},
			{
				id: 'ctime',
				iconName: 'lucide-calendar-plus',
				labelKey: 'sort.by.created',
			},
			{
				id: 'sub',
				iconName: 'lucide-indent',
				labelKey: 'sort.by.subtags',
			},
		],
		files: [
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.props' },
			{ id: 'words', iconName: 'lucide-text', labelKey: 'sort.by.words' },
			{ id: 'ext', iconName: 'lucide-file-type', labelKey: 'sort.by.ext' },
			{
				id: 'mtime',
				iconName: 'lucide-calendar-clock',
				labelKey: 'sort.by.modified',
			},
			{
				id: 'ctime',
				iconName: 'lucide-calendar-plus',
				labelKey: 'sort.by.created',
			},
			{
				id: 'path',
				iconName: 'lucide-route',
				labelKey: 'sort.by.path',
			},
		],
		snippets: [
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{
				id: 'installed',
				iconName: 'lucide-calendar-plus',
				labelKey: 'sort.by.installed',
			},
			{
				id: 'updated',
				iconName: 'lucide-calendar-clock',
				labelKey: 'sort.by.updated',
			},
		],
		plugins: [
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{
				id: 'installed',
				iconName: 'lucide-calendar-plus',
				labelKey: 'sort.by.installed',
			},
			{
				id: 'updated',
				iconName: 'lucide-calendar-clock',
				labelKey: 'sort.by.updated',
			},
		],
	};

	type DrawerOption = {
		id: string;
		iconName: string;
		labelKey: string;
	};

	const DRAWER_OPTIONS: Record<'props' | 'tags', DrawerOption[]> = {
		props: [
			{ id: 'tags', iconName: 'lucide-tags', labelKey: 'sort.type.tags' },
			{ id: 'list', iconName: 'lucide-list', labelKey: 'sort.type.list' },
			{ id: 'text', iconName: 'lucide-text', labelKey: 'sort.type.text' },
			{ id: 'number', iconName: 'lucide-binary', labelKey: 'sort.type.number' },
			{ id: 'date', iconName: 'lucide-calendar', labelKey: 'sort.type.date' },
			{
				id: 'checkbox',
				iconName: 'lucide-check-square',
				labelKey: 'sort.type.checkbox',
			},
			{
				id: 'aliases',
				iconName: 'lucide-forward',
				labelKey: 'sort.type.aliases',
			},
			{
				id: 'cssclasses',
				iconName: 'lucide-palette',
				labelKey: 'sort.type.cssclasses',
			},
			{
				id: 'unknown',
				iconName: 'lucide-file-question',
				labelKey: 'sort.type.unknown',
			},
		],
		tags: [
			{ id: 'all', iconName: 'lucide-tags', labelKey: 'sort.type.all' },
			{
				id: 'nested',
				iconName: 'lucide-git-branch',
				labelKey: 'sort.type.nested',
			},
			{ id: 'simple', iconName: 'lucide-tag', labelKey: 'sort.type.simple' },
		],
	};

	let {
		activeTab,
		onClose,
		onSortChange,
		onFilterChange,
		onScopeChange,
		onRequestDrillPick,
		initialSortState,
		icon,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		onSortChange?: (state: ExplorerSortState) => void;
		onFilterChange?: (state: ExplorerSortState) => void;
		onScopeChange?: (state: ExplorerSortState) => void;
		onRequestDrillPick?: () => void;
		initialSortState?: ExplorerSortState;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let sortState = $state<ExplorerSortState>(
		untrack(() =>
			normalizeExplorerSortState(activeTab, initialSortState ?? null),
		),
	);
	let drawerOpen = $state(false);
	let levelDrawerOpen = $state(false);
	let nodeTypeFilters = $state<string[]>(
		untrack(() =>
			initialSortState ? nodeTypeFiltersForState(initialSortState) : [],
		),
	);
	let parentsFirst = $state(
		untrack(() => initialSortState?.parentsFirst ?? true),
	);
	const DEFAULT_DIR = DEFAULT_EXPLORER_SORT_DIR;
	const activeSort = $derived(activeScopeSort(activeTab, sortState));
	const levelOptions = $derived<
		Array<{ scope: SortScopeKey; iconName: string; labelKey: string }>
	>(
		activeTab === 'props'
			? [
					{
						scope: 'properties',
						iconName: 'lucide-list-tree',
						labelKey: 'sort.level.properties',
					},
					{
						scope: 'values',
						iconName: 'lucide-list-collapse',
						labelKey: 'sort.level.values',
					},
				]
			: activeTab === 'files' || activeTab === 'tags'
				? [
						{
							scope: 'all',
							iconName: 'lucide-layers',
							labelKey: 'sort.level.all',
						},
						{
							scope: 'drill',
							iconName: 'lucide-mouse-pointer-click',
							labelKey: 'sort.level.drill',
						},
					]
				: [],
	);

	// Reset per-tab state when the active tab changes.
	$effect(() => {
		void activeTab;
		sortState = normalizeExplorerSortState(activeTab, initialSortState ?? null);
		drawerOpen = false;
		levelDrawerOpen = false;
		nodeTypeFilters = initialSortState
			? nodeTypeFiltersForState(initialSortState)
			: [];
		parentsFirst = initialSortState?.parentsFirst ?? true;
	});

	function emitSortChange() {
		sortState = {
			...sortState,
			...nodeTypeFilterPatch(nodeTypeFilters),
			parentsFirst,
		};
		onSortChange?.(sortState);
	}

	function emitFilterChange() {
		sortState = {
			...sortState,
			...nodeTypeFilterPatch(nodeTypeFilters),
			parentsFirst,
		};
		onFilterChange?.(sortState);
	}

	function selectSort(id: string) {
		const direction =
			activeSort.sortBy === id
				? activeSort.direction === 'asc'
					? 'desc'
					: 'asc'
				: (DEFAULT_DIR[id] ?? 'asc');
		sortState = replaceActiveScopeSort(activeTab, sortState, {
			sortBy: id,
			direction,
		});
		emitSortChange();
	}

	function selectScope(scope: SortScopeKey) {
		if (scope === 'drill') {
			onRequestDrillPick?.();
			levelDrawerOpen = false;
			return;
		}
		sortState = {
			...sortState,
			activeScope: scope,
			...(activeTab === 'props' ? {} : { drillNodeId: null }),
			...nodeTypeFilterPatch(nodeTypeFilters),
			parentsFirst,
		};
		levelDrawerOpen = false;
		onScopeChange?.(sortState);
	}

	function toggleLevelDrawer() {
		levelDrawerOpen = !levelDrawerOpen;
		if (levelDrawerOpen) drawerOpen = false;
	}

	function toggleDrawer() {
		if (activeTab === 'files') {
			parentsFirst = !parentsFirst;
			emitSortChange();
			return;
		}
		drawerOpen = !drawerOpen;
		if (drawerOpen) levelDrawerOpen = false;
	}

	function selectNodeTypeFilter(id: string) {
		nodeTypeFilters = toggleNodeTypeFilter(nodeTypeFilters, id);
		emitFilterChange();
	}

	const vertTopIcon = $derived(
		activeTab === 'props' ? 'lucide-list-tree' : 'lucide-layers',
	);

	const vertBotIcon = $derived(
		activeTab === 'files' ? 'lucide-folder-tree' : 'lucide-chevrons-down',
	);
</script>

<div class="vaultman-sort-popup">
	<!-- Vert-col: absolute, floats left over tab content -->
	{#if activeTab === 'props' || activeTab === 'files' || activeTab === 'tags'}
		<div class="vaultman-sort-vertcol">
			<div
				class="vaultman-sort-vertcol-btn"
				class:is-active={levelDrawerOpen}
				aria-label={translate('sort.level.title')}
				title={translate('sort.level.title')}
				onclick={toggleLevelDrawer}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') toggleLevelDrawer();
				}}
				role="button"
				tabindex="0"
				use:icon={vertTopIcon}
			></div>
			{#if levelDrawerOpen}
				<div class="vaultman-sort-vertcol-drawer">
					{#each levelOptions as opt (opt.scope)}
						<button
							class="vaultman-sort-drawer-item"
							class:is-active={sortState.activeScope === opt.scope}
							aria-label={translate(opt.labelKey)}
							title={translate(opt.labelKey)}
							onclick={() => selectScope(opt.scope)}
							use:icon={opt.iconName}
						></button>
					{/each}
				</div>
			{/if}
			<div
				class="vaultman-sort-vertcol-btn"
				class:is-active={activeTab === 'files' ? parentsFirst : drawerOpen}
				aria-label={activeTab === 'files'
					? translate('sort.parents_first')
					: translate('sort.vertcol.scope_drawer')}
				onclick={toggleDrawer}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') toggleDrawer();
				}}
				role="button"
				tabindex="0"
				use:icon={vertBotIcon}
			></div>
			{#if drawerOpen && (activeTab === 'props' || activeTab === 'tags')}
				<div class="vaultman-sort-vertcol-drawer">
					{#each DRAWER_OPTIONS[activeTab] as opt (opt.id)}
						<button
							class="vaultman-sort-drawer-item"
							class:is-active={nodeTypeFilters.includes(opt.id) ||
								(opt.id === 'all' && nodeTypeFilters.length === 0)}
							aria-label={translate(opt.labelKey)}
							title={translate(opt.labelKey)}
							onclick={() => selectNodeTypeFilter(opt.id)}
							use:icon={opt.iconName}
						></button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Main content panel: row 1 + row 2 -->
	<div
		class="vaultman-sort-main"
		class:vaultman-sort-main--flat={activeTab === 'snippets' ||
			activeTab === 'plugins'}
	>
		<!-- Row 1: sort controls + close -->
		<div class="vaultman-sort-row vaultman-sort-row-controls">
			{#each SORT_OPTIONS[activeTab] as opt (opt.id)}
				<div
					class="vaultman-squircle vaultman-sort-option"
					class:is-accent={activeSort.sortBy === opt.id}
					aria-label={translate(opt.labelKey) +
						(activeSort.sortBy === opt.id
							? activeSort.direction === 'asc'
								? ' ↑'
								: ' ↓'
							: '')}
					onclick={() => selectSort(opt.id)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') selectSort(opt.id);
					}}
					role="button"
					tabindex="0"
				>
					<span class="vaultman-squircle-icon" use:icon={opt.iconName}></span>
					{#if activeSort.sortBy === opt.id}
						<span
							class="vaultman-sort-dir"
							use:icon={activeSort.direction === 'asc'
								? 'lucide-arrow-up'
								: 'lucide-arrow-down'}
						></span>
					{/if}
				</div>
			{/each}
			<div
				class="vaultman-sort-close-btn clickable-icon"
				aria-label={translate('sort.close')}
				onclick={onClose}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') onClose();
				}}
				role="button"
				tabindex="0"
				use:icon={'lucide-chevron-right'}
			></div>
		</div>
	</div>
</div>
