<script lang="ts">
	import { translate } from '../../../index/i18n/lang';
	import BtnSelection from '../../btnSelection.svelte';
	import type { BtnSelectionItem } from '../../../types/typePrimitives';
	import {
		toggleVisibleField,
		type NodeFieldDefinition,
	} from '../../../services/serviceNodeFieldVisibility';
	import {
		EXPLORER_PLATFORM_VIEW_MODES,
		type ExplorerPlatformViewMode,
	} from '../../../services/serviceExplorerViewContract';
	import type { ExplorerViewMode } from '../../../types/typeViews';

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

	const VIEW_MODES: { id: SelectableViewMode; iconName: string; labelKey: string }[] =
		EXPLORER_PLATFORM_VIEW_MODES.map((id) => ({
			id,
			...VIEW_MODE_CONFIG[id],
		}));

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

	const showSearch = $derived(activeTab === 'files' && viewMode === 'grid');

	function selectView(v: SelectableViewMode) {
		if (viewMode === v) return;
		viewMode = v;
	}

	function togglePill(id: string) {
		onVisibleFieldsChange?.(toggleVisibleField(activeTab, viewMode, visibleFields, id));
	}

	function toggleAddMode() {
		addMode = !addMode;
	}

	const viewModeButtons = $derived<BtnSelectionItem[]>(
		VIEW_MODES.map((vm) => ({
			icon: vm.iconName,
			label: translate(vm.labelKey),
			isActive: viewMode === vm.id,
			onClick: () => selectView(vm.id),
		})),
	);
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
		{#if !nativePresetActive}
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

	<!-- Row 2: view-mode squircles (via btnSelection shared primitive) -->
	<div class="vm-viewmode-row">
		<BtnSelection buttons={viewModeButtons} />
	</div>
</div>
