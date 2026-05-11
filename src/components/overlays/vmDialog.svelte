<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { resolvePortalTarget } from '../../services/servicePortalResolver';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		activeDocument?: Document;
		children?: Snippet;
	}

	let {
		open = $bindable(),
		title,
		description = '',
		activeDocument,
		children,
	}: Props = $props();

	const portalTarget = $derived(
		resolvePortalTarget({ activeDocument: activeDocument ?? document }),
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Portal to={portalTarget}>
		<Dialog.Overlay class="vm-dialog-overlay" />
		<Dialog.Content class="vm-dialog-content vm-card">
			<Dialog.Title class="vm-dialog-title">{title}</Dialog.Title>
			{#if description}
				<Dialog.Description class="vm-dialog-desc">{description}</Dialog.Description>
			{/if}
			{#if children}{@render children()}{/if}
			<Dialog.Close class="vm-btn-squircle vm-dialog-close" aria-label="Close">×</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.vm-dialog-overlay) {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 50;
	}
	:global(.vm-dialog-content) {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		min-width: 320px;
		max-width: 90vw;
		max-height: 90vh;
		overflow: auto;
		z-index: 51;
	}
	:global(.vm-dialog-title) {
		font-size: 1.1em;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}
	:global(.vm-dialog-desc) {
		color: var(--vm-fg, var(--text-muted));
		margin-bottom: 0.75rem;
	}
	:global(.vm-dialog-close) {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
	}
</style>
