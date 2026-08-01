import { describe, expect, it } from 'vitest';
import { flattenPropertyValues } from '../../src/logic/logicExplorerHierarchy';
import type { PropMeta, TreeNode } from '../../src/types/typeTree';

describe('U121-003 flat property projection', () => {
	it('keeps property rows and projects their values as unindented parent: value rows', () => {
		const tree: TreeNode<PropMeta>[] = [{
			id: 'status', label: 'status', depth: 0,
			meta: { propName: 'status', propType: 'text', isValueNode: false },
			children: [{
				id: 'status/open', label: 'open', depth: 1,
				meta: { propName: 'status', propType: 'text', isValueNode: true, rawValue: 'open' },
			}],
		}];
		const flat = flattenPropertyValues(tree);
		expect(flat).toHaveLength(2);
		expect(flat[0]).toMatchObject({ label: 'status', depth: 0, showCaret: false, children: [] });
		expect(flat[1]).toMatchObject({ label: 'status: open', depth: 0, showCaret: false, children: [] });
		expect(flat[1].meta.flatLabelPrefix).toBe('status: ');
	});
});
