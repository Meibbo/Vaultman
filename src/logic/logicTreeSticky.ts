import type { TreeNode } from '../types/typeTree';

export interface StickyTreeRow {
	index: number;
	top: number;
}

export interface StickyTreeRowsOptions {
	rowHeight: number;
	scrollTop: number;
	viewportHeight: number;
	maxRows?: number;
}

interface StickyCandidate {
	index: number;
	subtreeEnd: number;
}

/** Return expanded parent rows that should remain visible above the viewport. */
export function stickyTreeRows(
	rows: readonly TreeNode[],
	{ rowHeight, scrollTop, viewportHeight, maxRows = 7 }: StickyTreeRowsOptions,
): StickyTreeRow[] {
	if (
		rows.length === 0 ||
		rowHeight <= 0 ||
		viewportHeight <= 0 ||
		scrollTop <= 0
	)
		return [];

	const firstVisibleIndex = Math.min(
		rows.length - 1,
		Math.floor(scrollTop / rowHeight),
	);
	if (firstVisibleIndex <= 0) return [];

	const ancestors: StickyCandidate[] = [];
	for (let index = 0; index < firstVisibleIndex; index += 1) {
		const node = rows[index];
		if (!node) continue;
		while (ancestors.length > 0) {
			const last = ancestors[ancestors.length - 1];
			const ancestor = last ? rows[last.index] : undefined;
			if (!ancestor || ancestor.depth < node.depth) break;
			ancestors.pop();
		}
		const next = rows[index + 1];
		if (!next || next.depth <= node.depth)
			continue;

		let subtreeEnd = index + 1;
		while (subtreeEnd < rows.length) {
			const descendant = rows[subtreeEnd];
			if (!descendant || descendant.depth <= node.depth) break;
			subtreeEnd += 1;
		}
		ancestors.push({ index, subtreeEnd });
	}

	const viewportRowLimit = Math.floor((viewportHeight * 0.4) / rowHeight);
	const rowLimit = Math.min(maxRows, viewportRowLimit);
	if (rowLimit <= 0) return [];

	const selected = ancestors.slice(-rowLimit);
	const result: StickyTreeRow[] = [];
	for (const candidate of selected) {
		const slot = result.length;
		const subtreeBottom = candidate.subtreeEnd * rowHeight;
		// Once the next sibling reaches the viewport top, this parent is no
		// longer an ancestor of the visible row.
		if (subtreeBottom <= scrollTop) continue;
		result.push({
			index: candidate.index,
			top: slot * rowHeight,
		});
	}
	return result;
}
