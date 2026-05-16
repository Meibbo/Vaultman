import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite-plus';
import { sveltePreprocess } from 'svelte-preprocess';
import UnoCSS from '@unocss/vite';

const external = [
	'obsidian',
	'electron',
	'@codemirror/autocomplete',
	'@codemirror/collab',
	'@codemirror/commands',
	'@codemirror/language',
	'@codemirror/lint',
	'@codemirror/search',
	'@codemirror/state',
	'@codemirror/view',
	'@lezer/common',
	'@lezer/highlight',
	'@lezer/lr',
	...builtinModules,
];

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		conditions: ['browser'],
	},
	fmt: {
		useTabs: true,
		tabWidth: 2,
		printWidth: 100,
		singleQuote: true,
		semi: true,
	},
	plugins: [
		UnoCSS({ configFile: './uno.config.ts' }),
		svelte({
			compilerOptions: {
				css: 'external',
			},
			preprocess: sveltePreprocess(),
		}),
	],
	build: {
		emptyOutDir: true,
		lib: {
			entry: resolve(rootDir, 'src/pluginEntry.ts'),
			formats: ['cjs'],
			fileName: () => 'main.js',
			cssFileName: 'styles',
		},
		minify: true,
		cssMinify: 'esbuild',
		cssTarget: ['chrome120'],
		outDir: 'dist/vite',
		sourcemap: false,
		target: 'es2022',
		rollupOptions: {
			external,
			output: {
				assetFileNames: (assetInfo) => {
					if (assetInfo.names?.includes('styles.css')) {
						return 'styles.css';
					}
					return 'assets/[name][extname]';
				},
				entryFileNames: 'main.js',
			},
		},
		rolldownOptions: {
			external,
			checks: {
				pluginTimings: false,
			},
			output: {
				assetFileNames: (assetInfo) => {
					if (assetInfo.names?.includes('styles.css')) {
						return 'styles.css';
					}
					return 'assets/[name][extname]';
				},
				entryFileNames: 'main.js',
			},
		},
	},
	test: {
		projects: [
			{
				extends: './vitest.config.ts',
			},
		],
	},
});
