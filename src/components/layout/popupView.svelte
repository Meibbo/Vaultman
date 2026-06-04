<script lang="ts">
	import { translate } from '../../i18n/index';
	import { untrack } from 'svelte';
	import type { ExplorerViewMode } from '../../types/typeUI';

	type FiltersTab = 'props' | 'files' | 'tags';
	type ViewMode = ExplorerViewMode;

	type PillDef = {
		id: string;
		labelKey: string;
		defaultOn: boolean;
	};

	const VIEW_MODES: {
		id: ViewMode;
		iconName: string;
		labelKey: string;
		locked?: boolean;
	}[] = [
		{
			id: 'tree',
			iconName: 'lucide-list-tree',
			labelKey: 'viewmode.mode.tree',
		},
		{
			id: 'dnd',
			iconName: 'lucide-grip-vertical',
			labelKey: 'viewmode.mode.dnd',
			locked: true,
		},
		{
			id: 'grid',
			iconName: 'lucide-layout-grid',
			labelKey: 'viewmode.mode.grid',
		},
		{
			id: 'cards',
			iconName: 'lucide-layout-panel-top',
			labelKey: 'viewmode.mode.cards',
			locked: true,
		},
	];

	// Pills for each combination of tab × view (files splits by view mode).
	const PILLS: Record<string, PillDef[]> = {
		tags: [
			{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true },
			{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true },
			{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
			{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: false },
		],
		props: [
			{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true },
			{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true },
			{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
		],
		'files-grid': [
			{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true },
			{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true },
			{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
			{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: true },
			{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
		],
		'files-tree': [
			{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true },
			{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true },
			{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
		],
	};

	function defaultPills(key: string): Set<string> {
		const defs = PILLS[key] ?? [];
		return new Set(defs.filter((p) => p.defaultOn).map((p) => p.id));
	}

	function pillsKey(tab: FiltersTab, view: ViewMode): string {
		if (tab === 'files') return view === 'grid' ? 'files-grid' : 'files-tree';
		return tab;
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
		onViewModeChange?: (mode: 'tree' | 'dnd' | 'grid' | 'cards') => void;
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
				: defaultPills(pillsKey(activeTab, initialViewMode)),
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
				: defaultPills(pillsKey(activeTab, initialViewMode));
		}
	});

	const currentPillKey = $derived(pillsKey(activeTab, activeView));
	const currentPillDefs = $derived(PILLS[currentPillKey] ?? []);

	function selectView(v: ViewMode) {
		if (activeView === v) return;
		if (v === 'dnd' || v === 'cards') return;
		activeView = v;
		activePills = defaultPills(pillsKey(activeTab, v));
		onViewModeChange?.(v);
		onPillsChange?.(Array.from(activePills));
	}

	function isIdentityPill(id: string): boolean {
		return id === 'icon' || id === 'text' || id === 'name';
	}

	function togglePill(id: string) {
		const next = new Set(activePills);
		if (next.has(id)) {
			if (
				isIdentityPill(id) &&
				![...next].some(
					(candidate) => candidate !== id && isIdentityPill(candidate),
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
		{#each VIEW_MODES as vm (vm.id)}
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
				use:icon={vm.iconName}
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
