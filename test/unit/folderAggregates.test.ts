import { describe, expect, it } from 'vitest';

import { aggregateFolderCells } from '../../src/logic/logicFolderAggregates';
import type { TreeNode } from '../../src/types/typeTree';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

interface M {
	isFolder: boolean;
	count?: number;
	words?: number;
	tasks?: number;
}

function file(id: string, count: number, words: number, tasks: number): TreeNode<M> {
	return { id, label: id, depth: 1, meta: { isFolder: false, count, words, tasks } };
}
function folder(id: string, children: TreeNode<M>[]): TreeNode<M> {
	return { id, label: id, depth: 0, meta: { isFolder: true }, children };
}

const read = (node: TreeNode<M>) => ({
	count: node.meta.count ?? 0,
	words: node.meta.words ?? 0,
	tasks: node.meta.tasks ?? 0,
});
const isFolder = (node: TreeNode<M>) => node.meta.isFolder;

describe('BT5-040 folder aggregate cells', () => {
	it('sums a folder\'s direct files', () => {
		const tree = [folder('f', [file('a', 2, 10, 1), file('b', 3, 20, 0)])];
		const totals = aggregateFolderCells(tree, read, isFolder);
		expect(totals.get('f')).toEqual({ count: 5, words: 30, tasks: 1 });
	});

	it('sums recursively through subfolders without double counting', () => {
		const tree = [
			folder('root', [
				file('r.md', 1, 5, 0),
				folder('sub', [file('s1.md', 2, 10, 3), file('s2.md', 0, 4, 1)]),
			]),
		];
		const totals = aggregateFolderCells(tree, read, isFolder);
		// sub = 2+0 props, 10+4 words, 3+1 tasks
		expect(totals.get('sub')).toEqual({ count: 2, words: 14, tasks: 4 });
		// root = its file (1,5,0) plus sub's total (2,14,4)
		expect(totals.get('root')).toEqual({ count: 3, words: 19, tasks: 4 });
	});

	it('gives an empty folder a zero total', () => {
		const totals = aggregateFolderCells([folder('empty', [])], read, isFolder);
		expect(totals.get('empty')).toEqual({ count: 0, words: 0, tasks: 0 });
	});

	it('is opt-in and wired into the Files decorate step', () => {
		expect(DEFAULT_SETTINGS.folderAggregateCells).toBe(false);
		expect(explorerFilesSource).toContain('aggregateFolderCells(');
		expect(explorerFilesSource).toContain('this.plugin.settings.folderAggregateCells');
	});
});
