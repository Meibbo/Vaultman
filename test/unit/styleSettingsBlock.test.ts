import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Unified Vaultman Style Settings', () => {
	const scss = readFileSync(
		new URL('../../src/styles/residual/_virtual-scroll-compat.scss', import.meta.url),
		'utf8',
	);

	it('publica un bloque @settings unificado bajo el id único vaultman', () => {
		expect(scss).toContain('/* @settings');
		expect(scss).toContain('name: Vaultman');
		expect(scss).toContain('id: vaultman');
	});

	it('incluye configuración de celda de acción con sus tres variantes y tamaño', () => {
		expect(scss).toContain('id: vaultman-action-cell-variant');
		for (const v of ['icon-only', 'icon-box', 'border-circle']) {
			expect(scss).toContain(v);
		}
		expect(scss).toContain('id: vaultman-action-cell-size');
	});

	it('incluye indent step para los árboles', () => {
		expect(scss).toContain('id: vaultman-tree-indent-unit');
	});

	it('incluye controles para gutter y padding de nodo (izquierda, derecha, arriba, abajo)', () => {
		expect(scss).toContain('id: vaultman-tree-node-gutter-left');
		expect(scss).toContain('id: vaultman-tree-node-gutter-right');
		expect(scss).toContain('id: vaultman-tree-node-padding-top');
		expect(scss).toContain('id: vaultman-tree-node-padding-bottom');
	});

	it('_action-cell.scss no contiene bloque @settings duplicado', () => {
		const actionCellScss = readFileSync(
			new URL('../../src/styles/components/_action-cell.scss', import.meta.url),
			'utf8',
		);
		expect(actionCellScss).not.toContain('/* @settings');
	});
});
