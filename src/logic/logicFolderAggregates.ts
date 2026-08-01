import type { TreeNode } from '../types/typeTree';

/**
 * BT5-040: when the option is on, a folder shows the recursive sum of a
 * countable cell (properties, words, tasks) across every file beneath it —
 * including the totals of its own subfolders, so an L1 folder's total is the
 * sum of its child files plus each subfolder's total. Dates are excluded:
 * they have no sensible cumulative value.
 */
export interface FolderAggregate {
	files: number;
	count: number;
	words: number;
	tasks: number;
}

const ZERO: FolderAggregate = { files: 0, count: 0, words: 0, tasks: 0 };

export type FileAggregateReader<TMeta> = (
	node: TreeNode<TMeta>,
) => FolderAggregate;

/**
 * Per-folder recursive totals. One O(n) post-order pass: a folder's total is
 * its files' values plus each child folder's already-computed total, so no
 * file is ever counted twice.
 */
export function aggregateFolderCells<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	readFile: FileAggregateReader<TMeta>,
	isFolder: (node: TreeNode<TMeta>) => boolean,
): Map<string, FolderAggregate> {
	const totals = new Map<string, FolderAggregate>();

	const visit = (node: TreeNode<TMeta>): FolderAggregate => {
		if (!isFolder(node)) return readFile(node);
		let sum: FolderAggregate = { ...ZERO };
		for (const child of node.children ?? []) {
			const childTotal = visit(child);
			sum = {
				files: sum.files + childTotal.files,
				count: sum.count + childTotal.count,
				words: sum.words + childTotal.words,
				tasks: sum.tasks + childTotal.tasks,
			};
		}
		totals.set(node.id, sum);
		return sum;
	};

	for (const node of nodes) visit(node);
	return totals;
}
