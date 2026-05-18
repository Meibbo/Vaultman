<script lang="ts">
	import type { ThemeService } from '../../../src/services/serviceTheme.svelte';

	let { themeService }: { themeService: ThemeService } = $props();
	const rootClasses = $derived(themeService.rootClasses.join(' '));
</script>

<div data-testid="vm-root-harness" class={rootClasses}></div>
