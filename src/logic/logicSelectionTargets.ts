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

/**
 * Context actions use the visible operation target set, not the checkbox
 * projection.  A pointer/context invocation therefore preserves the current
 * selection and adds the invoked row exactly once.
 */
export function addInvokedSelection(
	selectedIds: ReadonlySet<string>,
	invokedId: string,
): Set<string> {
	const next = new Set(selectedIds);
	next.add(invokedId);
	return next;
}

/** Escape belongs to the explorer only when an editor-like surface owns it. */
export function shouldClearExplorerSelectionOnEscape(
	event: Pick<KeyboardEvent, 'key' | 'defaultPrevented' | 'target'>,
): boolean {
	if (event.key !== 'Escape' || event.defaultPrevented) return false;
	const target = event.target as Element | null;
	if (!target || typeof target.closest !== 'function') return true;
	return !target.closest(
		'input, textarea, select, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], .modal-container, .menu, [role="dialog"], [role="listbox"], .suggestion-container, .popover',
	);
}
