<script lang="ts">
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { resolvePortalTarget } from '../../services/servicePortalResolver';

	interface Props {
		open: boolean;
		triggerLabel?: string;
		triggerClass?: string;
		triggerPressed?: boolean;
		triggerSnippet?: Snippet;
		activeDocument?: Document;
		children?: Snippet;
	}

	let {
		open = $bindable(),
		triggerLabel = '',
		triggerClass = 'vm-btn-find',
		triggerPressed,
		triggerSnippet,
		activeDocument,
		children,
	}: Props = $props();

	const portalTarget = $derived(
		resolvePortalTarget({ activeDocument: activeDocument ?? document }),
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={triggerClass}
		aria-label={triggerLabel || undefined}
		title={triggerLabel || undefined}
		aria-pressed={triggerPressed}
	>
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
