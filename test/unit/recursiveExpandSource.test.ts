import { describe, expect, it } from 'vitest';

import { toggleExpandableSubtreeIds } from '../../src/logic/logicTreeExpansion';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import type { TreeNode } from '../../src/types/typeTree';

describe('recursive expand input source guards', () => {
	it('toggles the pressed node and every expandable descendant', () => {
		const tree: TreeNode = {
			id: 'root',
			label: 'Root',
			depth: 0,
			meta: {},
			children: [
				{
					id: 'child',
					label: 'Child',
					depth: 1,
					meta: {},
					children: [{ id: 'leaf', label: 'Leaf', depth: 2, meta: {} }],
				},
			],
		};
		const expanded = new Set<string>();

		expect(toggleExpandableSubtreeIds(tree, expanded)).toEqual({
			expanded: true,
			changedIds: ['root', 'child'],
		});
		expect([...expanded]).toEqual(['root', 'child']);
		expect(toggleExpandableSubtreeIds(tree, expanded)).toEqual({
			expanded: false,
			changedIds: ['root', 'child'],
		});
		expect(expanded.size).toBe(0);
	});

	it('recognizes hold on both hierarchical row renderers', () => {
		for (const source of [treeSource, nodeTableSource]) {
			expect(source).toContain('onRecursiveExpand?: (id: string) => void');
			expect(source).toContain('onRowDoubleClick?: (id: string, event: MouseEvent) => void');
			expect(source).toContain('LongPressGesture');
			expect(source).toContain('isActivationSuppressed()');
		}
	});

	it('routes recursive expansion through every hierarchical explorer', () => {
		for (const source of [
			explorerFilesSource,
			explorerPropsSource,
			explorerTagsSource,
		]) {
			expect(source).toContain('onRecursiveExpand:');
			expect(source).toContain('onRowDoubleClick:');
			expect(source).toContain('collectExpandableSubtreeIds');
		}
	});
});
