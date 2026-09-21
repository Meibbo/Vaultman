import type { ExplorerTabId } from '../types/typeUI';

export type ScopePickMode = 'parent' | 'level';

export interface ScopePickAvailabilityInput {
	tab: ExplorerTabId;
	treeCapable: boolean;
	nestedActive: boolean;
	hasParentNodes: boolean;
	filesFoldersOnly?: boolean;
}

export interface ScopePickAvailability {
	parent: boolean;
	level: boolean;
}

/**
 * Scope-menu/pick guards are one rule shared by the popup, native menu and
 * the imperative pick entry point. Parent needs a projected container. Level
 * needs Nested because it is the hierarchy-wide level selector. Files keeps
 * Parent available for the explicit folders-only projection even with Nested
 * off.
 */
export function scopePickAvailability(
	input: ScopePickAvailabilityInput,
): ScopePickAvailability {
	if (!input.treeCapable) return { parent: false, level: false };
	return {
		parent:
			input.hasParentNodes &&
			(input.nestedActive ||
				(input.tab === 'files' && input.filesFoldersOnly === true)),
		level: input.nestedActive,
	};
}

/** Resolve the active pane strictly inside the owning frame root. */
export function activePaneInOwner(root: ParentNode | null): HTMLElement | null {
	return (
		root?.querySelector<HTMLElement>('.vaultman-filters-tab-pane.is-active') ??
		null
	);
}
