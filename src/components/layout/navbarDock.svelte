<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { FabDef } from '../../types/typePrimitives';
	import { translate } from '../../index/i18n/lang';
	import type { MouseGestureConfig } from '../../services/serviceMouse';
	import type {
		LayoutDockDrawerDirection,
		LayoutDockPresentationMode,
		LayoutLabelPosition,
	} from '../../services/serviceLayout';
	import PrimitiveFab from '../primitives/PrimitiveFab.svelte';

	type DockItem = {
		id: string;
		icon: string;
		label: string;
		disabled?: boolean;
		faint?: boolean;
		dot?: boolean;
	};

	let {
		isIslandOpen = false,
		items,
		active = $bindable(),
		showLabels = false,
		labelPosition = 'bottom',
		presentationMode = 'bar',
		drawerDirection = 'up',
		drawerOpen = $bindable(false),
		leftFab,
		rightFab,
		navCollapsed,
		isReordering = $bindable(false),
		reorderTargetIdx = -1,
		dockEl = $bindable(),
		filterRuleCount,
		queuedCount,
		bindNav,
		onCollapsedNavClick,
		onItemPointerDown,
		onDockPointerMove,
		onDockPointerUp,
		exitReorder,
		onSelect,
		mouseGestureConfig,
	}: {
		isIslandOpen?: boolean;
		items: DockItem[];
		active: string;
		showLabels?: boolean;
		labelPosition?: LayoutLabelPosition;
		presentationMode?: LayoutDockPresentationMode;
		drawerDirection?: LayoutDockDrawerDirection;
		drawerOpen?: boolean;
		leftFab: FabDef | null;
		rightFab: FabDef | null;
		navCollapsed: boolean;
		isReordering?: boolean;
		reorderTargetIdx?: number;
		dockEl?: HTMLElement | null;
		filterRuleCount: number;
		queuedCount: number;
		bindNav: (node: HTMLElement) => any;
		onCollapsedNavClick: () => void;
		onItemPointerDown?: (e: PointerEvent, idx: number) => void;
		onDockPointerMove?: (e: PointerEvent) => void;
		onDockPointerUp?: () => void;
		exitReorder?: () => void;
		onSelect?: (id: string) => void;
		mouseGestureConfig?: MouseGestureConfig;
	} = $props();

	function attachIcon(node: HTMLElement, iconName: string): { update: (n: string) => void } {
		setIcon(node, iconName);
		return { update: (n: string) => setIcon(node, n) };
	}

	function selectItem(item: DockItem): void {
		if (item.disabled || isReordering) return;
		active = item.id;
		onSelect?.(item.id);
	}

	const drawerFab = $derived<FabDef>({
		icon: 'lucide-panel-bottom-open',
		label: drawerOpen ? 'Close dock' : 'Open dock',
		action: () => {
			drawerOpen = !drawerOpen;
		},
	});
</script>

