<script lang="ts">
	import { translate } from '../../../index/i18n/lang';
	import type { ExplorerExpansionSummary, ExplorerSortTarget } from '../../../types/typeExplorer';
	import type { OperationScope } from '../../../services/serviceOperationScope';

	type FiltersTab = 'props' | 'files' | 'tags' | 'content';

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
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
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
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
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
			{
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
			},
			{
				id: 'columns',
				iconName: 'lucide-columns-2',
				labelKey: 'sort.by.columns',
			},
		],
		content: [
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
			{
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
			},
			{
				id: 'columns',
				iconName: 'lucide-file-text',
				labelKey: 'filter.tab.content',
			},
		],
	};

	const DRAWER_OPTIONS: Record<'props' | 'tags', string[]> = {
		props: ['Text', 'Number', 'Date', 'Toggle', 'List'],
		tags: ['All', 'Nested', 'Simple'],
	};

	let {
		activeTab,
		onClose,
		sortBy = $bindable('name'),
		sortDir = $bindable('asc'),
		sortTarget = $bindable('top'),
		operationScope = $bindable('auto'),
		filesShowSelectedOnly = $bindable(false),
		filesShowHidden = $bindable(false),
		manualDndEnabled = $bindable(false),
		nodeExpansionSummary = { canToggle: false, hasExpandedParents: false },
		onOperationScopeChange,
		onFilesShowHiddenChange,
		onManualDndChange,
		onSortTargetChange,
		onToggleNodeExpansion,
		icon,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		sortBy: string;
		sortDir: 'asc' | 'desc';
		sortTarget?: ExplorerSortTarget;
		operationScope: OperationScope;
		filesShowSelectedOnly?: boolean;
		filesShowHidden?: boolean;
		manualDndEnabled?: boolean;
		nodeExpansionSummary?: ExplorerExpansionSummary;
		onOperationScopeChange?: (value: OperationScope) => void;
		onFilesShowHiddenChange?: (active: boolean) => void;
		onManualDndChange?: (active: boolean) => void;
		onSortTargetChange?: (target: ExplorerSortTarget) => void;
		onToggleNodeExpansion?: () => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let drawerOpen = $state(false);
	const vertTopActive = $derived(sortTarget === 'children');

	const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = {
		name: 'asc',
		count: 'desc',
		date: 'desc',
		sub: 'desc',
		columns: 'asc',
	};

	// Reset per-tab UI state, but NOT the sort state (which is shared/bound)
	$effect(() => {
		void activeTab;
		drawerOpen = false;
	});

	function selectSort(id: string) {
		if (sortBy === id) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = id;
			sortDir = DEFAULT_DIR[id] ?? 'asc';
		}
	}

	const vertTopIcon = $derived(
		activeTab === 'files'
			? filesShowHidden
				? 'lucide-eye'
				: 'lucide-eye-off'
			: activeTab === 'props'
				? 'lucide-list-tree'
				: activeTab === 'tags'
					? 'lucide-network'
					: 'lucide-circle',
	);

	const vertBotIcon = $derived(
		activeTab === 'files'
			? filesShowSelectedOnly
				? 'lucide-list-checks'
				: 'lucide-list'
			: 'lucide-chevrons-down',
	);
	const nodeExpansionLabel = $derived(
		nodeExpansionSummary.hasExpandedParents
			? translate('sort.collapse_all_nodes')
			: translate('sort.expand_all_nodes'),
	);
	const nodeExpansionIcon = $derived(
		nodeExpansionSummary.hasExpandedParents ? 'lucide-chevrons-up' : 'lucide-chevrons-down',
	);

	function toggleVertBottom() {
		if (activeTab === 'files') {
			filesShowSelectedOnly = !filesShowSelectedOnly;
			return;
		}
		drawerOpen = !drawerOpen;
	}

	function toggleFilesHidden() {
		filesShowHidden = !filesShowHidden;
		onFilesShowHiddenChange?.(filesShowHidden);
	}

	function toggleSortTarget() {
		sortTarget = sortTarget === 'children' ? 'top' : 'children';
		onSortTargetChange?.(sortTarget);
	}

	function toggleManualDnd() {
		manualDndEnabled = !manualDndEnabled;
		onManualDndChange?.(manualDndEnabled);
	}
</script>

