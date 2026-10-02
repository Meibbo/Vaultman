<script lang="ts">
	import NavbarFilters from './navbarFilters.svelte';
	import { PANEL_WIDGET_HOST_ID } from '../../logic/logicPanelWidgetProjection';
	import type { SceneConfigPort } from '../../logic/logicSceneConfigPort';
	import type { SceneEngineSurface } from '../../logic/logicSasiSceneActions';
	import type { NavbarPanelWidgetState } from '../../types/typePanelWidget';
	import type { ExplorerViewMode } from '../../types/typeUI';
	import type { App } from 'obsidian';
	import type { WorkspaceInstanceRecord } from '../../types/typeInstance';

	let {
		providerState,
		sceneConfigPort,
		visible = true,
		peeking = false,
		onPointerEnter,
		onPointerLeave,
		onSwitchInstance,
		app,
		readInstanceRecords,
	}: {
		providerState: NavbarPanelWidgetState | null;
		sceneConfigPort: SceneConfigPort;
		visible?: boolean;
		peeking?: boolean;
		onPointerEnter?: () => void;
		onPointerLeave?: () => void;
		onSwitchInstance?: (id: string) => void;
		app?: App;
		readInstanceRecords?: () => readonly WorkspaceInstanceRecord[];
	} = $props();

	const mountedState = $derived(providerState);

	/**
	 * U130: comando SASI — passthrough al `setSceneEngine` del navbar. Sin
	 * host montado no hay instancia que cambiar: false.
	 */
	let navbarRef: {
		setSceneEngine?: (
			tab: SceneEngineSurface,
			mode: ExplorerViewMode,
		) => boolean;
		invokeToolbarSasiAction?: (actionId: string) => Promise<boolean>;
	} | null = $state(null);

	export function setSceneEngine(
		surface: SceneEngineSurface,
		mode: ExplorerViewMode,
	): boolean {
		return navbarRef?.setSceneEngine?.(surface, mode) ?? false;
	}

	export async function invokeToolbarSasiAction(
		actionId: string,
	): Promise<boolean> {
		return navbarRef?.invokeToolbarSasiAction?.(actionId) ?? false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="vaultman-toolbar-slot vaultman-panel-widget-host"
	class:is-hidden-mode={!visible}
	class:is-peeking={peeking}
	data-panel-widget-host-id={PANEL_WIDGET_HOST_ID}
	onpointerenter={onPointerEnter}
	onpointerleave={onPointerLeave}
>
	{#if mountedState}
		<NavbarFilters
			bind:this={navbarRef}
			{...mountedState}
			{sceneConfigPort}
			{onSwitchInstance}
			app={app ?? mountedState.app}
			{readInstanceRecords}
		/>
	{/if}
</div>
