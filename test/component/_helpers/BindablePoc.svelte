<script lang="ts">
	let { value = $bindable() }: { value: string } = $props();
</script>

<input data-testid="poc-input" bind:value />
<span data-testid="poc-readback">{value}</span>
