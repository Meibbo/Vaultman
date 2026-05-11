<script lang="ts">
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { resolvePortalTarget } from '../../services/servicePortalResolver';

	interface Props {
		open: boolean;
		triggerLabel?: string;
		triggerSnippet?: Snippet;
		activeDocument?: Document;
		children?: Snippet;
	}

	let {
		open = $bindable(),
		triggerLabel = '',
		triggerSnippet,
		activeDocument,
		children,
	}: Props = $props();

	const portalTarget = $derived(
		resolvePortalTarget({ activeDocument: activeDocument ?? document }),
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="vm-btn-find">
		{#if triggerSnippet}{@render triggerSnippet()}{:else}{triggerLabel}{/if}
	</Popover.Trigger>
	<Popover.Portal to={portalTarget}>
		<Popover.Content class="vm-popover-content vm-card">
			{#if children}{@render children()}{/if}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

<style>
	:global(.vm-popover-content) {
		min-width: 240px;
		max-width: 480px;
		z-index: 60;
	}
</style>
