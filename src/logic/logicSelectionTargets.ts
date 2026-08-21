/**
 * U121-062: one rule for "what does this action act on", instead of four
 * copies that disagreed.
 *
 * fileScene's `file.move` had it right and `file.delete` did not; snippetScene
 * and pluginScene never had it at all, so every action there hit only the row
 * you opened the menu on even with a dozen selected.
 *
 * The rule: acting on a node that BELONGS to the selection acts on the whole
 * selection; acting on one outside it acts on that node alone. Deliberately
 * not the union `buildOperationTargetSet` returns -- for a destructive action,
 * union would stage a node the user neither selected nor clicked.
 */
export function resolveSelectionTargets(
	invokedId: string,
	selectedIds: ReadonlySet<string>,
	orderedIds?: readonly string[],
): string[] {
	if (!selectedIds.has(invokedId)) return [invokedId];
	if (!orderedIds) return [...selectedIds];
	// Visible order, so the queue reads the way the tree does. Anything
	// selected but no longer on screen still counts: it was selected on
	// purpose and dropping it would be a silent partial action.
	const ordered = orderedIds.filter((id) => selectedIds.has(id));
	const seen = new Set(ordered);
	for (const id of selectedIds) {
		if (!seen.has(id)) ordered.push(id);
	}
	return ordered;
}
