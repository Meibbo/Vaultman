<script lang="ts">
	import { untrack } from 'svelte';
	import { translate } from '../../i18n/index';
	import type {
		ExplorerSortState,
		ExplorerTabId,
		SortScopeKey,
	} from '../../types/typeUI';
	import {
		nextExplorerSortDirection,
		sortDirectionGlyph,
		sortDirectionIcon,
	} from '../../logic/logicSort';
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
	import {
		byLevelModel,
		NODE_TYPE_MENU_OPTIONS,
		visibleSortOptions,
		type ByLevelMenuItem,
	} from '../../logic/logicSortMenu';

	type FiltersTab = ExplorerTabId;

	let {
		activeTab,
		onClose,
		onSortChange,
		onFilterChange,
		onScopeChange,
		onRequestDrillPick,
		onNestedToggle,
		initialSortState,
		nestedActive = false,
		revealActive = false,
		treeCapable = true,
		icon,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		onSortChange?: (state: ExplorerSortState) => void;
		onFilterChange?: (state: ExplorerSortState) => void;
		onScopeChange?: (state: ExplorerSortState) => void;
		onRequestDrillPick?: () => void;
		onNestedToggle?: () => void;
		initialSortState?: ExplorerSortState;
		nestedActive?: boolean;
		revealActive?: boolean;
		treeCapable?: boolean;
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
	const activeSort = $derived(activeScopeSort(activeTab, sortState));
	const levelModel = $derived(
		byLevelModel(activeTab, sortState, nestedActive, treeCapable),
	);
	const visibleSortOptionsForActiveTab = $derived(
		visibleSortOptions(activeTab, sortState, nestedActive, revealActive),
	);

	// Close transient drawers only when switching explorer surfaces.
	$effect(() => {
		void activeTab;
		drawerOpen = false;
		levelDrawerOpen = false;
	});

	// Keep an open popup in sync with native menus and restored layouts.
	$effect(() => {
		void initialSortState;
		sortState = normalizeExplorerSortState(activeTab, initialSortState ?? null);
		nodeTypeFilters = initialSortState
			? nodeTypeFiltersForState(initialSortState)
			: [];
	});

	function emitSortChange() {
		sortState = {
			...sortState,
			...nodeTypeFilterPatch(nodeTypeFilters),
		};
		onSortChange?.(sortState);
	}

	function emitFilterChange() {
		sortState = {
			...sortState,
			...nodeTypeFilterPatch(nodeTypeFilters),
		};
		onFilterChange?.(sortState);
	}

	function selectSort(id: string) {
		const direction = nextExplorerSortDirection(
			activeSort.sortBy,
			activeSort.direction,
			id,
		);
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
			toggleParentsFirst();
			return;
		}
		drawerOpen = !drawerOpen;
		if (drawerOpen) levelDrawerOpen = false;
	}

	function selectNodeTypeFilter(id: string) {
		nodeTypeFilters = toggleNodeTypeFilter(nodeTypeFilters, id);
		emitFilterChange();
	}

	function toggleParentsFirst() {
		sortState = {
			...sortState,
			parentsFirst: !(sortState.parentsFirst ?? true),
		};
		emitSortChange();
	}

	function toggleFixedFolders() {
		sortState = {
			...sortState,
			fixedFolders: sortState.fixedFolders === false,
		};
		emitSortChange();
	}

	function activateByLevelItem(item: ByLevelMenuItem) {
		if (item.kind === 'separator') return;
		if (item.kind === 'scope') {
			selectScope(item.scope);
			return;
		}
		if (item.id === 'nested') onNestedToggle?.();
		if (item.id === 'parentsFirst') toggleParentsFirst();
		if (item.id === 'fixedFolders') toggleFixedFolders();
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
			{#if levelDrawerOpen && levelModel}
				<div class="vaultman-sort-vertcol-drawer">
					{#each levelModel.items as opt (opt.id)}
						{#if opt.kind === 'separator'}
							<div
								class="vaultman-sort-drawer-separator"
								role="separator"
							></div>
						{:else}
							<button
								class="vaultman-sort-drawer-item"
								class:is-active={opt.checked}
								aria-label={translate(opt.labelKey)}
								title={translate(opt.labelKey)}
								onclick={() => activateByLevelItem(opt)}
								use:icon={opt.icon}
							></button>
						{/if}
					{/each}
				</div>
			{/if}
			<div
				class="vaultman-sort-vertcol-btn"
				class:is-active={activeTab === 'files'
					? (sortState.parentsFirst ?? true)
					: drawerOpen}
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
					{#each NODE_TYPE_MENU_OPTIONS[activeTab] as opt (opt.id)}
						<button
							class="vaultman-sort-drawer-item"
							class:is-active={nodeTypeFilters.includes(opt.id) ||
								(opt.id === 'all' && nodeTypeFilters.length === 0)}
							aria-label={translate(opt.labelKey)}
							title={translate(opt.labelKey)}
							onclick={() => selectNodeTypeFilter(opt.id)}
							use:icon={opt.icon}
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
			{#each visibleSortOptionsForActiveTab as opt (opt.id)}
				<div
					class="vaultman-squircle vaultman-sort-option"
					class:is-accent={activeSort.sortBy === opt.id}
					aria-label={translate(opt.labelKey) +
						(activeSort.sortBy === opt.id
							? ` ${sortDirectionGlyph(activeSort.direction)}`
							: '')}
					onclick={() => selectSort(opt.id)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') selectSort(opt.id);
					}}
					role="button"
					tabindex="0"
				>
					<span class="vaultman-squircle-icon" use:icon={opt.icon}></span>
					{#if activeSort.sortBy === opt.id}
						<span
							class="vaultman-sort-dir"
							use:icon={sortDirectionIcon(activeSort.direction)}
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
