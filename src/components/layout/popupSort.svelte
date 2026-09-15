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
		groupMenuModel,
		NODE_TYPE_MENU_OPTIONS,
		scopeMenuModel,
		supportsByLevel,
		visibleSortOptions,
		type ByLevelMenuItem,
		type GroupMenuItem,
		type ScopeMenuItem,
		type ScopeMenuScene,
	} from '../../logic/logicSortMenu';
	import {
		NO_GROUP_PRESET,
		type GroupPreset,
		type GroupPresetKind,
	} from '../../types/typeGroupPreset';
	import { createConfirmRow } from '../../logic/logicConfirmRow';

	type FiltersTab = ExplorerTabId;

	let {
		activeTab,
		onClose,
		onSortChange,
		onFilterChange,
		onScopeChange,
		onRequestDrillPick,
		onRequestLevelPick,
		onActivateScope,
		onHideScope,
		onDeleteScope,
		scopeScene,
		onRequestRevealPick,
		initialSortState,
		nestedActive = false,
		revealActive = false,
		treeCapable = true,
		groupPreset = NO_GROUP_PRESET,
		customGroups = [],
		canCreateGroup = false,
		onGroupPresetChange,
		onNewGroup,
		onHideGroup,
		onDeleteGroup,
		icon,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		onSortChange?: (state: ExplorerSortState) => void;
		onFilterChange?: (state: ExplorerSortState) => void;
		onScopeChange?: (state: ExplorerSortState) => void;
		onRequestDrillPick?: () => void;
		/** Spec 08 §3.1: `Select a level` pick, and the rows of parents/levels with a sort. */
		onRequestLevelPick?: () => void;
		onActivateScope?: (key: SortScopeKey) => void;
		onHideScope?: (key: SortScopeKey, hidden: boolean) => void;
		onDeleteScope?: (key: SortScopeKey) => void;
		scopeScene?: ScopeMenuScene;
		onRequestRevealPick?: () => void;
		initialSortState?: ExplorerSortState;
		nestedActive?: boolean;
		revealActive?: boolean;
		treeCapable?: boolean;
		/** Spec 08 §3.2: the groups submenu, per instance. */
		groupPreset?: GroupPreset;
		customGroups?: readonly { id: string; label: string; hidden?: boolean }[];
		canCreateGroup?: boolean;
		onGroupPresetChange?: (kind: GroupPresetKind) => void;
		onNewGroup?: () => void;
		/** Spec 08 §4: the hide/delete row pattern of the custom groups. */
		onHideGroup?: (id: string, hidden: boolean) => void;
		onDeleteGroup?: (id: string) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let sortState = $state<ExplorerSortState>(
		untrack(() =>
			normalizeExplorerSortState(activeTab, initialSortState ?? null),
		),
	);
	let drawerOpen = $state(false);
	let levelDrawerOpen = $state(false);
	let groupDrawerOpen = $state(false);
	const groupModel = $derived(
		groupMenuModel(activeTab, groupPreset, customGroups, canCreateGroup),
	);
	// Spec 08 §4: the custom-group row that is asking "Want to hide this
	// preset?"; it answers itself with cancel after 4 s.
	let confirmingGroupId = $state<string | null>(null);
	const confirmRow = createConfirmRow(
		{
			set: (callback, ms) => window.setTimeout(callback, ms),
			clear: (handle) => window.clearTimeout(handle as number),
		},
		(armed) => {
			confirmingGroupId = armed;
		},
	);
	let nodeTypeFilters = $state<string[]>(
		untrack(() =>
			initialSortState ? nodeTypeFiltersForState(initialSortState) : [],
		),
	);
	const activeSort = $derived(activeScopeSort(activeTab, sortState));
	const levelModel = $derived(
		byLevelModel(activeTab, sortState, treeCapable, revealActive),
	);
	const scopeModel = $derived(
		treeCapable && scopeScene
			? scopeMenuModel(activeTab, sortState, scopeScene)
			: null,
	);
	// Spec 08 §4 on a scope row: the row asking hide / delete / cancel.
	let confirmingScopeId = $state<string | null>(null);
	const scopeConfirmRow = createConfirmRow(
		{
			set: (callback, ms) => window.setTimeout(callback, ms),
			clear: (handle) => window.clearTimeout(handle as number),
		},
		(armed) => {
			confirmingScopeId = armed;
		},
	);

	function activateScopeItem(item: ScopeMenuItem) {
		if (item.kind === 'separator') return;
		if (item.kind === 'pick') {
			levelDrawerOpen = false;
			if (item.id === 'drill') onRequestDrillPick?.();
			else if (item.id === 'level') onRequestLevelPick?.();
			else selectScope('all');
			return;
		}
		scopeConfirmRow.arm(item.id);
	}

	function answerScopeRow(
		key: SortScopeKey,
		answer: 'select' | 'hide' | 'delete' | 'cancel',
	) {
		const hidden = sortState.hiddenScopes?.includes(key) === true;
		scopeConfirmRow.disarm();
		if (answer === 'select') onActivateScope?.(key);
		else if (answer === 'hide') onHideScope?.(key, !hidden);
		else if (answer === 'delete') onDeleteScope?.(key);
	}

	function scopeItemLabel(item: ScopeMenuItem): string {
		if (item.kind === 'separator') return '';
		if (item.kind === 'pick') return translate(item.labelKey);
		return `${item.label} · ${item.sortLabel}`;
	}
	const visibleSortOptionsForActiveTab = $derived(
		visibleSortOptions(activeTab, sortState, nestedActive, revealActive),
	);

	// Close transient drawers only when switching explorer surfaces.
	$effect(() => {
		void activeTab;
		drawerOpen = false;
		levelDrawerOpen = false;
		groupDrawerOpen = false;
		confirmRow.disarm();
		scopeConfirmRow.disarm();
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
		if (levelDrawerOpen) {
			drawerOpen = false;
			groupDrawerOpen = false;
		}
	}

	function toggleDrawer() {
		if (activeTab === 'files') {
			toggleParentsFirst();
			return;
		}
		drawerOpen = !drawerOpen;
		if (drawerOpen) {
			levelDrawerOpen = false;
			groupDrawerOpen = false;
		}
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

	function toggleFiltered() {
		sortState = {
			...sortState,
			filtered: sortState.filtered !== true,
		};
		emitFilterChange();
	}

	function toggleAddPropertyFirst() {
		sortState = {
			...sortState,
			addPropertyFirst: !(sortState.addPropertyFirst ?? false),
		};
		emitSortChange();
	}

	function selectRevealAnchor(id: 'reveal-current-file' | 'reveal-drill') {
		if (id === 'reveal-drill') {
			// The pick itself happens outside the popup: the surface switches to
			// Files, takes one click, and comes back. It reports the note it got.
			onRequestRevealPick?.();
			levelDrawerOpen = false;
			return;
		}
		// Back to following the workspace: the pinned note is released, not kept
		// as a stale fallback.
		sortState = {
			...sortState,
			revealAnchor: 'current-file',
			revealAnchorPath: null,
		};
		levelDrawerOpen = false;
		onScopeChange?.(sortState);
	}

	function activateByLevelItem(item: ByLevelMenuItem) {
		if (item.kind === 'separator') return;
		if (item.kind === 'reveal') {
			selectRevealAnchor(item.id);
			return;
		}
		if (item.id === 'filtered') toggleFiltered();
		if (item.id === 'addPropertyFirst') toggleAddPropertyFirst();
	}

	function toggleGroupDrawer() {
		groupDrawerOpen = !groupDrawerOpen;
		if (groupDrawerOpen) {
			levelDrawerOpen = false;
			drawerOpen = false;
		}
	}

	function activateGroupItem(item: GroupMenuItem) {
		if (item.kind === 'separator') return;
		if (item.kind === 'preset') onGroupPresetChange?.(item.id);
		else if (item.kind === 'new-group') {
			if (!item.disabled) onNewGroup?.();
		} else confirmRow.arm(item.id);
	}

	function answerConfirmRow(id: string, answer: 'hide' | 'delete' | 'cancel') {
		const group = customGroups.find((entry) => entry.id === id);
		confirmRow.disarm();
		if (!group) return;
		if (answer === 'hide') onHideGroup?.(id, !(group.hidden ?? false));
		else if (answer === 'delete') onDeleteGroup?.(id);
	}

	function groupItemLabel(item: GroupMenuItem): string {
		if (item.kind === 'separator') return '';
		if (item.kind === 'custom-group') return item.label;
		if (item.kind === 'new-group') return translate(item.labelKey);
		return (
			translate(item.labelKey) +
			(item.direction ? ` ${sortDirectionGlyph(item.direction)}` : '')
		);
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
	<!-- U121-079 / U130-003: la lista a mano aqui era el quinto sitio de U121-079;
	     ahora deriva de supportsByLevel para incluir snippets y plugins. -->
	<!-- Spec 08 §3.1-3.2: the groups drawer is on every tab; the level drawer
	     only where the tab has levels (supportsByLevel), the node-type drawer
	     only where there are node types. -->
	<div class="vaultman-sort-vertcol">
		{#if supportsByLevel(activeTab)}
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
			{#if levelDrawerOpen && (levelModel || scopeModel)}
				<div class="vaultman-sort-vertcol-drawer">
					<!-- Spec 08 §3.1: `Scope: <variable>` — All levels / Select a parent /
					     Select a level, then the parents and levels with their own sort. -->
					{#each scopeModel?.items ?? [] as opt (opt.id)}
						{#if opt.kind === 'separator'}
							<div
								class="vaultman-sort-drawer-separator"
								role="separator"
							></div>
						{:else if opt.kind === 'scope-row' && confirmingScopeId === opt.id}
							<div
								class="vaultman-sort-drawer-confirm"
								role="group"
								aria-label={translate('group.row.confirm')}
							>
								<button
									class="vaultman-sort-drawer-item"
									class:is-active={opt.checked}
									aria-label={opt.label}
									title={opt.label}
									onclick={() => answerScopeRow(opt.id, 'select')}
									use:icon={opt.icon}
								></button>
								<button
									class="vaultman-sort-drawer-item"
									aria-label={translate(
										opt.hidden ? 'group.row.unhide' : 'group.row.hide',
									)}
									title={translate(
										opt.hidden ? 'group.row.unhide' : 'group.row.hide',
									)}
									onclick={() => answerScopeRow(opt.id, 'hide')}
									use:icon={opt.hidden ? 'lucide-eye' : 'lucide-eye-off'}
								></button>
								<button
									class="vaultman-sort-drawer-item"
									aria-label={translate('group.row.delete')}
									title={translate('group.row.delete')}
									onclick={() => answerScopeRow(opt.id, 'delete')}
									use:icon={'lucide-trash-2'}
								></button>
								<button
									class="vaultman-sort-drawer-item"
									aria-label={translate('group.row.cancel')}
									title={translate('group.row.cancel')}
									onclick={() => answerScopeRow(opt.id, 'cancel')}
									use:icon={'lucide-x'}
								></button>
							</div>
						{:else}
							<button
								class="vaultman-sort-drawer-item"
								class:is-active={opt.checked}
								class:is-hidden={opt.kind === 'scope-row' && opt.hidden}
								aria-label={scopeItemLabel(opt)}
								title={scopeItemLabel(opt)}
								onclick={() => activateScopeItem(opt)}
								use:icon={opt.kind === 'scope-row' && opt.hidden
									? 'lucide-eye-off'
									: opt.icon}
							></button>
						{/if}
					{/each}
					{#if scopeModel && levelModel && levelModel.items.length > 0}
						<div class="vaultman-sort-drawer-separator" role="separator"></div>
					{/if}
					{#each levelModel?.items ?? [] as opt (opt.id)}
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
		{/if}
		<!-- Spec 08 §3.2: the groups submenu. `none` is a value of the selection. -->
		<div
			class="vaultman-sort-vertcol-btn"
			class:is-active={groupDrawerOpen || groupPreset.kind !== 'none'}
			aria-label={translate('group.menu.title')}
			title={translate('group.menu.title')}
			onclick={toggleGroupDrawer}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') toggleGroupDrawer();
			}}
			role="button"
			tabindex="0"
			use:icon={'lucide-group'}
		></div>
		{#if groupDrawerOpen}
			<div class="vaultman-sort-vertcol-drawer">
				{#each groupModel.items as opt (opt.id)}
					{#if opt.kind === 'separator'}
						<div class="vaultman-sort-drawer-separator" role="separator"></div>
					{:else if opt.kind === 'custom-group' && confirmingGroupId === opt.id}
						<!-- Spec 08 §4 (plan D7): in this icon-only drawer the row's
							     content becomes the three answers; the question is the
							     accessible name of the group. -->
						<div
							class="vaultman-sort-drawer-confirm"
							role="group"
							aria-label={translate('group.row.confirm')}
						>
							<button
								class="vaultman-sort-drawer-item"
								aria-label={translate(
									opt.hidden ? 'group.row.unhide' : 'group.row.hide',
								)}
								title={translate(
									opt.hidden ? 'group.row.unhide' : 'group.row.hide',
								)}
								onclick={() => answerConfirmRow(opt.id, 'hide')}
								use:icon={opt.hidden ? 'lucide-eye' : 'lucide-eye-off'}
							></button>
							<button
								class="vaultman-sort-drawer-item"
								aria-label={translate('group.row.delete')}
								title={translate('group.row.delete')}
								onclick={() => answerConfirmRow(opt.id, 'delete')}
								use:icon={'lucide-trash-2'}
							></button>
							<button
								class="vaultman-sort-drawer-item"
								aria-label={translate('group.row.cancel')}
								title={translate('group.row.cancel')}
								onclick={() => answerConfirmRow(opt.id, 'cancel')}
								use:icon={'lucide-x'}
							></button>
						</div>
					{:else}
						<button
							class="vaultman-sort-drawer-item"
							class:is-active={opt.kind === 'preset' && opt.checked}
							class:is-hidden={opt.kind === 'custom-group' && opt.hidden}
							disabled={opt.kind === 'new-group' && opt.disabled}
							aria-label={groupItemLabel(opt)}
							title={groupItemLabel(opt)}
							onclick={() => activateGroupItem(opt)}
							use:icon={opt.icon}
						></button>
					{/if}
				{/each}
			</div>
		{/if}
		{#if activeTab === 'files' || activeTab === 'props' || activeTab === 'tags'}
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
		{/if}
	</div>

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
					<!-- `note` keeps the note's physical order, but its direction still
					     controls which occurrence a repeated reveal click visits first. -->
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
