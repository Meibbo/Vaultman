/** U121-019 #51 — the core search actions the Text result header offers.
 *
 * Pure: no Obsidian, no Svelte. The component calls these to shape the data,
 * and the host performs the one Obsidian call each of them feeds.
 *
 * Both actions exist in core already and are reached rather than rebuilt:
 *
 * - **Copy search results** is `SearchView.onCopyResultsClick(evt)`, which
 *   opens core's own modal. It reads `this.dom`, so it copies whatever the
 *   core search view holds — our query, because the adapter drives that view,
 *   but not our scope. Recorded in
 *   `.agents/docs/architecture/research/core-bookmarks-and-search-actions.md`.
 * - **Bookmark** is not a call we can delegate. Core's command
 *   `bookmarks:bookmark-current-search` takes its query from the
 *   `global-search` plugin, which reads the **core search leaf's view state**.
 *   Nothing there knows about Vaultman, so bookmarking from our explorer would
 *   store core's query. The item is a three-field object and
 *   `bookmarks.addItem` is public, so we build it and hand it over: same
 *   shape, same bookmarks pane, our query.
 */

/**
 * What a Vaultman text search is, beyond its query.
 *
 * Core's search has these as UI toggles rather than query syntax, so they have
 * nowhere to live in `{ type, ctime, query }`.
 */
export interface SearchBookmarkModifiers {
	caseSensitive: boolean;
	isRegex: boolean;
}

/** Key the modifiers travel under, inside core's own item. */
export const VAULTMAN_BOOKMARK_KEY = 'vaultmanTextSearch';

/** The search bookmark item, exactly as core's own factory builds it. */
export interface SearchBookmarkItem {
	type: 'search';
	ctime: number;
	query: string;
	/**
	 * Ours, and optional. Verified on Obsidian 1.12.3: an unknown field on a
	 * bookmark item survives `saveData` and comes back from
	 * `.obsidian/bookmarks.json` intact, and core's pane still renders the item
	 * as an ordinary search bookmark.
	 */
	[VAULTMAN_BOOKMARK_KEY]?: SearchBookmarkModifiers;
}

/** Read our modifiers off an item, defaulting to core's plain behaviour. */
export function readSearchBookmarkModifiers(
	item: SearchBookmarkItem | null | undefined,
): SearchBookmarkModifiers {
	const stored = item?.[VAULTMAN_BOOKMARK_KEY];
	return {
		caseSensitive: stored?.caseSensitive === true,
		isRegex: stored?.isRegex === true,
	};
}

/** Attach modifiers to an item, leaving core's three fields untouched. */
export function withSearchBookmarkModifiers(
	item: SearchBookmarkItem,
	modifiers: SearchBookmarkModifiers,
): SearchBookmarkItem {
	if (!modifiers.caseSensitive && !modifiers.isRegex) return item;
	return { ...item, [VAULTMAN_BOOKMARK_KEY]: { ...modifiers } };
}

/** Core raises `msgNoSearchQuery()` instead of storing a blank search. */
export function canBookmarkSearch(query: string): boolean {
	return query.trim().length > 0;
}

/**
 * Verbatim from app.js (Obsidian 1.12.3):
 *
 *     function B2(e) { return { type: 'search', ctime: Date.now(), query: e }; }
 *
 * `ctime` is passed in so this stays pure and the host owns the clock.
 */
export function buildSearchBookmarkItem(
	query: string,
	ctime: number,
): SearchBookmarkItem {
	return { type: 'search', ctime, query: query.trim() };
}
