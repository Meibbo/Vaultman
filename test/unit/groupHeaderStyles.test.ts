import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('U130-03: la cabecera de grupo se ve', () => {
	it('la clase existe en la hoja compilada', () => {
		expect(styles).toContain('.vaultman-tree-row--group-header');
	});

	it('no se sale del sistema de filas del arbol', () => {
		// Si la cabecera se posicionara sola, romperia la virtualizacion, que
		// coloca las filas en absoluto por indice.
		const block = styles.slice(
			styles.indexOf('.vaultman-tree-row--group-header {'),
			styles.indexOf('.vaultman-tree-row--group-header .vaultman-tree-label'),
		);
		expect(block).not.toContain('position:');
		expect(block).not.toContain('height:');
	});
});
