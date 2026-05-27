<script lang="ts">
	import type { FabDef } from "../../types/typeUI";
	import { translate } from "../../i18n/index";

	let {
		isIslandOpen = false,
		pageOrder,
		activePage,
		pageLabels,
		pageIcons,
		leftFab,
		rightFab,
		navCollapsed,
		isReordering = $bindable(),
		reorderTargetIdx,
		pillEl = $bindable(),
		selectedCount,
		filterRuleCount,
		queuedCount,
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
		navCollapsed: boolean;
		isReordering: boolean;
		reorderTargetIdx: number;
		pillEl: HTMLElement | null;
		selectedCount: number;
		filterRuleCount: number;
		queuedCount: number;
		bindNav: (node: HTMLElement) => any;
		onCollapsedNavClick: () => void;
		onNavIconPointerDown: (e: PointerEvent, idx: number) => void;
		onPillPointerMove: (e: PointerEvent) => void;
		onPillPointerUp: () => void;
		exitReorder: () => void;
		navigateTo: (page: string) => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div
	class="vaultman-bottom-nav vaultman-glass vaultman-glass--bottom"
	class:is-island-open={isIslandOpen}
	use:bindNav
	class:is-bar-collapsed={navCollapsed}
	role="navigation"
	aria-label={translate("toolbar.navigation") || "Bottom navigation"}
>
	{#if navCollapsed}
		<button
			class="vaultman-nav-expand-trigger"
			onclick={onCollapsedNavClick}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") onCollapsedNavClick();
			}}
			aria-label={translate("nav.expand") || "Expand navigation bar"}
			title={translate("nav.expand") || "Expand navigation bar"}
		></button>
	{/if}

	{#if leftFab}
		<div class="vaultman-nav-fab-wrap">
			<div
				class="vaultman-nav-fab"
				aria-label={leftFab.label}
				use:icon={leftFab.icon}
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					leftFab.action?.();
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") {
						e.stopPropagation();
						leftFab.action?.();
					}
				}}
				role="button"
				tabindex="0"
			></div>
			{#if queuedCount > 0}
				<div class="vaultman-fab-badge">{queuedCount}</div>
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
		{#each pageOrder as pageId, i}
			<div
				class="vaultman-nav-icon"
				class:is-active={activePage === pageId && !isReordering}
				class:is-reorder-target={isReordering && reorderTargetIdx === i}
				aria-label={pageLabels[pageId] ?? pageId}
				use:icon={pageIcons[pageId] ?? "lucide-circle"}
				onpointerdown={(e: PointerEvent) => onNavIconPointerDown(e, i)}
				onpointercancel={() => exitReorder()}
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					if (!isReordering) navigateTo(pageId);
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") {
						e.stopPropagation();
						if (!isReordering) navigateTo(pageId);
					}
				}}
				role="tab"
				tabindex={activePage === pageId ? 0 : -1}
			>
				{#if !isReordering && pageId === "statistics" && selectedCount > 0}
					<div class="vaultman-nav-dot-badge"></div>
				{/if}
			</div>
		{/each}
	</div>

	{#if rightFab}
		<div class="vaultman-nav-fab-wrap">
			<div
				class="vaultman-nav-fab"
				aria-label={rightFab.label}
				use:icon={rightFab.icon}
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					rightFab.action?.();
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") {
						e.stopPropagation();
						rightFab.action?.();
					}
				}}
				role="button"
				tabindex="0"
			></div>
			{#if filterRuleCount > 0}
				<div class="vaultman-fab-badge">{filterRuleCount}</div>
			{/if}
		</div>
	{:else}
		<div class="vaultman-nav-fab-placeholder"></div>
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
