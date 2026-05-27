// Type declaration for .svelte file imports.
// esbuild-svelte compiles them; tsc only needs to know the component shape.
declare module '*.svelte' {
	import type { Component } from 'svelte';

	const component: Component<Record<string, unknown>>;
	export default component;
}
