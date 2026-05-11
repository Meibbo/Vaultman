<script lang="ts">
	import type { AdoptionService } from '../../services/serviceAdoption.svelte';
	import type { ThemeService } from '../../services/serviceTheme.svelte';
	import type { AdoptedNode } from '../../types/typeAdoptedNode';

	interface Props {
		tree: AdoptedNode[];
		themeService: ThemeService;
		adoptionService: AdoptionService;
	}

	let { tree, themeService, adoptionService }: Props = $props();

	const useNativeDom = $derived(themeService.useNativeDom);
	const adoptionEnabled = $derived(adoptionService.enabled);

	function rowClass(): string {
		return useNativeDom ? 'tree-item vm-outline-row' : 'vm-outline-row';
	}

	function rowSurfaceClass(): string {
		return useNativeDom ? 'tree-item-self vm-outline-self' : 'vm-outline-self';
	}

	function labelClass(): string {
		return useNativeDom ? 'tree-item-inner vm-outline-label' : 'vm-outline-label';
	}

	function iconFor(kind: AdoptedNode['kind']): string {
		if (kind === 'header') return 'i-lucide-heading';
		if (kind === 'task') return 'i-lucide-square-check';
		return 'i-lucide-bookmark';
	}
</script>

{#snippet row(node: AdoptedNode)}
	<div class={rowClass()} style:--vm-outline-depth={`${node.depth * 12}px`} data-vm-outline-kind={node.kind}>
		<div class={rowSurfaceClass()}>
			<span class="{iconFor(node.kind)} vm-outline-icon" aria-hidden="true"></span>
			<span class={labelClass()}>{node.label}</span>
		</div>
		{#if node.children.length}
			<div class={useNativeDom ? 'tree-item-children vm-outline-children' : 'vm-outline-children'}>
				{#each node.children as child (child.id)}
					{@render row(child)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div
	class="vm-outline-explorer"
	data-vm-explorer="outline"
	data-vm-adoption-enabled={adoptionEnabled}
>
	{#each tree as node (node.id)}
		{@render row(node)}
	{/each}
</div>

<style>
	.vm-outline-row {
		padding-left: var(--vm-outline-depth);
	}

	.vm-outline-self {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 24px;
	}

	.vm-outline-icon {
		flex: 0 0 auto;
	}
</style>