{#if presentationMode === 'drawer'}
	<div class={`vm-nav-drawer-host direction-${drawerDirection}`}>
		<div class="vm-nav-drawer-trigger">
			<PrimitiveFab
				fab={drawerFab}
				side="center"
				{queuedCount}
				{filterRuleCount}
				{mouseGestureConfig}
			/>
		</div>
		{#if drawerOpen}
			<div class={`vm-nav-drawer-panel direction-${drawerDirection}`}>
				<PrimitiveFab
					fab={leftFab}
					side="left"
					{queuedCount}
					{filterRuleCount}
					{mouseGestureConfig}
				/>
				<div
					class={`vm-nav-dock vm-nav-pill label-${labelPosition}`}
					class:has-labels={showLabels}
					class:is-reordering={isReordering}
					bind:this={dockEl}
					onpointermove={(e: PointerEvent) => onDockPointerMove?.(e)}
					onpointerup={() => onDockPointerUp?.()}
					onpointerleave={() => exitReorder?.()}
					role="tablist"
					tabindex="-1"
				>
					{#each items as item, i (item.id)}
						<div
							class="vm-nav-icon vm-nav-dock-item"
							class:is-active={active === item.id && !isReordering}
							class:is-disabled={item.disabled}
							class:is-faint={item.faint}
							class:has-label={showLabels}
							class:is-reorder-target={isReordering && reorderTargetIdx === i}
							aria-label={item.label}
							aria-disabled={item.disabled ? 'true' : undefined}
							onpointerdown={(e: PointerEvent) => onItemPointerDown?.(e, i)}
							onpointercancel={() => exitReorder?.()}
							onclick={(e: MouseEvent) => {
								e.stopPropagation();
								selectItem(item);
							}}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									e.stopPropagation();
									selectItem(item);
								}
							}}
							role="tab"
							tabindex={item.disabled ? -1 : active === item.id ? 0 : -1}
						>
							<span class="vm-nav-dock-icon" use:attachIcon={item.icon}></span>
							{#if showLabels}
								<span class="vm-nav-dock-label">{item.label}</span>
							{/if}
							{#if item.dot}
								<div class="vm-nav-dot-badge"></div>
							{/if}
						</div>
					{/each}
				</div>
				<PrimitiveFab
					fab={rightFab}
					side="right"
					{queuedCount}
					{filterRuleCount}
					{mouseGestureConfig}
				/>
			</div>
		{/if}
	</div>
{:else}
<div
	class="vm-bottom-nav vm-glass vm-glass--bottom"
	class:is-island-open={isIslandOpen}
	use:bindNav
	class:is-bar-collapsed={navCollapsed}
	role="navigation"
	aria-label={translate('toolbar.navigation') || 'Bottom navigation'}
>
	{#if navCollapsed}
		<button
			class="vm-nav-expand-trigger"
			onclick={onCollapsedNavClick}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') onCollapsedNavClick();
			}}
			aria-label={translate('nav.expand') || 'Expand navigation bar'}
			title={translate('nav.expand') || 'Expand navigation bar'}
		></button>
	{/if}

	{#if leftFab}
		<PrimitiveFab fab={leftFab} side="left" {queuedCount} {filterRuleCount} {mouseGestureConfig} />
	{:else}
		<PrimitiveFab fab={null} side="left" />
	{/if}

	<div
		class={`vm-nav-dock vm-nav-pill label-${labelPosition}`}
		class:has-labels={showLabels}
		class:is-reordering={isReordering}
		bind:this={dockEl}
		onpointermove={(e: PointerEvent) => onDockPointerMove?.(e)}
		onpointerup={() => onDockPointerUp?.()}
		onpointerleave={() => exitReorder?.()}
		role="tablist"
		tabindex="-1"
	>
		{#each items as item, i (item.id)}
			<div
				class="vm-nav-icon vm-nav-dock-item"
				class:is-active={active === item.id && !isReordering}
				class:is-disabled={item.disabled}
				class:is-faint={item.faint}
				class:has-label={showLabels}
				class:is-reorder-target={isReordering && reorderTargetIdx === i}
				aria-label={item.label}
				aria-disabled={item.disabled ? 'true' : undefined}
				onpointerdown={(e: PointerEvent) => onItemPointerDown?.(e, i)}
				onpointercancel={() => exitReorder?.()}
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					selectItem(item);
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						e.stopPropagation();
						selectItem(item);
					}
				}}
				role="tab"
				tabindex={item.disabled ? -1 : active === item.id ? 0 : -1}
			>
				<span class="vm-nav-dock-icon" use:attachIcon={item.icon}></span>
				{#if showLabels}
					<span class="vm-nav-dock-label">{item.label}</span>
				{/if}
				{#if item.dot}
					<div class="vm-nav-dot-badge"></div>
				{/if}
			</div>
		{/each}
	</div>

	{#if rightFab}
		<PrimitiveFab fab={rightFab} side="right" {queuedCount} {filterRuleCount} {mouseGestureConfig} />
	{:else}
		<PrimitiveFab fab={null} side="right" />
	{/if}
</div>
{/if}
