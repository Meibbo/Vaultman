import { describe, expect, it } from 'vitest';

import {
	moveNodeToSiblingEdge,
	moveNodeWithinSiblings,
	recencyEdgeForDirection,
} from '../../src/logic/logicTreeNodeMove';
import type { TreeNode } from '../../src/types/typeTree';

function node(id: string, children?: TreeNode[]): TreeNode {
	return { id, label: id, ...(children ? { children } : {}) } as TreeNode;
}

const tree = (): TreeNode[] => [
	node('a'),
	node('folder', [node('b'), node('c'), node('d')]),
	node('e'),
];

describe('BT5-089 single-node tree moves', () => {
	it('moves a root node without touching the others', () => {
		const nodes = tree();
		const result = moveNodeWithinSiblings(nodes, 'e', 0);
		expect(result.changed).toBe(true);
		expect(result.nodes.map((n) => n.id)).toEqual(['e', 'a', 'folder']);
	});

	it('moves a nested node inside its own sibling group only', () => {
		const result = moveNodeToSiblingEdge(tree(), 'd', 'start');
		expect(result.changed).toBe(true);
		expect(result.nodes.map((n) => n.id)).toEqual(['a', 'folder', 'e']);
		expect(result.nodes[1].children?.map((n) => n.id)).toEqual([
			'd',
			'b',
			'c',
		]);
	});

	it('reports no change when the node is already at the edge', () => {
		// The common case while tab-switching: reopening the most recent file,
		// or bouncing between the top two. Skipping here is what removes the
		// stutter, so it must be reported as unchanged rather than as a no-op
		// move that still triggers a re-projection.
		const nodes = tree();
		const result = moveNodeToSiblingEdge(nodes, 'a', 'start');
		expect(result.changed).toBe(false);
		expect(result.nodes).toBe(nodes);
	});

	it('reports no change for an unknown id', () => {
		const nodes = tree();
		const result = moveNodeToSiblingEdge(nodes, 'missing', 'start');
		expect(result.changed).toBe(false);
		expect(result.nodes).toBe(nodes);
	});

	it('keeps untouched subtrees identical so decoration can be reused', () => {
		const nodes = tree();
		const untouched = nodes[1];
		const result = moveNodeWithinSiblings(nodes, 'e', 0);
		expect(result.nodes).not.toBe(nodes);
		expect(result.nodes.find((n) => n.id === 'folder')).toBe(untouched);
	});

	it('rebuilds only the ancestors on the path to a nested move', () => {
		const nodes = tree();
		const rootA = nodes[0];
		const result = moveNodeToSiblingEdge(nodes, 'd', 'start');
		expect(result.nodes[0]).toBe(rootA);
		// The parent is a new object because its children array changed.
		expect(result.nodes[1]).not.toBe(nodes[1]);
	});

	it('clamps an out-of-range target instead of dropping the node', () => {
		const result = moveNodeToSiblingEdge(tree(), 'a', 'end');
		expect(result.nodes.map((n) => n.id)).toEqual(['folder', 'e', 'a']);
	});

	it('sends a freshly touched node to the edge the direction implies', () => {
		expect(recencyEdgeForDirection('desc')).toBe('start');
		expect(recencyEdgeForDirection('asc')).toBe('end');
	});
});
