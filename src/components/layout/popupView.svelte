<script lang="ts">
	import { translate } from '../../i18n/index';
	import { untrack } from 'svelte';
	import type { ExplorerTabId, ExplorerViewMode } from '../../types/typeUI';
	import {
		isViewModeSelectableForDataSurface,
		viewModesForDataSurface,
	} from '../../logic/logicExplorerViewModes';
	import {
		cellLabelKey,
		defaultVisibleCells,
		isIdentityCell,
		viewMenuCells,
	} from '../../logic/logicCellRegistry';

	type FiltersTab = ExplorerTabId;
	type ViewMode = ExplorerViewMode;

	function defaultPills(tab: FiltersTab, view: ViewMode): Set<string> {
		return new Set(defaultVisibleCells(tab, view));
	}

	let {
		activeTab,
		onClose,
		onViewModeChange,
		onPillsChange,
		onAddModeChange,
		icon,
		initialViewMode = 'tree' as ViewMode,
		initialPills = undefined,
		addOpCount = 0,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		onViewModeChange?: (mode: ExplorerViewMode) => void;
		onPillsChange?: (activePills: string[]) => void;
		onAddModeChange?: (active: boolean) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
		initialViewMode?: ViewMode;
		initialPills?: string[];
		addOpCount?: number;
	} = $props();

	let activeView = $state<ViewMode>(untrack(() => initialViewMode));
	let activePills = $state<Set<string>>(
		untrack(() =>
			initialPills
				? new Set(initialPills)
				: defaultPills(activeTab, initialViewMode),
		),
	);

	// Reset when activeTab changes (not on first render — initialViewMode handled above)
	let _prevTab = $state<FiltersTab>(untrack(() => activeTab));
	$effect(() => {
		if (activeTab !== _prevTab) {
			_prevTab = activeTab;
			activeView = initialViewMode;
			activePills = initialPills
				? new Set(initialPills)
				: defaultPills(activeTab, initialViewMode);
		}
	});

	const currentPillDefs = $derived(
		viewMenuCells(activeTab, activeView).map((definition) => ({
			id: definition.id,
			labelKey: cellLabelKey(definition, activeTab, activeView),
		})),
	);
	const currentViewModes = $derived(viewModesForDataSurface(activeTab));

	function selectView(v: ViewMode) {
		if (activeView === v) return;
		if (!isViewModeSelectableForDataSurface(activeTab, v)) return;
		activeView = v;
		activePills = defaultPills(activeTab, v);
		onViewModeChange?.(v);
		onPillsChange?.(Array.from(activePills));
	}

	function togglePill(id: string) {
		const next = new Set(activePills);
		if (next.has(id)) {
			if (
				isIdentityCell(activeTab, id, activeView) &&
				![...next].some(
					(candidate) =>
						candidate !== id &&
						isIdentityCell(activeTab, candidate, activeView),
				)
			) {
				return;
			}
			next.delete(id);
		} else {
			next.add(id);
		}
		activePills = next;
		onPillsChange?.(Array.from(activePills));
	}

	let addMode = $state(false);

	function toggleAddMode() {
		addMode = !addMode;
		onAddModeChange?.(addMode);
	}
</script>

<div class="vaultman-viewmode-popup">
	<!-- Row 1: close · add mode · pills (scroll) -->
	<div class="vaultman-viewmode-row vaultman-viewmode-row-controls">
		<div
			class="vaultman-viewmode-close-btn clickable-icon"
			aria-label={translate('viewmode.close')}
			onclick={onClose}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') onClose();
			}}
			role="button"
			tabindex="0"
			use:icon={'lucide-chevron-left'}
		></div>
		{#if activeTab !== 'snippets' && activeTab !== 'plugins'}
			<!-- ADD mode FAB -->
			<div
				class="vaultman-nav-fab"
				class:is-add-active={addMode}
				role="button"
				tabindex="0"
				aria-label={translate('viewmode.add_mode')}
				onclick={toggleAddMode}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') toggleAddMode();
				}}
				use:icon={'lucide-plus'}
			>
				{#if addOpCount && addOpCount > 0}
					<span class="vaultman-fab-badge">{addOpCount}</span>
				{/if}
			</div>
		{/if}
		<!-- Pills (horizontal scroll, no scrollbar) -->
		<div class="vaultman-viewmode-pills">
			{#each currentPillDefs as pill (pill.id)}
				<button
					class="vaultman-viewmode-pill"
					class:is-active={activePills.has(pill.id)}
					aria-pressed={activePills.has(pill.id)}
					onclick={() => togglePill(pill.id)}
				>
					{translate(pill.labelKey)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Row 2: view-mode squircles -->
	<div class="vaultman-viewmode-row vaultman-squircle-row">
		{#each currentViewModes as vm (vm.id)}
			<div
				class="vaultman-squircle"
				class:is-accent={activeView === vm.id}
				class:is-locked={vm.locked}
				class:vaultman-backdrop-lock={vm.locked}
				aria-label={translate(vm.labelKey)}
				aria-disabled={vm.locked ? 'true' : undefined}
				onclick={() => selectView(vm.id)}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') selectView(vm.id);
				}}
				role="button"
				tabindex={vm.locked ? -1 : 0}
				use:icon={vm.icon}
			>
				{#if vm.locked}
					<span
						class="vaultman-squircle-lock-overlay"
						aria-hidden="true"
						use:icon={'lucide-lock'}
					></span>
				{/if}
			</div>
		{/each}
	</div>
</div>
