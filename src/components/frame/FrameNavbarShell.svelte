<script lang="ts">
	import { getContext } from 'svelte';
	import type { VaultmanPlugin } from '../../main';
	import type { FabDef } from '../../types/typePrimitives';
	import type { LayoutSettings } from '../../services/serviceLayout';
	import NavbarDock from '../layout/navbarDock.svelte';
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import PopupIsland from '../layout/overlays/overlayIsland.svelte';
	import {
		FRAME_NAVIGATION_KEY,
		type FrameNavigationService,
	} from './frameNavigation.svelte';
	import type { FrameOverlayController } from './frameOverlays.svelte';

	const nav = getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY);
	if (!nav) {
		throw new Error(
			'FrameNavbarShell requires FRAME_NAVIGATION_KEY context. Mount inside frameVaultman.svelte.',
		);
	}

	let {
		plugin,
		filterRuleCount,
		queuedCount,
		layoutSettings,
		leftFab,
		rightFab,
		overlays,
	}: {
		plugin: VaultmanPlugin;
		filterRuleCount: number;
		queuedCount: number;
		layoutSettings: LayoutSettings;
		leftFab: FabDef | null;
		rightFab: FabDef | null;
		overlays: FrameOverlayController;
	} = $props();
</script>

{#if nav.topTabItems.length > 0}
	<NavbarTabs
		tabs={nav.topTabItems}
		active={nav.topTabActive}
		externalTabIds={nav.topExternalTabIds}
		showLabels={layoutSettings.tabs.labels.visible}
		labelPosition={layoutSettings.tabs.labels.position}
		onSelect={(id) => nav.selectSurfaceItem(layoutSettings.tabs.content, id)}
	/>
{/if}

<div
	class="vm-island-backdrop vm-glass"
	class:is-open={overlays.isIslandOpen}
	class:is-dismissable={plugin.settings.islandDismissOnOutsideClick}
	onclick={() => {
		if (plugin.settings.islandDismissOnOutsideClick) {
			overlays.closeQueueIsland();
			overlays.closeFiltersIsland();
		}
	}}
	onkeydown={(e) => {
		if (
			plugin.settings.islandDismissOnOutsideClick &&
			(e.key === 'Escape' || e.key === 'Enter')
		) {
			overlays.closeQueueIsland();
			overlays.closeFiltersIsland();
		}
	}}
	role="button"
	tabindex="-1"
	aria-label="Close island"
></div>

<PopupIsland overlayState={plugin.overlayState} />

<NavbarDock
	items={nav.dockItems}
	active={nav.dockActive}
	externalTabIds={nav.dockExternalTabIds}
	showLabels={layoutSettings.dock.labels.visible}
	labelPosition={layoutSettings.dock.labels.position}
	presentationMode={layoutSettings.dock.presentation.mode}
	drawerDirection={layoutSettings.dock.presentation.drawerDirection}
	bind:drawerOpen={nav.navReorder.drawerOpen}
	{leftFab}
	{rightFab}
	navCollapsed={nav.navReorder.navCollapsed}
	isIslandOpen={overlays.isIslandOpen}
	isReordering={nav.dockUsesFramePages ? nav.navReorder.isReordering : false}
	reorderTargetIdx={nav.dockUsesFramePages ? nav.navReorder.reorderTargetIdx : -1}
	bind:dockEl={nav.navReorder.pillEl}
	{filterRuleCount}
	{queuedCount}
	bindNav={nav.navReorder.bindNav}
	onCollapsedNavClick={nav.navReorder.onCollapsedNavClick}
	onItemPointerDown={nav.dockUsesFramePages ? nav.navReorder.onNavIconPointerDown : undefined}
	onDockPointerMove={nav.dockUsesFramePages ? nav.navReorder.onPillPointerMove : undefined}
	onDockPointerUp={nav.dockUsesFramePages ? nav.navReorder.onPillPointerUp : undefined}
	exitReorder={nav.navReorder.exitReorder}
	onSelect={(id) => nav.selectSurfaceItem(layoutSettings.dock.content, id)}
	mouseGestureConfig={plugin.settings?.mouseGestures?.fab}
/>
