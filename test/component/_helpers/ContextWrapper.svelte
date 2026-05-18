<script lang="ts">
	import { setContext, type Component } from 'svelte';

	let {
		child,
		childProps,
		contextEntries,
	}: {
		child: Component<Record<string, unknown>>;
		childProps: Record<string, unknown>;
		contextEntries: ReadonlyArray<readonly [symbol, unknown]>;
	} = $props();

	// svelte-ignore state_referenced_locally
	for (const [key, value] of contextEntries) {
		setContext(key, value);
	}

	// svelte-ignore state_referenced_locally
	const ChildComponent = child;
</script>

<ChildComponent {...childProps} />
