import { describe, expect, it } from 'vitest';
import {
	buildOperationTargetSet,
	type OperationTarget,
} from '../../src/logic/logicOperationTargetSet';

describe('buildOperationTargetSet deduplication and target composition', () => {
	const nodeA: OperationTarget = { id: 'a', kind: 'file', node: { path: 'a.md' } };
	const nodeB: OperationTarget = { id: 'b', kind: 'file', node: { path: 'b.md' } };
	const nodeC: OperationTarget = { id: 'c', kind: 'file', node: { path: 'c.md' } };

	it('uses selected nodes when invoked node is already in selected set', () => {
		const targetSet = buildOperationTargetSet({
			selectedNodes: [nodeA, nodeB],
			invokedNode: nodeA,
		});

		expect(targetSet.count).toBe(2);
		expect(targetSet.targets).toEqual([nodeA, nodeB]);
	});

	it('appends invoked node when invoked node is not in selected set', () => {
		const targetSet = buildOperationTargetSet({
			selectedNodes: [nodeA, nodeB],
			invokedNode: nodeC,
		});

		expect(targetSet.count).toBe(3);
		expect(targetSet.targets).toEqual([nodeA, nodeB, nodeC]);
	});

	it('handles empty selected set and single invoked node', () => {
		const targetSet = buildOperationTargetSet({
			selectedNodes: [],
			invokedNode: nodeB,
		});

		expect(targetSet.count).toBe(1);
		expect(targetSet.targets).toEqual([nodeB]);
	});

	it('returns empty target set when no nodes are selected or invoked', () => {
		const targetSet = buildOperationTargetSet({
			selectedNodes: [],
			invokedNode: null,
		});

		expect(targetSet.count).toBe(0);
		expect(targetSet.targets).toEqual([]);
	});
});
