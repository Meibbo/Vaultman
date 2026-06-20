<script lang="ts">
	import { untrack } from 'svelte';
	import { translate } from '../../i18n/index';
	import type { ExplorerSortState } from '../../types/typeUI';
	import {
		DEFAULT_EXPLORER_SORT_DIR,
		normalizeExplorerSortBy,
	} from '../../logic/logicSort';

	type FiltersTab = 'props' | 'files' | 'tags';

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
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
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
		initialSortState,
		icon,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		onSortChange?: (state: ExplorerSortState) => void;
		initialSortState?: ExplorerSortState;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let sortBy = $state(
		untrack(() => normalizeExplorerSortBy(initialSortState?.sortBy ?? 'name')),
	);
	let sortDir = $state<'asc' | 'desc'>(
		untrack(() => initialSortState?.direction ?? 'asc'),
	);
	let drawerOpen = $state(false);
	let vertTopActive = $state(
		untrack(() => initialSortState?.childLevel ?? false),
	);
	let nodeTypeFilter = $state<string | null>(
		untrack(() => initialSortState?.nodeTypeFilter ?? null),
	);
	let parentsFirst = $state(
		untrack(() => initialSortState?.parentsFirst ?? true),
	);
	const DEFAULT_DIR = DEFAULT_EXPLORER_SORT_DIR;

	// Reset per-tab state when the active tab changes.
	$effect(() => {
		void activeTab;
		sortBy = normalizeExplorerSortBy(initialSortState?.sortBy ?? 'name');
		sortDir = initialSortState?.direction ?? DEFAULT_DIR[sortBy] ?? 'asc';
		drawerOpen = false;
		vertTopActive = initialSortState?.childLevel ?? false;
		nodeTypeFilter = initialSortState?.nodeTypeFilter ?? null;
		parentsFirst = initialSortState?.parentsFirst ?? true;
	});

	function emitSortChange() {
		onSortChange?.({
			sortBy,
			direction: sortDir,
			childLevel: vertTopActive,
			nodeTypeFilter,
			parentsFirst,
		});
	}

	function selectSort(id: string) {
		if (sortBy === id) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = id;
			sortDir = DEFAULT_DIR[id] ?? 'asc';
		}
		emitSortChange();
	}

	function toggleChildLevel() {
		vertTopActive = !vertTopActive;
		emitSortChange();
	}

	function toggleDrawer() {
		if (activeTab === 'files') {
			parentsFirst = !parentsFirst;
			emitSortChange();
			return;
		}
		drawerOpen = !drawerOpen;
	}

	function selectNodeTypeFilter(id: string) {
		if (id === 'all') {
			nodeTypeFilter = null;
		} else {
			nodeTypeFilter = nodeTypeFilter === id ? null : id;
		}
		emitSortChange();
	}

	const vertTopIcon = $derived(
		activeTab === 'props'
			? 'lucide-list-tree'
			: activeTab === 'tags'
				? 'lucide-network'
				: 'lucide-circle',
	);

	const vertBotIcon = $derived(
		activeTab === 'files' ? 'lucide-folder-tree' : 'lucide-chevrons-down',
	);
</script>

<div class="vaultman-sort-popup">
	<!-- Vert-col: absolute, floats left over tab content -->
	<div class="vaultman-sort-vertcol">
		{#if activeTab !== 'files'}
			<div
				class="vaultman-sort-vertcol-btn"
				class:is-active={vertTopActive}
				aria-label={activeTab === 'props'
					? translate('sort.vertcol.props_values')
					: translate('sort.vertcol.node_level')}
				onclick={toggleChildLevel}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') toggleChildLevel();
				}}
				role="button"
				tabindex="0"
				use:icon={vertTopIcon}
			></div>
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
		{#if drawerOpen && activeTab !== 'files'}
			<div class="vaultman-sort-vertcol-drawer">
				{#each DRAWER_OPTIONS[activeTab] as opt (opt.id)}
					<button
						class="vaultman-sort-drawer-item"
						class:is-active={nodeTypeFilter === opt.id ||
							(opt.id === 'all' && nodeTypeFilter === null)}
						aria-label={translate(opt.labelKey)}
						title={translate(opt.labelKey)}
						onclick={() => selectNodeTypeFilter(opt.id)}
						use:icon={opt.iconName}
					></button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Main content panel: row 1 + row 2 -->
	<div class="vaultman-sort-main">
		<!-- Row 1: sort controls + close -->
		<div class="vaultman-sort-row vaultman-sort-row-controls">
			{#each SORT_OPTIONS[activeTab] as opt (opt.id)}
				<div
					class="vaultman-squircle vaultman-sort-option"
					class:is-accent={sortBy === opt.id}
					aria-label={translate(opt.labelKey) +
						(sortBy === opt.id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')}
					onclick={() => selectSort(opt.id)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') selectSort(opt.id);
					}}
					role="button"
					tabindex="0"
				>
					<span class="vaultman-squircle-icon" use:icon={opt.iconName}></span>
					{#if sortBy === opt.id}
						<span
							class="vaultman-sort-dir"
							use:icon={sortDir === 'asc'
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
