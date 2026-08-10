import { describe, expect, it } from 'vitest';

import { stickyTreeRows } from '../../src/logic/logicTreeSticky';
import type { TreeNode } from '../../src/types/typeTree';

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
