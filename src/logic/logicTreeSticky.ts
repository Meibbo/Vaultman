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
	/** The ancestor chain emitted by `flattenVisibleTreeWithChain`. With it the
	 * active headers are found by walking pointers up from the first visible
	 * row — O(depth), about seven steps. Without it the chain is rebuilt by
	 * scanning every row above the viewport, which costs O(scrollTop): that is
	 * the stall on a jump to the end of a long list, and the jitter when
	 * several siblings hand the stack back and forth. */
	parentIndex?: readonly number[];
	subtreeEnd?: readonly number[];
}

interface StickyCandidate {
	index: number;
	subtreeEnd: number;
}

/** Return expanded parent rows that should remain visible above the viewport. */
export function stickyTreeRows(
	rows: readonly TreeNode[],
	{
		rowHeight,
		scrollTop,
		viewportHeight,
		maxRows = 7,
		parentIndex,
		subtreeEnd,
	}: StickyTreeRowsOptions,
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
	if (firstVisibleIndex < 0) return [];

	const viewportRowLimit = Math.floor((viewportHeight * 0.4) / rowHeight);
	const rowLimit = Math.min(maxRows, viewportRowLimit);
	if (rowLimit <= 0) return [];

	const result: StickyTreeRow[] = [];
	for (let slot = 0; slot < rowLimit; slot += 1) {
		// El ancla del slot es la fila que hay bajo lo ya apilado, no la del
		// borde del viewport. Por eso una cabecera entra ya en su sitio.
		const anchorTop = scrollTop + slot * rowHeight;
		const anchorIndex = Math.min(
			rows.length - 1,
			Math.floor(anchorTop / rowHeight),
		);
		if (anchorIndex < 0) break;

		const chain = collectAncestors(
			rows,
			anchorIndex,
			parentIndex,
			subtreeEnd,
		);
		const candidate = chain[slot];
		if (!candidate) break;

		// Borde inferior de su subarbol, en coordenadas de viewport.
		const subtreeBottom = candidate.subtreeEnd * rowHeight - scrollTop;
		// Si su subarbol termina por encima de este slot, ya fue relevado: el
		// hueco es del siguiente p-node de su nivel, que es justo quien saldra
		// como `chain[slot]` en cuanto el ancla entre en su subarbol.
		if (subtreeBottom <= slot * rowHeight) break;

		// Fijada en su slot mientras su subarbol siga por debajo; empujada solo
		// cuando ese borde entra en el slot, y entonces su parte inferior
		// acompaña al borde en vez de saltar.
		const top = Math.min(slot * rowHeight, subtreeBottom - rowHeight);
		result.push({ index: candidate.index, top });
	}

	return result;
}

/** The expanded parents whose subtree still contains the first visible row,
 * shallowest first.
 *
 * With a precomputed chain this walks up from the row itself. Without one it
 * falls back to the original scan, kept so callers that have no chain — the
 * unit tests among them — keep working.
 */
function collectAncestors(
	rows: readonly TreeNode[],
	firstVisibleIndex: number,
	parentIndex?: readonly number[],
	subtreeEnd?: readonly number[],
): StickyCandidate[] {
	if (parentIndex && subtreeEnd) {
		const chain: StickyCandidate[] = [];
		// The scan this replaces is inclusive: the first visible row is itself a
		// candidate when it is an expanded parent, and dropping it made the
		// header vanish exactly when it should appear.
		const startsAtSelf =
			(subtreeEnd[firstVisibleIndex] ?? firstVisibleIndex + 1) >
			firstVisibleIndex + 1;
		let index = startsAtSelf
			? firstVisibleIndex
			: (parentIndex[firstVisibleIndex] ?? -1);
		for (; index >= 0; index = parentIndex[index] ?? -1) {
			chain.push({ index, subtreeEnd: subtreeEnd[index] ?? index + 1 });
		}
		// Walking up yields deepest first; the stack is drawn from the top down.
		return chain.reverse();
	}

	const ancestors: StickyCandidate[] = [];
	for (let index = 0; index <= firstVisibleIndex; index += 1) {
		const node = rows[index];
		if (!node) continue;
		while (ancestors.length > 0) {
			const last = ancestors[ancestors.length - 1];
			const ancestor = last ? rows[last.index] : undefined;
			if (!ancestor || ancestor.depth < node.depth) break;
			ancestors.pop();
		}
		const next = rows[index + 1];
		if (!next || next.depth <= node.depth) continue;

		let end = index + 1;
		while (end < rows.length) {
			const descendant = rows[end];
			if (!descendant || descendant.depth <= node.depth) break;
			end += 1;
		}
		ancestors.push({ index, subtreeEnd: end });
	}
	return ancestors;
}
