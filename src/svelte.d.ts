// Type declaration for .svelte file imports.
// esbuild-svelte compiles them; tsc only needs to know the shape.
declare module '*.svelte' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const component: any;
	export default component;
}

// Side-effect imports that Vite resolves at build time. TypeScript 6.0 (TS2882)
// requires declarations even for side-effect-only imports.
declare module 'virtual:uno.css';
declare module '*.scss';
