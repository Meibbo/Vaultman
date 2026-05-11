/**
 * tabRegistry — enumerates the abstract tab identities used by the
 * independent-leaves feature (phase 6, multifacet wave 2).
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/04-independent-leaves.md
 *
 * The TabId values here are the canonical leaf identities used by
 * `serviceLeafDetach` and persisted into plugin data under
 * `independentLeaves`. The codebase already uses other, shorter strings
 * for inner UI tabs (e.g. `props`, `files`, `tags`, `content` in the
 * filters page; `layout`, `ops_log` in tools). Rather than rename those,
 * we provide a translation map that converts in-panel inner-tab ids to
 * the canonical TabId, and vice versa.
 */
export type TabId =
	| 'explorer-files'
	| 'explorer-tags'
	| 'explorer-props'
	| 'explorer-values'
	| 'content'
	| 'explorer-outline'
	| 'page-tools'
	| 'queue';

export const DETACHABLE: ReadonlySet<TabId> = new Set<TabId>([
	'explorer-files',
	'explorer-tags',
	'explorer-props',
	'explorer-values',
	'content',
	'explorer-outline',
	'page-tools',
	'queue',
]);

export const ALL_TAB_IDS: ReadonlyArray<TabId> = [
	'explorer-files',
	'explorer-tags',
	'explorer-props',
	'explorer-values',
	'content',
	'explorer-outline',
	'page-tools',
	'queue',
];

export const VIEW_TYPE_PREFIX = 'vaultman-tab-';

/**
 * Build the unique Obsidian view type id for a given canonical tab.
 * Must be deterministic so saved workspace state and `restore()` match.
 */
export function viewTypeFor(tabId: TabId): string {
	return `${VIEW_TYPE_PREFIX}${tabId}`;
}

/**
 * Translate an in-panel inner-tab id (the strings used by
 * `pageFilters.svelte` and `pageTools.svelte`) to the canonical TabId.
 * Returns `null` when the inner id has no detachable counterpart.
 */
export function tabIdFromInner(inner: string): TabId | null {
	switch (inner) {
		case 'files':
			return 'explorer-files';
		case 'tags':
			return 'explorer-tags';
		case 'props':
			return 'explorer-props';
		case 'values':
			return 'explorer-values';
		case 'content':
			return 'content';
		case 'outline':
			return 'explorer-outline';
		case 'tools':
		case 'page-tools':
			return 'page-tools';
		case 'queue':
			return 'queue';
		default:
			return null;
	}
}

/** Inverse of `tabIdFromInner`. */
export function innerFromTabId(tabId: TabId): string {
	switch (tabId) {
		case 'explorer-files':
			return 'files';
		case 'explorer-tags':
			return 'tags';
		case 'explorer-props':
			return 'props';
		case 'explorer-values':
			return 'values';
		case 'content':
			return 'content';
		case 'explorer-outline':
			return 'outline';
		case 'page-tools':
			return 'page-tools';
		case 'queue':
			return 'queue';
	}
}

export function isDetachable(tabId: string): tabId is TabId {
	return DETACHABLE.has(tabId as TabId);
}
