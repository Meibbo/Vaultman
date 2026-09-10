import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * U130-05b: la guarda del cableado del searchbox.
 *
 * No tiene superficie de DOM ni de logica pura: es una relacion entre ficheros
 * --"todo host que monta el searchbox pasa el registro"-- y por eso vive aqui.
 *
 * La escribo porque ya fallo: `pageStatistics.svelte` tambien construye un
 * NavbarPanelWidgetState, y al migrar el searchbox a SASI se quedo sin
 * `sasiRegistry`. Sus dos celdas se pintaban y no hacian nada. Antes de la
 * migracion `onCycleCategory` se cableaba SIEMPRE, asi que era una regresion
 * silenciosa, no una ausencia.
 */
const pagesDir = fileURLToPath(new URL('../../src/components/pages', import.meta.url));

const hosts = readdirSync(pagesDir)
	.filter((name) => name.endsWith('.svelte'))
	.map((name) => ({ name, source: readFileSync(join(pagesDir, name), 'utf8') }))
	.filter(({ source }) => source.includes('NavbarPanelWidgetState'))
	.filter(({ source }) => /const state:\s*NavbarPanelWidgetState/.test(source));

describe('U130-05b: todo host del searchbox pasa el registro de SASI', () => {
	it('hay al menos dos hosts, o este guard no esta mirando nada', () => {
		// Un guard que recorre una lista vacia pasa siempre.
		expect(hosts.length).toBeGreaterThanOrEqual(2);
	});

	it('cada host que construye el estado del panelWidget pasa sasiRegistry', () => {
		for (const { name, source } of hosts) {
			expect(source, `${name} monta el searchbox sin sasiRegistry`).toContain(
				'sasiRegistry:',
			);
		}
	});

	it('el host del searchbox no se traga un registro ausente', () => {
		// Si `invokeSearchCell` es null y `runSearchCell` hace un no-op, la celda
		// muere sin decirlo. Tiene que avisar.
		const navbar = readFileSync(
			new URL('../../src/components/layout/navbarFilters.svelte', import.meta.url),
			'utf8',
		);
		const fn = navbar.slice(
			navbar.indexOf('function runSearchCell'),
			navbar.indexOf('function runSearchCell') + 800,
		);
		expect(fn).toContain('if (!invokeSearchCell)');
		expect(fn).toContain('new Notice');
		// La forma que producia el silencio.
		expect(fn).not.toContain('invokeSearchCell?.(');
	});
});
