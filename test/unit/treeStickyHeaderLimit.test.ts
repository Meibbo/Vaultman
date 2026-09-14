import { describe, expect, it } from 'vitest';

import { stickyTreeRows } from '../../src/logic/logicTreeSticky';
import type { TreeNode } from '../../src/types/typeTree';

function folder(id: string, depth: number): TreeNode {
	return { id, label: id, depth, meta: {} };
}

function file(id: string, depth: number): TreeNode {
	return { id, label: id, depth, meta: {} };
}

/** A chain deep enough that no subtree ends near the viewport edge, so the
 *  test measures the LIMIT and not the push-off. */
function deepChainWithTail(): TreeNode[] {
	const rows: TreeNode[] = Array.from({ length: 12 }, (_, depth) =>
		folder(`folder-${depth}`, depth),
	);
	for (let i = 0; i < 30; i += 1) {
		rows.push(file(`tail-${i}`, 12));
	}
	return rows;
}

describe('A18: sticky header limit reaches 100%', () => {
	it('lets a 100% limit cover the whole viewport height', () => {
		// viewport 200px / row 20px = 10 slots; the seven-row ceiling wins.
		expect(
			stickyTreeRows(deepChainWithTail(), {
				rowHeight: 20,
				scrollTop: 220,
				viewportHeight: 200,
				maxFraction: 1,
			}),
		).toHaveLength(7);
	});

	it('keeps the sixty-percent ceiling for values below the new maximum', () => {
		expect(
			stickyTreeRows(deepChainWithTail(), {
				rowHeight: 20,
				scrollTop: 220,
				viewportHeight: 200,
				maxFraction: 0.6,
			}),
		).toHaveLength(6);
	});

	it('keeps the shipped forty-percent default untouched', () => {
		expect(
			stickyTreeRows(deepChainWithTail(), {
				rowHeight: 20,
				scrollTop: 220,
				viewportHeight: 200,
			}),
		).toHaveLength(4);
	});
});
