import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const scss = readFileSync(
	new URL('../../src/styles/components/_action-cell.scss', import.meta.url),
	'utf8',
);

describe('U130-05 estilos de la celda', () => {
	it('define las dimensiones como variables, no a fuego', () => {
		expect(scss).toContain('--vm-action-cell-size');
	});

	it('garantiza 36px de objetivo tactil en movil', () => {
		// El objetivo de toque no puede depender del glifo: en el searchbox se
		// apilan varios controles pequenos y una pulsacion errada dispara la
		// accion de al lado.
		//
		// `/36px/` a secas lo satisface un COMENTARIO que diga "36px". Hay que
		// exigir la propiedad, y ademas que no se consiga con padding: padding
		// agranda el hitbox moviendo el layout, que es justo lo que se evita.
		expect(scss).toMatch(/min-inline-size:\s*36px/);
		expect(scss).toMatch(/min-block-size:\s*36px/);
		const rules = scss.replace(/\/\*[\s\S]*?\*\//g, '');
		expect(rules).toMatch(/min-inline-size:\s*36px/);
		expect(rules).not.toMatch(/padding:\s*\d+px\s+\d+px/);
	});

	it('las tres variantes son solo variables, no marcado', () => {
		for (const v of ['icon-only', 'icon-box', 'border-circle']) {
			expect(scss).toContain(v);
		}
	});
});
