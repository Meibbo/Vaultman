<script lang="ts">
	import NavbarFilters from './navbarFilters.svelte';
	import { PANEL_WIDGET_HOST_ID } from '../../logic/logicPanelWidgetProjection';
	import type { NavbarPanelWidgetState } from '../../types/typePanelWidget';

	let {
		providerState,
		visible = true,
		peeking = false,
		onPointerLeave,
	}: {
		providerState: NavbarPanelWidgetState | null;
		visible?: boolean;
		peeking?: boolean;
		onPointerLeave?: () => void;
	} = $props();

	const mountedState = $derived(providerState);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="vaultman-toolbar-slot vaultman-panel-widget-host"
	class:is-hidden-mode={!visible}
	class:is-peeking={peeking}
	data-panel-widget-host-id={PANEL_WIDGET_HOST_ID}
	onpointerleave={onPointerLeave}
>
	{#if mountedState}
		{#key mountedState.providerId}
			<NavbarFilters {...mountedState} />
		{/key}
	{/if}
</div>
