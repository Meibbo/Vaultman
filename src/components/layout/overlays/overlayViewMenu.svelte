<script lang="ts">
	import { getContext } from 'svelte';
	import { translate } from '../../../index/i18n/lang';
	import {
		toggleVisibleField,
		type NodeFieldDefinition,
	} from '../../../services/serviceNodeFieldVisibility';
	import {
		EXPLORER_PLATFORM_VIEW_MODES,
		type ExplorerPlatformViewMode,
	} from '../../../services/serviceExplorerViewContract';
	import type { ExplorerViewMode } from '../../../types/typeViews';
	import {
		VIEW_HOST_KEY,
		type ViewHostContextValue,
	} from '../../explorer/viewHostContext';
	import ViewMenuNodeElementsToggle from './ViewMenuNodeElementsToggle.svelte';

	type FiltersTab = 'props' | 'files' | 'tags' | 'content';
	type ViewMode = ExplorerViewMode;
	type SelectableViewMode = ExplorerPlatformViewMode;

	const VIEW_MODE_CONFIG: Record<SelectableViewMode, { iconName: string; labelKey: string }> = {
		tree: {
			iconName: 'lucide-list-tree',
			labelKey: 'viewmode.mode.tree',
		},
		list: {
			iconName: 'lucide-list',
			labelKey: 'viewmode.mode.list',
		},
		table: {
			iconName: 'lucide-table',
			labelKey: 'viewmode.mode.table',
		},
		grid: {
			iconName: 'lucide-layout-grid',
			labelKey: 'viewmode.mode.grid',
		},
		cards: {
			iconName: 'lucide-layout-panel-top',
			labelKey: 'viewmode.mode.cards',
		},
	};

	let {
		activeTab,
		onClose,
		viewMode = $bindable('tree'),
		addMode = $bindable(false),
		icon,
		addOpCount = 0,
		fieldDefinitions = [],
		visibleFields = [],
		nativePresetActive = false,
		onVisibleFieldsChange,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		viewMode: ViewMode;
		addMode: boolean;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
		addOpCount?: number;
		fieldDefinitions?: readonly NodeFieldDefinition[];
		visibleFields?: readonly string[];
		nativePresetActive?: boolean;
		onVisibleFieldsChange?: (fields: string[]) => void;
	} = $props();

	const viewHost = getContext<ViewHostContextValue | undefined>(VIEW_HOST_KEY);
	const activeViewMode = $derived(viewHost?.viewMode ?? viewMode);
	const showSearch = $derived(activeTab === 'files' && activeViewMode === 'grid');
	const nodeElementControlsAvailable = $derived(
		viewHost?.multiSelectionAvailable ?? !nativePresetActive,
	);
	const viewModes = $derived.by(() =>
		(viewHost?.selectableModes ?? EXPLORER_PLATFORM_VIEW_MODES).map((id) => ({
			id,
			...VIEW_MODE_CONFIG[id],
		})),
	);

	function selectView(v: SelectableViewMode) {
		viewHost?.setViewMode(v);
		if (viewMode !== v) viewMode = v;
	}

	function togglePill(id: string) {
		onVisibleFieldsChange?.(toggleVisibleField(activeTab, viewMode, visibleFields, id));
	}

	function toggleAddMode() {
		addMode = !addMode;
	}

</script>

<div class="vm-viewmode-popup">
	<!-- Row 1: close · template · search* · pills (scroll) -->
	<div class="vm-viewmode-row vm-viewmode-row-controls">
		<div
			class="vm-viewmode-close-btn clickable-icon"
			aria-label={translate('viewmode.close')}
			onclick={onClose}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') onClose();
			}}
			role="button"
			tabindex="0"
			use:icon={'lucide-chevron-left'}
		></div>
		<div
			class="vm-viewmode-circle-btn"
			aria-label={translate('viewmode.template')}
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
		{#if showSearch}
			<div
				class="vm-viewmode-circle-btn"
				aria-label={translate('viewmode.search_cols')}
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
				use:icon={'lucide-search'}
			></div>
		{/if}
		<!-- ADD mode FAB -->
		<div
			class="vm-nav-fab"
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
				<span class="vm-fab-badge">{addOpCount}</span>
			{/if}
		</div>
		{#if nodeElementControlsAvailable}
			<!-- Pills (horizontal scroll, no scrollbar) -->
			<div class="vm-viewmode-pills">
				{#each fieldDefinitions as pill (pill.id)}
					<button
						type="button"
						class="vm-viewmode-pill"
						class:is-active={visibleFields.includes(pill.id)}
						aria-pressed={visibleFields.includes(pill.id)}
						data-node-field={pill.id}
						onclick={() => togglePill(pill.id)}
					>
						{translate(pill.labelKey)}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Row 2: view-mode squircles -->
	<div class="vm-viewmode-row">
		<div class="vm-squircle-row vm-btn-selection-row" aria-label="View modes">
			{#each viewModes as vm (vm.id)}
				<button
					type="button"
					class="vm-squircle vm-view-menu-mode"
					class:is-active={activeViewMode === vm.id}
					class:is-accent={activeViewMode === vm.id}
					aria-label={translate(vm.labelKey)}
					aria-pressed={activeViewMode === vm.id}
					use:icon={vm.iconName}
					onclick={() => selectView(vm.id)}
				></button>
			{/each}
		</div>
	</div>

	{#if viewHost?.multiSelectionAvailable}
		<div class="vm-viewmode-node-elements">
			<ViewMenuNodeElementsToggle service={viewHost} />
		</div>
	{/if}
</div>