<div class="vm-sort-popup">
	<!-- Vert-col: absolute, floats left over tab content -->
	<div class="vm-sort-vertcol">
		{#if activeTab === 'files'}
			<button
				type="button"
				class="vm-sort-vertcol-btn"
				class:is-active={filesShowHidden}
				aria-label={translate('settings.files_show_hidden')}
				aria-pressed={filesShowHidden}
				title={translate('settings.files_show_hidden.desc')}
				onclick={toggleFilesHidden}
				use:icon={vertTopIcon}
			></button>
		{:else if activeTab === 'props' || activeTab === 'tags'}
			<div
				class="vm-sort-vertcol-btn"
				class:is-active={vertTopActive}
				data-vm-sort-target
				aria-label={activeTab === 'props'
					? translate('sort.vertcol.props_values')
					: translate('sort.vertcol.node_level')}
				aria-pressed={vertTopActive}
				title={activeTab === 'props'
					? translate('sort.vertcol.props_values')
					: translate('sort.vertcol.node_level')}
				onclick={toggleSortTarget}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') toggleSortTarget();
				}}
				role="button"
				tabindex="0"
				use:icon={vertTopIcon}
			></div>
		{/if}
		<div
			class="vm-sort-vertcol-btn"
			class:is-active={activeTab === 'files' ? filesShowSelectedOnly : drawerOpen}
			aria-label={activeTab === 'files'
				? filesShowSelectedOnly
					? translate('sort.scope.all')
					: translate('header.show_selected')
				: translate('sort.vertcol.scope_drawer')}
			onclick={toggleVertBottom}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') toggleVertBottom();
			}}
			role="button"
			tabindex="0"
			use:icon={vertBotIcon}
		></div>
		{#if drawerOpen && (activeTab === 'props' || activeTab === 'tags')}
			<div class="vm-sort-vertcol-drawer">
				{#each DRAWER_OPTIONS[activeTab] as opt (opt)}
					<div class="vm-sort-drawer-item">{opt}</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Main content panel: row 1 + row 2 -->
	<div class="vm-sort-main">
		<!-- Row 1: Scope dropdown · Template btn · Close btn -->
		<div class="vm-sort-row vm-sort-row-controls">
			<select
				class="vm-sort-scope-select"
				bind:value={operationScope}
				onchange={() => onOperationScopeChange?.(operationScope)}
				aria-label={translate('sort.scope.label')}
			>
				<option value="auto">{translate('settings.scope.auto')}</option>
				<option value="filtered">{translate('sort.scope.filtered')}</option>
				<option value="selected">{translate('sort.scope.selected')}</option>
			</select>
			<div
				class="vm-sort-circle-btn"
				aria-label={translate('sort.template')}
				onclick={() => {
					/* no-op: Iter 17 */
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						/* no-op: Iter 17 */
					}
				}}
				role="button"
				tabindex="0"
				use:icon={'lucide-bookmark'}
			></div>
			{#if nodeExpansionSummary.canToggle}
				<div
					class="vm-sort-circle-btn"
					class:is-active={nodeExpansionSummary.hasExpandedParents}
					data-vm-sort-node-expansion
					aria-label={nodeExpansionLabel}
					title={nodeExpansionLabel}
					onclick={() => onToggleNodeExpansion?.()}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') onToggleNodeExpansion?.();
					}}
					role="button"
					tabindex="0"
					use:icon={nodeExpansionIcon}
				></div>
			{/if}
			<button
				type="button"
				class="vm-sort-circle-btn vm-sort-toggle-btn"
				class:is-active={manualDndEnabled}
				data-vm-sort-manual-dnd
				aria-label={translate('sort.manual_dnd')}
				aria-pressed={manualDndEnabled}
				title={translate('sort.manual_dnd.desc')}
				onclick={toggleManualDnd}
			>
				<span class="vm-sort-toggle-icon" use:icon={'lucide-grip'}></span>
				<span class="vm-sort-toggle-label">DnD</span>
			</button>
			<div
				class="vm-sort-close-btn clickable-icon"
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

		<!-- Row 2: 4 squircles -->
		<div class="vm-sort-row vm-squircle-row">
			{#each SORT_OPTIONS[activeTab] as opt (opt.id)}
				<div
					class="vm-squircle"
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
					<span class="vm-squircle-icon" use:icon={opt.iconName}></span>
					{#if sortBy === opt.id}
						<span
							class="vm-sort-dir"
							use:icon={sortDir === 'asc' ? 'lucide-arrow-up' : 'lucide-arrow-down'}
						></span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
