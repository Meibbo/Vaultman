import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { stickyTreeRows } from '../../src/logic/logicTreeSticky';
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

		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 40,
				viewportHeight: 200,
			}),
		).toEqual([
			{ index: 0, top: 0 },
			{ index: 1, top: 20 },
		]);
		expect(
			stickyTreeRows(rows, {
				rowHeight: 20,
				scrollTop: 60,
				viewportHeight: 200,
			}),
		).toEqual([]);
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
