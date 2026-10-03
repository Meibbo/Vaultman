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
 *
 * Kept for backwards compatibility (unit-tested union semantics). New
 * context-menu paths must use {@link resolveContextClickSelection}, which
 * applies the shared right-click/range policy with modifiers.
 */
export function addInvokedSelection(
	selectedIds: ReadonlySet<string>,
	invokedId: string,
): Set<string> {
	const next = new Set(selectedIds);
	next.add(invokedId);
	return next;
}

/** Modifier subset driving the shared context-click policy. */
export interface ContextClickModifiers {
	ctrlKey?: boolean | undefined;
	metaKey?: boolean | undefined;
	shiftKey?: boolean | undefined;
}

/** A plain checked cell establishes a new anchor; modifiers keep their shared grammar. */
export function resolveCheckboxSelection(args: {
	readonly selectedIds: ReadonlySet<string>;
	readonly anchorId: string | null;
	readonly orderedVisibleIds: readonly string[];
	readonly invokedId: string;
	readonly selected: boolean;
	readonly modifiers?: ContextClickModifiers & { readonly altKey?: boolean };
}): { selectedIds: Set<string>; anchorId: string | null } {
	const modifiers = args.modifiers;
	if (modifiers?.shiftKey || modifiers?.ctrlKey || modifiers?.metaKey || modifiers?.altKey) {
		return resolveContextClickSelection({
			...args,
			modifiers: {
				ctrlKey: modifiers.ctrlKey || modifiers.altKey,
				metaKey: modifiers.metaKey,
				shiftKey: modifiers.shiftKey,
			},
		});
	}
	if (args.selected) return { selectedIds: new Set([args.invokedId]), anchorId: args.invokedId };
	const selectedIds = new Set(args.selectedIds);
	selectedIds.delete(args.invokedId);
	return { selectedIds, anchorId: args.anchorId === args.invokedId ? null : args.anchorId };
}

/**
 * U130-GGC-022/024: shared pure policy for right-click and visible-occurrence
 * range selection, with a per-instance/scene anchor.
 *
 * Contract:
 * - plain right-click on an already-selected row preserves the whole
 *   selection (batch context actions); otherwise it replaces the selection
 *   with the invoked row and moves the anchor there, even under headers.
 * - Ctrl/Meta toggles the invoked row (add or remove) and moves the anchor
 *   to it on add; removing the anchor row clears the anchor, otherwise the
 *   anchor is preserved.
 * - Shift selects the anchor→row range over the logical visible order and
 *   keeps the anchor. Missing/invalid anchor or invoked id falls back to a
 *   single replace.
 * - Ctrl/Meta+Shift unions the anchor→row range into the previous selection
 *   without losing it; missing anchor falls back to adding the invoked row.
 *
 * Occurrence ids (row ids), never canonical URNs: `orderedVisibleIds` is the
 * explorer's logical visible order (already flattened, virtualization-proof),
 * so hidden rows are never selected and only mounted-DOM order is ignored.
 * Action-only rows must be filtered by the caller via `isSelectable`.
 */
export function resolveContextClickSelection(args: {
	selectedIds: ReadonlySet<string>;
	anchorId: string | null;
	orderedVisibleIds: readonly string[];
	invokedId: string;
	modifiers: ContextClickModifiers | null | undefined;
	isSelectable?: ((id: string) => boolean) | undefined;
}): { selectedIds: Set<string>; anchorId: string | null } {
	const {
		selectedIds,
		anchorId,
		orderedVisibleIds,
		invokedId,
		modifiers,
		isSelectable,
	} = args;
	if (isSelectable !== undefined && !isSelectable(invokedId)) {
		return { selectedIds: new Set(selectedIds), anchorId };
	}
	const ctrl = Boolean(modifiers?.ctrlKey === true || modifiers?.metaKey === true);
	const shift = Boolean(modifiers?.shiftKey);
	if (ctrl && shift) {
		const targetIndex = orderedVisibleIds.indexOf(invokedId);
		const anchorIndex =
			anchorId === null ? -1 : orderedVisibleIds.indexOf(anchorId);
		if (targetIndex < 0) {
			const next = new Set(selectedIds);
			next.add(invokedId);
			return { selectedIds: next, anchorId: anchorId ?? invokedId };
		}
		if (anchorIndex < 0) {
			const next = new Set(selectedIds);
			next.add(invokedId);
			return { selectedIds: next, anchorId: anchorId ?? invokedId };
		}
		const start = Math.min(anchorIndex, targetIndex);
		const end = Math.max(anchorIndex, targetIndex);
		const next = new Set(selectedIds);
		for (let i = start; i <= end; i += 1) {
			const id = orderedVisibleIds[i];
			if (id !== undefined) next.add(id);
		}
		return { selectedIds: next, anchorId };
	}
	if (shift) {
		const targetIndex = orderedVisibleIds.indexOf(invokedId);
		const anchorIndex =
			anchorId === null ? -1 : orderedVisibleIds.indexOf(anchorId);
		if (targetIndex < 0 || anchorIndex < 0) {
			return { selectedIds: new Set([invokedId]), anchorId: invokedId };
		}
		const start = Math.min(anchorIndex, targetIndex);
		const end = Math.max(anchorIndex, targetIndex);
		const next = new Set<string>();
		for (let i = start; i <= end; i += 1) {
			const id = orderedVisibleIds[i];
			if (id !== undefined) next.add(id);
		}
		return { selectedIds: next, anchorId };
	}
	if (ctrl) {
		const next = new Set(selectedIds);
		if (next.has(invokedId)) {
			next.delete(invokedId);
			return {
				selectedIds: next,
				anchorId: anchorId === invokedId ? null : anchorId,
			};
		}
		next.add(invokedId);
		return { selectedIds: next, anchorId: invokedId };
	}
	// U130-GGC-009 / smoke 3.1: right-click on an already-selected row keeps
	// the multi-selection intact so Group/Degroup act on the batch.
	if (selectedIds.has(invokedId)) {
		return { selectedIds: new Set(selectedIds), anchorId: anchorId ?? invokedId };
	}
	return { selectedIds: new Set([invokedId]), anchorId: invokedId };
}

/**
 * U130-GGC smoke 3.4: Ctrl+A selects everything in the active scope, in any
 * input mode. The caller passes the scope-projected visible order (already
 * filtered to selectable row ids, headers excluded), so `all` naturally
 * covers the explorer while parent/level scopes stay restricted to their
 * subtree without reading scope state here.
 */
export function resolveSelectAllInScope(
	orderedSelectableIds: readonly string[],
): { selectedIds: Set<string>; anchorId: string | null } {
	const selectedIds = new Set(orderedSelectableIds);
	const anchorId =
		orderedSelectableIds.length > 0
			? orderedSelectableIds[orderedSelectableIds.length - 1] ?? null
			: null;
	return { selectedIds, anchorId };
}

/** Ctrl+A gesture guard: Ctrl/Meta + key `a`/`A`, not in an editable surface. */
export function shouldSelectAllInScopeOnKey(
	event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'target'>,
): boolean {
	if (event.key !== 'a' && event.key !== 'A') return false;
	if (!(event.ctrlKey || event.metaKey)) return false;
	const target = event.target as Element | null;
	if (!target || typeof target.closest !== 'function') return true;
	return !target.closest(
		'input, textarea, select, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]',
	);
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
