<script lang="ts">
	import type { AddonsIslandService } from '../../services/serviceAddonsIsland.svelte';

	interface Props {
		service: AddonsIslandService;
		statsRenderer: () => string;
		markdownRenderer?: (path: string, mountPoint: HTMLElement) => void;
	}

	let { service, statsRenderer, markdownRenderer }: Props = $props();

	let mdMount: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (service.activePane === 'markdown' && service.notePath && markdownRenderer && mdMount) {
			mdMount.replaceChildren();
			markdownRenderer(service.notePath, mdMount);
		}
	});
</script>

{#if service.activePane === 'stats'}
	<div class="vm-addons-stats">{statsRenderer()}</div>
{:else}
	<div bind:this={mdMount} class="vm-addons-markdown"></div>
{/if}

<style>
	.vm-addons-stats,
	.vm-addons-markdown {
		padding: 0.5rem;
		overflow: auto;
		height: 100%;
	}
</style>
