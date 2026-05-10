<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { FabDef } from '../../types/typePrimitives';
	import { translate } from '../../index/i18n/lang';
	import { describeFabBadge } from '../../badges/serviceBadge';
	import {
		COMMAND_MOUSE_GESTURE_CONFIG,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';
	import type { LayoutLabelPosition } from '../../services/serviceLayout';

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

	function countForFab(fab: FabDef | null): number {
		if (fab?.badgeKind === 'queue') return queuedCount;
		if (fab?.badgeKind === 'filters') return filterRuleCount;
		return 0;
	}

	const leftFabBadge = $derived(
		leftFab?.badgeKind ? describeFabBadge(leftFab.badgeKind, countForFab(leftFab), translate) : null,
	);
	const rightFabBadge = $derived(
		rightFab?.badgeKind ? describeFabBadge(rightFab.badgeKind, countForFab(rightFab), translate) : null,
	);
	const mouse = createMouseGestureService();

	$effect(() => () => mouse.cancelAll());

	const leftFabClick = $derived.by(() => makeFabClickHandler(leftFab, 'left'));
	const rightFabClick = $derived.by(() => makeFabClickHandler(rightFab, 'right'));
	const leftFabAuxClick = $derived.by(() => makeFabAuxClickHandler(leftFab, 'left'));
	const rightFabAuxClick = $derived.by(() => makeFabAuxClickHandler(rightFab, 'right'));

	function mouseConfigForFab(fab: FabDef): MouseGestureConfig {
		return mergeMouseGestureConfig(
			COMMAND_MOUSE_GESTURE_CONFIG,
			{
				secondary: fab.onDoubleClick ? 'double-click' : [],
				tertiary: fab.onTertiaryClick ? ['alt-click', 'middle-click'] : [],
			},
			mouseGestureConfig,
		);
	}

	function makeFabClickHandler(fab: FabDef | null, side: 'left' | 'right'): (e: MouseEvent) => void {
		if (!fab) return () => {};
		return (e: MouseEvent) => {
			e.stopPropagation();
			mouse.handleClick(
				{ key: `fab:${side}`, eventTarget: e.target },
				e,
				{
					primary: () => fab.action?.(),
					secondary: () => fab.onDoubleClick?.(),
					tertiary: () => fab.onTertiaryClick?.(),
				},
				mouseConfigForFab(fab),
			);
		};
	}

	function makeFabAuxClickHandler(
		fab: FabDef | null,
		side: 'left' | 'right',
	): (e: MouseEvent) => void {
		if (!fab) return () => {};
		return (e: MouseEvent) => {
			e.stopPropagation();
			mouse.handleAuxClick(
				{ key: `fab:${side}`, eventTarget: e.target },
				e,
				{
					primary: () => fab.action?.(),
					secondary: () => fab.onDoubleClick?.(),
					tertiary: () => fab.onTertiaryClick?.(),
				},
				mouseConfigForFab(fab),
			);
		};
	}

	function selectItem(item: DockItem): void {
		if (item.disabled || isReordering) return;
		active = item.id;
		onSelect?.(item.id);
	}
</script>

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
		<div class="vm-nav-fab-wrap">
			<div
				class="vm-nav-fab"
				aria-label={leftFab.label}
				use:attachIcon={leftFab.icon}
				onclick={leftFabClick}
				onauxclick={leftFabAuxClick}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.stopPropagation();
						leftFab.action?.();
					}
				}}
				role="button"
				tabindex="0"
			></div>
			{#if leftFabBadge}
				<div
					class="vm-fab-badge"
					data-vm-badge-kind={leftFabBadge.kind}
					aria-label={leftFabBadge.label}
					title={leftFabBadge.title}
				>
					{leftFabBadge.text}
				</div>
			{/if}
		</div>
	{:else}
		<div class="vm-nav-fab-placeholder"></div>
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
		<div class="vm-nav-fab-wrap">
			<div
				class="vm-nav-fab"
				aria-label={rightFab.label}
				use:attachIcon={rightFab.icon}
				onclick={rightFabClick}
				onauxclick={rightFabAuxClick}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.stopPropagation();
						rightFab.action?.();
					}
				}}
				role="button"
				tabindex="0"
			></div>
			{#if rightFabBadge}
				<div
					class="vm-fab-badge"
					data-vm-badge-kind={rightFabBadge.kind}
					aria-label={rightFabBadge.label}
					title={rightFabBadge.title}
				>
					{rightFabBadge.text}
				</div>
			{/if}
		</div>
	{:else}
		<div class="vm-nav-fab-placeholder"></div>
	{/if}
</div>
