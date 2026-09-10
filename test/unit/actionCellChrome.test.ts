import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// La hoja COMPILADA, no el .scss: es lo que Obsidian carga. Un guard sobre el
// fuente pasaria aunque el pipeline se comiera la regla.
const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('U130-05b: la celda trae el cromatismo de la superficie', () => {
	const block = styles.slice(
		styles.indexOf('.vaultman-action-cell {'),
		styles.indexOf('.vaultman-action-cell::after'),
	);

	it('declara color, opacidad y glifo como variables', () => {
		// Las variantes se implementan cambiando VARIABLES, no clases por
		// variante: asi una variante nueva no toca el Svelte.
		for (const token of [
			'--vm-action-cell-color',
			'--vm-action-cell-opacity',
			'--vm-action-cell-color-hover',
			'--vm-action-cell-glyph',
		]) {
			expect(block).toContain(token);
		}
	});

	it('conserva los valores que tenia el searchbox, no unos nuevos', () => {
		expect(block).toContain('--vm-action-cell-color: var(--text-muted)');
		expect(block).toContain('--vm-action-cell-opacity: 0.7');
		expect(block).toContain('--vm-action-cell-color-hover: var(--text-normal)');
		expect(block).toContain('--vm-action-cell-glyph: 14px');
		expect(block).toContain('cursor: pointer');
	});

	it('el hover responde, y no en una celda no disponible', () => {
		expect(styles).toContain(
			'.vaultman-action-cell:hover:not(.is-unavailable)',
		);
	});

	it('las DOS copias de la regla de 28px alcanzan a la celda', () => {
		// `_mobile-compat.scss` declara que las copias deben coincidir. Sin esto
		// el searchbox del movil se queda con celdas de 24px donde antes tenia
		// 28: mas pequenas, no mas grandes.
		const rules = styles
			.split('\n')
			.filter(
				(line) =>
					line.includes('.search-input-clear-button') &&
					line.includes(':is('),
			);
		expect(rules).toHaveLength(2);
		expect(rules.every((line) => line.includes('.vaultman-action-cell'))).toBe(
			true,
		);
	});

	it('is-active no pinta nada: alternar un toggle no cambia el aspecto', () => {
		// La puerta del criterio "no cambia nada". aria-pressed si mejora; el
		// pixel no se mueve.
		expect(styles).not.toContain('.vaultman-action-cell.is-active');
	});

	it('el area tactil sigue siendo de 36px y no la mueve el glifo', () => {
		const after = styles.slice(
			styles.indexOf('.vaultman-action-cell::after'),
			styles.indexOf('.vaultman-action-cell.is-unavailable'),
		);
		expect(after).toContain('min-inline-size: 36px');
		expect(after).toContain('min-block-size: 36px');
	});
});
