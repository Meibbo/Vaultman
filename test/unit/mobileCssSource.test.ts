import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

describe('mobile CSS source guards', () => {
	it('keeps phone navbar controls above Obsidian mobile gradients and moves Vaultman dock to the top', () => {
		// The plugin opts into Core's exact `nav-buttons-container` contract. It
		// must not duplicate the drawer geometry or gradient, because doing so
		// blocks theme-owned variants such as Baseline.
		expect(stylesSource).not.toMatch(
			/\.is-phone \.workspace-drawer[^\n]*\.vaultman-filters-actions\.nav-buttons-container\s*\{/,
		);
		expect(stylesSource).toContain('.vaultman-bottom-nav');
		expect(stylesSource).toContain('top: 0');
		expect(stylesSource).toContain('bottom: auto');
		expect(stylesSource).toContain('background: transparent');
		expect(stylesSource).toContain('border: 0');
		expect(stylesSource).toContain('box-shadow: none');
		expect(stylesSource).toContain(
			'.vaultman-navbar-filters.vaultman-glass::before',
		);
		expect(stylesSource).toContain('-webkit-mask-image: none');
	});

	it('keeps phone minimal search as a top overlay while the search button remains a toggle', () => {
		expect(stylesSource).not.toContain(
			'.vaultman-filters-header--minimal .vaultman-filters-header-search-pill:focus-within',
		);
		expect(stylesSource).toContain('container-type: inline-size');
		// U121-029: the desktop second row is measured (`searchNeedsOwnRow`), not
		// a 799px container query — that threshold was wider than any sidebar and
		// its `flex-wrap: wrap` broke the single-line overflow packer.
		expect(stylesSource).not.toMatch(/^\s*@container \(max-width: 799px\)/m);
		expect(stylesSource).toContain('.vaultman-filters-search-row');
		expect(stylesSource).toContain('.vaultman-filters-header-search-pill--row');
		expect(stylesSource).toMatch(
			/\.is-phone[^{]*\.vaultman-filters-search-row \{\s*display: none;/,
		);
		expect(stylesSource).toContain('.vaultman-filters-header-search-pill');
		expect(stylesSource).toContain('.vaultman-filters-phone-search-row');
		expect(stylesSource).toContain('position: static');
		expect(stylesSource).toContain('padding: 8px 8px 4px');
		expect(stylesSource).toContain('background: transparent');
		expect(stylesSource).toContain(
			'border-bottom-color: var(--background-modifier-border)',
		);
		expect(stylesSource).toContain(
			'.vaultman-filters-header-search-pill--inline',
		);
		expect(stylesSource).toContain(
			'.vaultman-filters-header-search-pill--phone',
		);
		const searchBlock =
			stylesSource.match(
				/\.vaultman-filters-header-search-pill\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(searchBlock).not.toContain('border-radius: 999px');
		expect(stylesSource).not.toContain('vaultman-minimal-search-row');
		expect(stylesSource).toContain('width: 28px');
		expect(stylesSource).toContain('height: 28px');
	});

	it('keeps inactive island backdrop from blurring the phone explorer', () => {
		expect(stylesSource).toContain('.vaultman-island-backdrop:not(.is-open)');
		expect(stylesSource).toContain(
			'.vaultman-island-backdrop:not(.is-open)::before',
		);
		expect(stylesSource).toContain('backdrop-filter: none');
	});

	it('keeps container queries scoped to the filters navbar instead of the virtualized page', () => {
		const pageBlock =
			stylesSource.match(/\.vaultman-page\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		const navbarBlock =
			stylesSource.match(/\.vaultman-navbar-filters\s*\{[\s\S]*?\n\}/)?.[0] ??
			'';

		expect(pageBlock).not.toContain('container-type');
		expect(navbarBlock).toContain('container-type: inline-size');
	});

	it('centers the toolbar by shrink-wrapping the action row', () => {
		// U121-029: the toolbar used to be centered by capping the header wrap at
		// a fixed 520px, which is narrower than a wide leaf and wider than a
		// sidebar. The action row shrink-wraps its own nodes instead, so the
		// centering follows the nodes at any width.
		const actionsBlock =
			stylesSource.match(
				/(?:^|\n)\.vaultman-filters-actions\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(actionsBlock).toContain('width: max-content');
		expect(actionsBlock).toContain('max-width: 100%');
		expect(actionsBlock).toContain('margin-inline: auto');
		expect(actionsBlock).toContain('justify-content: center');
		expect(stylesSource).not.toContain('520px');
	});

	it('lets Core paint its drawer gradient across the whole phone side leaf', () => {
		// The action row is the box that opts into Core's `nav-buttons-container`,
		// and Core's gradient spans the entire drawer. Shrink-wrapping it there
		// cropped the gradient to the span between the first and the last node, so
		// this surface — and only this one — takes the full width back and leans
		// on the flexbox centering the base rule already declares.
		const phoneDrawerActions =
			stylesSource.match(
				/\.is-phone \.workspace-drawer[^{]*\.vaultman-filters-actions\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(phoneDrawerActions).not.toBe('');
		expect(phoneDrawerActions).toContain('width: 100%');
		expect(phoneDrawerActions).not.toContain('max-content');
		// Still Core's contract, not a reimplementation of its gradient.
		expect(phoneDrawerActions).not.toContain('linear-gradient');
	});

	it('aligns phone explorer viewport padding with core panes instead of custom side padding', () => {
		// El contrato de esta prueba son los LADOS: cero padding horizontal, como
		// los panes de Core. El `8px` de arriba venia arrastrado en la cadena y
		// U121-039 lo saco de aqui: el scrollport es el bloque contenedor de
		// `.vaultman-tree-sticky-layer`, y un `position: sticky` no puede subir
		// por encima de el, asi que ese padding dejaba una rendija por la que se
		// asomaban las filas al pasar bajo los sticky. El aire vive ahora en el
		// margen del spacer, que scrollea y no acota al sticky.
		expect(stylesSource).toContain('padding: 0 0 96px');
		expect(stylesSource).not.toContain('padding: 8px 0 96px');
	});

	it('keeps the mobile scrollport from clamping the sticky layer', () => {
		// La rendija de U121-039 vuelve en cuanto alguien devuelva el aire al
		// padding del scrollport, asi que se guarda la pareja, no solo el valor.
		expect(stylesSource).toContain(
			'.vaultman-tree-virtual-viewport > .vaultman-tree-virtual-spacer',
		);
		const spacerRule =
			stylesSource.match(
				/\.vaultman-tree-virtual-viewport > \.vaultman-tree-virtual-spacer\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(spacerRule).toContain('margin-top: 8px');
	});

	it('keeps mobile tree row CSS height aligned with the fixed virtual row model', () => {
		expect(stylesSource).toContain(
			'.is-mobile .workspace-leaf-content[data-type="vaultman-frame"]',
		);
		expect(stylesSource).toContain('.vaultman-tree-row.tree-item-self');
		expect(stylesSource).toContain('height: 37px');
		expect(stylesSource).not.toContain('height: 36.7969px');
	});

	it('enlarges explorer table, grid, and floating index nodes on mobile surfaces', () => {
		expect(stylesSource).toContain('.vaultman-files-table-header-row');
		expect(stylesSource).toContain('.vaultman-node-table-header-row');
		expect(stylesSource).toContain('--bases-table-row-height: 37px');
		expect(stylesSource).toContain('.vaultman-files-grid-card');
		expect(stylesSource).toContain('.vaultman-floating-toc-item');
		expect(stylesSource).toContain('flex: 0 0 20px');
		expect(stylesSource).toContain('flex-basis: 24px');
	});

	it('keeps Content and Statistics buttons transparent in their resting state', () => {
		expect(stylesSource).toContain(
			'.vaultman-content-find-row .vaultman-icon-toggle',
		);
		expect(stylesSource).toContain('vaultman-content-clear-button');
		expect(stylesSource).toContain('.vaultman-stat-card {\n  display: flex;');
		expect(stylesSource).toContain('background: transparent');
		expect(stylesSource).not.toContain(
			'.vaultman-statistics-page button.vaultman-stat-card',
		);
		expect(stylesSource).not.toContain(
			'.vaultman-statistics-page button.vaultman-stat-scope-pill',
		);
	});

	it('separates Content inputs and aligns explicit Content input icons', () => {
		// U121-069: esta prueba afirmaba `border-top: …` y `background:
		// var(--color-accent)` con un `toContain` sobre la hoja ENTERA, asi que
		// seguia verde despues de borrar las reglas que decia guardar -- esas
		// cadenas salen en otros sitios. Peor: las declaraciones que afirmaba
		// eran precisamente las que el refactor habia dejado sobre el selector
		// equivocado, pintando un cuadrado de acento sobre la lupa.
		// Ahora se extrae LA regla y se afirma dentro de ella.
		expect(stylesSource).toContain(
			'.vaultman-content-search-container.search-input-container::before',
		);

		const iconRule =
			stylesSource.match(
				/^\.vaultman-content-input-icon\s*\{[\s\S]*?\n\}/m,
			)?.[0] ?? '';
		expect(iconRule).not.toBe('');
		// Es un glifo dentro del input, no una superficie pintada.
		expect(iconRule).toContain('position: absolute');
		expect(iconRule).toContain('color: var(--text-faint)');
		expect(iconRule).not.toContain('background:');
		expect(iconRule).not.toContain('border-top:');
	});

	it('hides the Content input glyph with its placeholder', () => {
		// El glifo se comporta como parte del placeholder: visible con el input
		// vacio, y fuera en cuanto hay texto para que lo escrito ocupe la linea
		// desde el borde. El hueco lo decide UNA variable que leen el padding
		// del input y el arranque del subrayado, para que no se desincronicen.
		expect(stylesSource).toContain(
			'.vaultman-content-search-container:has(.vaultman-content-input:not(:placeholder-shown))',
		);
		expect(stylesSource).toContain(
			'padding-inline-start: var(--vaultman-content-input-gutter)',
		);
		expect(stylesSource).toContain(
			'inset-inline-start: var(--vaultman-content-input-gutter)',
		);
	});

	it('keeps Content clear buttons large enough for the compact input scale', () => {
		// Mismo motivo que arriba: acotado a su regla. `padding-inline-end: 34px`
		// es del INPUT, no del boton, y afirmarlo suelto hacia pasar la prueba
		// con la copia mutilada del boton puesta.
		const clearRule =
			stylesSource.match(
				/^\.vaultman-content-clear-button\s*\{[\s\S]*?\n\}/m,
			)?.[0] ?? '';
		expect(clearRule).not.toBe('');
		expect(clearRule).toContain('inset-inline-end: 2px');
		expect(clearRule).toContain('width: 28px');
		expect(clearRule).not.toContain('padding-inline-end: 34px');
		expect(stylesSource).toContain('height: 28px');
		expect(stylesSource).toContain('.vaultman-content-clear-button svg');
		expect(stylesSource).toContain('width: 16px');
		expect(stylesSource).toContain('height: 16px');
	});
});
