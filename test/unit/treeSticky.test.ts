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

		// `branch` is pinned at slot 1 only while its subtree still reaches
		// under that slot. At scrollTop 40 its subtree ends at viewport y=20,
		// so pinning it at 20 would float it over `next`, which is not its
		// descendant. It gets pushed up to 0 instead. This expectation used to
		// read `top: 20` and encoded exactly the overlap U121-038 reports.
		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 40,
				viewportHeight: 200,
			}),
		).toEqual([
			{ index: 0, top: 0 },
			{ index: 1, top: 0 },
		]);
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


	it('pushes a deep header as soon as its subtree reaches the sticky area', () => {
		// Three nested parents, so the stack is root > branch > leafParent, and
		// leafParent sits at slot 2. Its own subtree is one row.
		const rows = [
			folder('root', 0),
			folder('branch', 1),
			folder('leafParent', 2),
			file('leaf', 3),
			folder('nextBranch', 1),
			file('tail', 2),
		];
		const rowHeight = 20;
		const at = (scrollTop: number) =>
			stickyTreeRows(rows, { rowHeight, scrollTop, viewportHeight: 400 });

		// leafParent is index 2 and its subtree ends at index 4, so its bottom
		// edge sits at document y = 80. It occupies slot 2, whose band is
		// viewport y 40..60. The push has to begin once the subtree bottom
		// enters that band, i.e. while 80 - scrollTop <= 60, so from scrollTop
		// 20 onwards — not only when it reaches the very top of the frame.
		const pushed = at(50).find((row) => row.index === 2);
		expect(pushed).toBeDefined();
		// Its bottom edge must never cross its own subtree's bottom edge.
		expect((pushed?.top ?? 0) + rowHeight).toBeLessThanOrEqual(80 - 50);
		// Y su slot nominal seria 40: si no se empuja, se queda ahi.
		expect(pushed?.top).toBeLessThan(40);
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
		const rows = Array.from({ length: 12 }, (_, index) =>
			folder(`folder-${index}`, index, [file(`file-${index}`, index + 1)]),
		);
		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 220,
				viewportHeight: 200,
			}),
		).toHaveLength(4);
	});
});
