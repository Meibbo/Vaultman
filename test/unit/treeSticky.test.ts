import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { stickyTreeRows } from '../../src/logic/logicTreeSticky';
import { flattenVisibleTreeWithChain } from '../../src/utils/treeVirtualization';
import type { TreeNode } from '../../src/types/typeTree';

// `styles.css?raw` resolves to an empty string under the CSS pipeline, so the
// stylesheet is read from disk like the other stylesheet guards in this suite.
const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

function folder(id: string, depth: number, children: TreeNode[] = []): TreeNode {
	return {
		id,
		label: id,
		depth,
		children,
		meta: {},
	};
}

function file(id: string, depth: number): TreeNode {
	return { id, label: id, depth, meta: {} };
}

describe('stickyTreeRows', () => {
	it('sticks an expanded parent while its visible subtree is active', () => {
		const rows = [
			folder('parent', 0),
			file('child-a', 1),
			file('child-b', 1),
			folder('next', 0),
		];

		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 20,
				viewportHeight: 100,
			}),
		).toEqual([{ index: 0, top: 0 }]);
	});

	it('keeps nested parents in order and removes them after their subtree', () => {
		const rows = [
			folder('root', 0),
			folder('branch', 1),
			file('child', 2),
			folder('next', 0),
		];

		// A scrollTop 40 el unico hijo de `branch` queda integramente cubierto
		// por el sticky de `root`, asi que `branch` ya no encabeza nada visible
		// y sale de la pila. Con el modelo anterior seguia dibujado sin
		// contenido propio debajo, y ese era el sticky de mas que el dev veia
		// reacomodarse. La expectativa original leia `top: 20`, que ademas lo
		// hacia flotar sobre `next`, que no es descendiente suyo.
		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 40,
				viewportHeight: 200,
			}),
		).toEqual([{ index: 0, top: 0 }]);
		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 60,
				viewportHeight: 200,
			}),
		).toEqual([]);
	});


	it('pushes a parent up by the next p-node instead of dropping it', () => {
		// The repro from U121-038: P at index 10, a single child at 11 and Q at
		// 12. Pinned at slot 0 the header covered the top of Q; now it is
		// pushed up so its bottom edge lands exactly on Q's top edge.
		const rows = [
			...Array.from({ length: 10 }, (_, index) => file(`lead-${index}`, 0)),
			folder('p', 0),
			file('p-child', 1),
			folder('q', 0),
			file('q-child', 1),
		];
		const rowHeight = 28;
		const stickyTop = (scrollTop: number) =>
			stickyTreeRows(rows, { rowHeight, scrollTop, viewportHeight: 400 }).find(
				(row) => row.index === 10,
			)?.top;

		// Still fully inside its own subtree: pinned flush to the top.
		expect(stickyTop(10 * rowHeight)).toBe(0);
		// Q's top edge is 12 * 28 = 336. At scrollTop 330 it sits at viewport
		// y=6, so the header must end there, not at 28.
		expect(stickyTop(330)).toBe(336 - 330 - rowHeight);
		expect(stickyTop(330)).toBeLessThan(0);
	});

	it('never lets a sticky row overlap the p-node that follows its subtree', () => {
		const rows = [
			folder('p', 0),
			file('a', 1),
			file('b', 1),
			folder('q', 0),
			file('c', 1),
		];
		const rowHeight = 20;
		const subtreeBottom = 3 * rowHeight;
		for (let scrollTop = 1; scrollTop < subtreeBottom; scrollTop += 1) {
			const sticky = stickyTreeRows(rows, {
				rowHeight,
				scrollTop,
				viewportHeight: 200,
			}).find((row) => row.index === 0);
			if (!sticky) continue;
			// `q` starts at document y = subtreeBottom, i.e. viewport y =
			// subtreeBottom - scrollTop. The header's bottom may touch it but
			// never cross it.
			expect(sticky.top + rowHeight).toBeLessThanOrEqual(
				subtreeBottom - scrollTop,
			);
		}
	});


	it('matches the scan it replaces, at every scroll position', () => {
		// The precomputed chain exists to stop walking every row above the
		// viewport. It is only worth having if it cannot change the answer, so
		// this compares the two paths across a deep tree at every row boundary
		// and half-row in between.
		const tree: TreeNode[] = Array.from({ length: 6 }, (_, a) =>
			folder(
				`a-${a}`,
				0,
				Array.from({ length: 4 }, (_, b) =>
					folder(
						`b-${a}-${b}`,
						1,
						Array.from({ length: 3 }, (_, c) =>
							folder(`c-${a}-${b}-${c}`, 2, [file(`f-${a}-${b}-${c}`, 3)]),
						),
					),
				),
			),
		);
		const expanded = new Set<string>();
		const mark = (items: TreeNode[]): void => {
			for (const item of items) {
				if (item.children?.length) {
					expanded.add(item.id);
					mark(item.children);
				}
			}
		};
		mark(tree);

		const { rows, parentIndex, subtreeEnd } = flattenVisibleTreeWithChain(
			tree,
			expanded,
		);
		expect(rows.length).toBeGreaterThan(100);

		const rowHeight = 24;
		for (let step = 1; step < rows.length * 2; step += 1) {
			const scrollTop = Math.floor((step * rowHeight) / 2);
			const scanned = stickyTreeRows(rows, {
				rowHeight,
				scrollTop,
				viewportHeight: 480,
			});
			const walked = stickyTreeRows(rows, {
				rowHeight,
				scrollTop,
				viewportHeight: 480,
				parentIndex,
				subtreeEnd,
			});
			expect(walked).toEqual(scanned);
		}
	});


	it('slides a deep header up until it is covered, then drops it', () => {
		// Escrito antes con el modelo equivocado: pedia que la cabecera siguiera
		// visible en una posicion donde su subarbol ya termina POR ENCIMA de su
		// propio slot, o sea donde no le corresponde estar.
		//
		// Lo correcto: mientras su subarbol la alcanza se desliza hacia arriba
		// (salida gradual, sin pop); en cuanto quedaria exactamente cubierta por
		// la de encima se retira, porque dibujarla ahi la esconde detras y deja
		// su hueco vacio. Ese era el fallo que el dev veia en todo nivel por
		// debajo del primero.
		const rows = [
			folder('root', 0),
			folder('branch', 1),
			folder('leafParent', 2),
			file('leaf', 3),
			folder('nextBranch', 1),
			file('tail', 2),
		];
		const rowHeight = 20;
		const stackAt = (scrollTop: number) =>
			stickyTreeRows(rows, { rowHeight, scrollTop, viewportHeight: 400 });

		// Dentro de su subarbol: fijada en su slot, sin invertir la pila.
		const inside = stackAt(70);
		for (let i = 1; i < inside.length; i += 1) {
			expect(inside[i]?.top).toBeGreaterThanOrEqual(inside[i - 1]?.top ?? 0);
		}

		// En ninguna posicion puede quedar por encima de su vecina de arriba.
		for (let scrollTop = 1; scrollTop < rows.length * rowHeight; scrollTop += 5) {
			const stack = stackAt(scrollTop);
			for (let i = 1; i < stack.length; i += 1) {
				expect(stack[i]?.top).toBeGreaterThanOrEqual(stack[i - 1]?.top ?? 0);
			}
		}
	});

	it('parks the sticky layer under whatever the layout overlays', () => {
		// The band the dev sees between the toolbar and the first pinned row is
		// this offset missing. The original design carried it as
		// `stickyTopOffset` and the rewrite from .svelte to .ts dropped it, so
		// the layer sat at the raw top edge of the scrollport, behind the nav
		// tools. Phones overlay nothing, which is why zero looked right there
		// and only there.
		//
		// BT5-059 asks for the real owner to be fixed rather than compensated
		// with negative margins, so the offset belongs to the layer's own top.
		const viewTreeSource = readFileSync(
			new URL('../../src/components/layout/viewTree.ts', import.meta.url),
			'utf8',
		);
		expect(viewTreeSource).toContain('stickyTopOffset');
		expect(viewTreeSource).toContain('_applyStickyTopOffset');
		// Measured from the content box, not read back from a rect per frame.
		expect(viewTreeSource).toContain('content.offsetTop');
		expect(viewTreeSource).not.toContain('margin-top: -');
	});


	it('fills the whole step so no slit shows between stacked headers', () => {
		// Measured on the dev's vault: rows step by 28px, their box is 27px and
		// the last pixel is a bottom margin. Inside the sticky layer that
		// margin turns into a 1px slit of scrolling content between headers —
		// one per slot, which is why it reads worse the deeper the stack. On a
		// phone the mobile rule zeroes the margin, so height and step already
		// match and nothing shows.
		const viewTreeSource = readFileSync(
			new URL('../../src/components/layout/viewTree.ts', import.meta.url),
			'utf8',
		);
		expect(viewTreeSource).toContain('row.style.height = `${rowHeight}px`');
		// El margen es estatico, asi que vive en CSS: el linter de Obsidian
		// prohibe asignarlo desde JS. La altura si es dinamica y se queda.
		const treeCss = readFileSync(
			new URL('../../src/styles/views/_tree.scss', import.meta.url),
			'utf8',
		);
		expect(treeCss).toContain('margin-bottom: 0');
	});


	it('never inverts: a header is never drawn above the one it sits under', () => {
		// The defect the dev reported for every level below the first. Measured
		// on their vault the deepest header sat at top 71 with the one above it
		// at 84, so it painted behind and disappeared while its slot stayed
		// empty. Sweeping a deep tree at half-row steps is the only way to
		// catch it: it depends on where each subtree happens to end.
		const tree: TreeNode[] = Array.from({ length: 4 }, (_, a) =>
			folder(
				`a-${a}`,
				0,
				Array.from({ length: 3 }, (_, b) =>
					folder(
						`b-${a}-${b}`,
						1,
						Array.from({ length: 2 }, (_, c) =>
							folder(`c-${a}-${b}-${c}`, 2, [
								file(`f1-${a}-${b}-${c}`, 3),
								file(`f2-${a}-${b}-${c}`, 3),
							]),
						),
					),
				),
			),
		);
		const expanded = new Set<string>();
		const mark = (items: TreeNode[]): void => {
			for (const item of items) {
				if (item.children?.length) {
					expanded.add(item.id);
					mark(item.children);
				}
			}
		};
		mark(tree);
		const { rows, parentIndex, subtreeEnd } = flattenVisibleTreeWithChain(
			tree,
			expanded,
		);

		const rowHeight = 28;
		for (let step = 1; step < rows.length * 2; step += 1) {
			const scrollTop = Math.floor((step * rowHeight) / 2);
			const stack = stickyTreeRows(rows, {
				rowHeight,
				scrollTop,
				viewportHeight: 600,
				parentIndex,
				subtreeEnd,
			});
			for (let i = 1; i < stack.length; i += 1) {
				const above = stack[i - 1];
				const here = stack[i];
				if (!above || !here) continue;
				expect(here.top).toBeGreaterThanOrEqual(above.top);
			}
		}
	});

	it('has a layer the rows can actually float in', () => {
		// The view builds the layer and positions each row inside it, so without
		// these two rules the whole setting is inert: an unstyled strip scrolls
		// away with the content it is supposed to stay above.
		const layer = stylesSource.slice(
			stylesSource.indexOf('.vaultman-tree-sticky-layer {'),
			stylesSource.indexOf('.vaultman-tree-sticky-layer .vaultman-tree-row--sticky {'),
		);
		expect(layer).not.toBe('');
		expect(layer).toContain('position: sticky;');
		expect(layer).toContain('top: 0;');
		// A strip with height would push the virtual spacer down by its own size.
		expect(layer).toContain('height: 0;');

		const rowStart = stylesSource.indexOf(
			'.vaultman-tree-sticky-layer .vaultman-tree-row--sticky {',
		);
		const row = stylesSource.slice(
			rowStart,
			stylesSource.indexOf('}', rowStart),
		);
		expect(row).toContain('position: absolute;');
		expect(row).toContain('pointer-events: auto;');
	});

	it('caps the stack at the smaller of seven rows and forty percent height', () => {
		// Cola profunda larga a proposito: asi ningun subarbol termina cerca del
		// borde en esta posicion y la prueba mide el TOPE, que es lo que dice su
		// nombre. Con el arbol anterior los doce subarboles acababan en el mismo
		// punto, se empujaban todos a la vez y la longitud acababa dependiendo
		// del empuje en vez del limite.
		const rows: TreeNode[] = Array.from({ length: 12 }, (_, depth) =>
			folder(`folder-${depth}`, depth),
		);
		for (let i = 0; i < 30; i += 1) {
			rows.push(file(`tail-${i}`, 12));
		}
		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 220,
				viewportHeight: 200,
			}),
		).toHaveLength(4);
	});
});
