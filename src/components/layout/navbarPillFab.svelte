<script lang="ts">
	import type { FabDef } from '../../types/typeUI';
	import { translate } from '../../i18n/index';
	import {
		resolveFabIndicator,
		type FabIndicator,
	} from '../../logic/logicFabIndicator';

	let {
		isIslandOpen = false,
		pageOrder,
		activePage,
		pageLabels,
		pageIcons,
		leftFab,
		rightFab,
		minimalStyle = true,
		queueIslandOpen = false,
		filtersIslandOpen = false,
		navCollapsed,
		isReordering = $bindable(),
		reorderTargetIdx,
		pillEl = $bindable(),
		selectedCount,
		filterRuleCount,
		filterResultCount,
		queuedCount,
		queueWarningCount = 0,
		bindNav,
		onCollapsedNavClick,
		onNavIconPointerDown,
		onPillPointerMove,
		onPillPointerUp,
		exitReorder,
		navigateTo,
		icon,
	}: {
		isIslandOpen?: boolean;
		pageOrder: string[];
		activePage: string;
		pageLabels: Record<string, string>;
		pageIcons: Record<string, string>;
		leftFab: FabDef | null;
		rightFab: FabDef | null;
		minimalStyle?: boolean;
		queueIslandOpen?: boolean;
		filtersIslandOpen?: boolean;
		navCollapsed: boolean;
		isReordering: boolean;
		reorderTargetIdx: number;
		pillEl: HTMLElement | null;
		selectedCount: number;
		filterRuleCount: number;
		filterResultCount: number;
		queuedCount: number;
		queueWarningCount?: number;
		bindNav: (node: HTMLElement) => any;
		onCollapsedNavClick: () => void;
		onNavIconPointerDown: (e: PointerEvent, idx: number) => void;
		onPillPointerMove: (e: PointerEvent) => void;
		onPillPointerUp: () => void;
		exitReorder: () => void;
		navigateTo: (page: string) => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();

	function triggerFab(fab: FabDef, e: MouseEvent | KeyboardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		if (fab.locked) return;
		fab.action?.();
	}

	function triggerFabDoubleClick(fab: FabDef, e: MouseEvent): void {
		e.preventDefault();
		e.stopPropagation();
		if (fab.locked) return;
		fab.doubleClickAction?.();
	}

	function fabIndicator(fab: FabDef): FabIndicator {
		return resolveFabIndicator({
			badge: fab.badge,
			queuedCount,
			queueWarningCount: fab.warningCount ?? queueWarningCount,
			filterRuleCount,
			filterResultCount,
		});
	}

	function fabBadgeCount(fab: FabDef): number {
		const indicator = fabIndicator(fab);
		return indicator.kind === 'count' ? indicator.count : 0;
	}

	function fabShowsWarning(fab: FabDef): boolean {
		return fabIndicator(fab).kind === 'warning';
	}

	function fabLabel(fab: FabDef): string {
		if (fab.badge === 'queue') {
			const warnings = fab.warningCount ?? queueWarningCount;
			if (warnings > 0) {
				return translate('ops.queue.warning', {
					count: queuedCount,
					warnings,
				});
			}
			if (queuedCount === 0) return translate('ops.queue.empty');
			return translate('ops.queue').replace('{count}', String(queuedCount));
		}
		if (fab.badge === 'filters' && fabShowsWarning(fab)) {
			return translate('filters.active_zero');
		}
		return fab.label;
	}

	function fabIsActive(fab: FabDef): boolean {
		if (fab.badge === 'queue') return queueIslandOpen;
		if (fab.badge === 'filters') return filtersIslandOpen;
		return false;
	}
</script>

<div
	class="vaultman-bottom-nav vaultman-glass vaultman-glass--bottom"
	class:vaultman-bottom-nav--minimal={minimalStyle}
	class:is-island-open={isIslandOpen}
	use:bindNav
	class:is-bar-collapsed={navCollapsed}
	role="navigation"
	aria-label={translate('toolbar.navigation') || 'Bottom navigation'}
>
	{#if navCollapsed}
		<button
			class="vaultman-nav-expand-trigger"
			onclick={onCollapsedNavClick}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') onCollapsedNavClick();
			}}
			aria-label={translate('nav.expand') || 'Expand navigation bar'}
			title={translate('nav.expand') || 'Expand navigation bar'}
		></button>
	{/if}

	{#if minimalStyle}
		<div
			class="vaultman-nav-pill vaultman-nav-pill--minimal"
			class:is-reordering={isReordering}
			bind:this={pillEl}
			onpointermove={(e: PointerEvent) => onPillPointerMove(e)}
			onpointerup={() => onPillPointerUp()}
			onpointerleave={() => exitReorder()}
			role="tablist"
			tabindex="-1"
		>
			{#if leftFab}
				<div
					class="clickable-icon nav-action-button vaultman-nav-dock-action"
					class:is-locked={leftFab.locked}
					class:is-active={fabIsActive(leftFab)}
					class:vaultman-backdrop-lock={leftFab.lockBackdrop}
					aria-label={fabLabel(leftFab)}
					aria-disabled={leftFab.locked ? 'true' : undefined}
					onclick={(e: MouseEvent) => triggerFab(leftFab, e)}
					ondblclick={(e: MouseEvent) => triggerFabDoubleClick(leftFab, e)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') triggerFab(leftFab, e);
					}}
					role="button"
					tabindex={leftFab.locked ? -1 : 0}
				>
					<span
						class="vaultman-dock-action-icon"
						aria-hidden="true"
						use:icon={leftFab.icon}
					></span>
					{#if leftFab.locked}
						<span
							class="vaultman-dock-lock"
							aria-hidden="true"
							use:icon={'lucide-lock'}
						></span>
					{/if}
					{#if fabShowsWarning(leftFab)}
						<div
							class="vaultman-fab-badge vaultman-fab-badge--warning"
							aria-hidden="true"
							use:icon={'lucide-alert-triangle'}
						></div>
					{:else if fabBadgeCount(leftFab) > 0}
						<div class="vaultman-fab-badge">{fabBadgeCount(leftFab)}</div>
					{/if}
				</div>
			{:else}
				<div class="vaultman-nav-dock-action-spacer"></div>
			{/if}
			<div class="vaultman-nav-dock-divider"></div>

			{#each pageOrder as pageId, i (pageId)}
				<div
					class="workspace-tab-header tappable workspace-tab-header-inner vaultman-nav-page-icon"
					class:is-active={activePage === pageId && !isReordering}
					class:is-reorder-target={isReordering && reorderTargetIdx === i}
					aria-label={pageLabels[pageId] ?? pageId}
					use:icon={pageIcons[pageId] ?? 'lucide-circle'}
					onpointerdown={(e: PointerEvent) => onNavIconPointerDown(e, i)}
					onpointercancel={() => exitReorder()}
					onclick={(e: MouseEvent) => {
						e.stopPropagation();
						if (!isReordering) navigateTo(pageId);
					}}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.stopPropagation();
							if (!isReordering) navigateTo(pageId);
						}
					}}
					role="tab"
					tabindex={activePage === pageId ? 0 : -1}
				>
					{#if !isReordering && pageId === 'statistics' && selectedCount > 0}
						<div class="vaultman-nav-dot-badge"></div>
					{/if}
				</div>
			{/each}

			<div class="vaultman-nav-dock-divider"></div>
			{#if rightFab}
				<div
					class="clickable-icon nav-action-button vaultman-nav-dock-action"
					class:is-locked={rightFab.locked}
					class:is-active={fabIsActive(rightFab)}
					class:vaultman-backdrop-lock={rightFab.lockBackdrop}
					aria-label={fabLabel(rightFab)}
					aria-disabled={rightFab.locked ? 'true' : undefined}
					onclick={(e: MouseEvent) => triggerFab(rightFab, e)}
					ondblclick={(e: MouseEvent) => triggerFabDoubleClick(rightFab, e)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') triggerFab(rightFab, e);
					}}
					role="button"
					tabindex={rightFab.locked ? -1 : 0}
				>
					<span
						class="vaultman-dock-action-icon"
						aria-hidden="true"
						use:icon={rightFab.icon}
					></span>
					{#if rightFab.locked}
						<span
							class="vaultman-dock-lock"
							aria-hidden="true"
							use:icon={'lucide-lock'}
						></span>
					{/if}
					{#if fabShowsWarning(rightFab)}
						<div
							class="vaultman-fab-badge vaultman-fab-badge--warning"
							aria-hidden="true"
							use:icon={'lucide-alert-triangle'}
						></div>
					{:else if fabBadgeCount(rightFab) > 0}
						<div class="vaultman-fab-badge">{fabBadgeCount(rightFab)}</div>
					{/if}
				</div>
			{:else}
				<div class="vaultman-nav-dock-action-spacer"></div>
			{/if}
		</div>
	{:else}
		{#if leftFab}
			<div class="vaultman-nav-fab-wrap">
				<div
					class="vaultman-nav-fab"
					class:is-active={fabIsActive(leftFab)}
					aria-label={fabLabel(leftFab)}
					use:icon={leftFab.icon}
					onclick={(e: MouseEvent) => triggerFab(leftFab, e)}
					ondblclick={(e: MouseEvent) => triggerFabDoubleClick(leftFab, e)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') triggerFab(leftFab, e);
					}}
					role="button"
					tabindex="0"
				></div>
				{#if fabShowsWarning(leftFab)}
					<div
						class="vaultman-fab-badge vaultman-fab-badge--warning"
						aria-hidden="true"
						use:icon={'lucide-alert-triangle'}
					></div>
				{:else if fabBadgeCount(leftFab) > 0}
					<div class="vaultman-fab-badge">{fabBadgeCount(leftFab)}</div>
				{/if}
			</div>
		{:else}
			<div class="vaultman-nav-fab-placeholder"></div>
		{/if}

		<!-- Center: frosted glass pill with page icons -->
		<div
			class="vaultman-nav-pill"
			class:is-reordering={isReordering}
			bind:this={pillEl}
			onpointermove={(e: PointerEvent) => onPillPointerMove(e)}
			onpointerup={() => onPillPointerUp()}
			onpointerleave={() => exitReorder()}
			role="tablist"
			tabindex="-1"
		>
			{#each pageOrder as pageId, i (pageId)}
				<div
					class="vaultman-nav-icon vaultman-nav-page-icon"
					class:is-active={activePage === pageId && !isReordering}
					class:is-reorder-target={isReordering && reorderTargetIdx === i}
					aria-label={pageLabels[pageId] ?? pageId}
					use:icon={pageIcons[pageId] ?? 'lucide-circle'}
					onpointerdown={(e: PointerEvent) => onNavIconPointerDown(e, i)}
					onpointercancel={() => exitReorder()}
					onclick={(e: MouseEvent) => {
						e.stopPropagation();
						if (!isReordering) navigateTo(pageId);
					}}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.stopPropagation();
							if (!isReordering) navigateTo(pageId);
						}
					}}
					role="tab"
					tabindex={activePage === pageId ? 0 : -1}
				>
					{#if !isReordering && pageId === 'statistics' && selectedCount > 0}
						<div class="vaultman-nav-dot-badge"></div>
					{/if}
				</div>
			{/each}
		</div>

		{#if rightFab}
			<div class="vaultman-nav-fab-wrap">
				<div
					class="vaultman-nav-fab"
					class:is-active={fabIsActive(rightFab)}
					aria-label={fabLabel(rightFab)}
					use:icon={rightFab.icon}
					onclick={(e: MouseEvent) => triggerFab(rightFab, e)}
					ondblclick={(e: MouseEvent) => triggerFabDoubleClick(rightFab, e)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') triggerFab(rightFab, e);
					}}
					role="button"
					tabindex="0"
				></div>
				{#if fabShowsWarning(rightFab)}
					<div
						class="vaultman-fab-badge vaultman-fab-badge--warning"
						aria-hidden="true"
						use:icon={'lucide-alert-triangle'}
					></div>
				{:else if fabBadgeCount(rightFab) > 0}
					<div class="vaultman-fab-badge">{fabBadgeCount(rightFab)}</div>
				{/if}
			</div>
		{:else}
			<div class="vaultman-nav-fab-placeholder"></div>
		{/if}
	{/if}
</div>

<style>
	.vaultman-nav-expand-trigger {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		pointer-events: auto;
		z-index: 100;
	}

	/* Prevent the button from blocking FABs if they were somehow visible,
	   though the CSS currently hides them in collapsed state. */
	.vaultman-nav-expand-trigger:focus-visible {
		outline: 2px solid var(--interactive-accent);
		outline-offset: -2px;
		border-radius: var(--radius-m);
	}
</style>
