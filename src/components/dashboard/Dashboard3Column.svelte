<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	interface Props {
		themeService: ThemeService;
		enabled: boolean;
		filters: Snippet;
		explorer: Snippet;
		addons: Snippet;
	}

	let { themeService, enabled, filters, explorer, addons }: Props = $props();
</script>

{#if enabled}
	<div
		class="vm-dashboard vm-dashboard-3col"
		class:vm-faint={themeService.faintActive}
		data-vm-dashboard
	>
		<section
			data-vm-col="filters"
			class="vm-dashboard-col vm-dashboard-col-filters"
		>
			{@render filters()}
		</section>
		<section
			data-vm-col="explorer"
			class="vm-dashboard-col vm-dashboard-col-explorer"
		>
			{@render explorer()}
		</section>
		<section
			data-vm-col="addons"
			class="vm-dashboard-col vm-dashboard-col-addons"
		>
			{@render addons()}
		</section>
	</div>
{:else}
	<div class="vm-dashboard vm-dashboard-1col" class:vm-faint={themeService.faintActive}>
		<section data-vm-col="single" class="vm-dashboard-col">
			{@render explorer()}
		</section>
	</div>
{/if}

<style>
	.vm-dashboard {
		width: 100%;
		height: 100%;
		display: grid;
		gap: 0.5rem;
	}
	.vm-dashboard-3col {
		grid-template-columns: minmax(180px, 1fr) minmax(320px, 2fr) minmax(220px, 1fr);
	}
	.vm-dashboard-1col {
		grid-template-columns: 1fr;
	}
	.vm-dashboard-col {
		overflow: auto;
		min-width: 0;
		min-height: 0;
		border-right: 1px solid var(--vm-border, var(--background-modifier-border));
	}
	.vm-dashboard-col:last-child {
		border-right: none;
	}
</style>
