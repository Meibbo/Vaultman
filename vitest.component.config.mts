import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * U130: montaje real de componentes Svelte 5.
 *
 * Va en su propio fichero y no dentro de `vitest.config.ts` (integracion) ni de
 * `vitest.unit.config.mts` a proposito: los launchers de los agentes y el
 * script `test:unit` dependen de ese segundo, y meterle un entorno jsdom le
 * cambiaria el suelo a 250 tests que hoy corren en `node`.
 *
 * El harness es el que ya funciona en `m2/sandbox` sobre 100+ tests: `svelte()`
 * como plugin, `conditions: ['browser']` --sin el, Vite resuelve el export de
 * servidor de Svelte y `mount()` no pinta nada-- y el mock de `obsidian` por
 * alias.
 */
const obsidianMockPath = fileURLToPath(
	new URL('./test/helpers/obsidian-mocks.ts', import.meta.url),
);

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ['browser'],
	},
	test: {
		name: 'component',
		environment: 'jsdom',
		fileParallelism: false,
		include: ['test/component/**/*.test.ts'],
		setupFiles: ['test/component/setup.ts'],
		alias: {
			obsidian: obsidianMockPath,
		},
	},
});
