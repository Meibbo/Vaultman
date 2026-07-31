import type { App } from 'obsidian';

import {
	buildSearchBookmarkItem,
	canBookmarkSearch,
	type SearchBookmarkItem,
} from '../logic/logicCoreSearchActions';

/**
 * The one Obsidian call behind the Bookmark action. The item's shape and the
 * empty-query rule are pure and live in `logicCoreSearchActions`; this file
 * only reaches the plugin and hands the item over.
 *
 * Why the item is built here instead of delegating to core's own
 * `bookmarks:bookmark-current-search`: that command takes its query from the
 * `global-search` plugin, which reads the **core search leaf's view state**.
 * Nothing in that chain consults Vaultman, so bookmarking from the Text
 * explorer would store core's query instead of ours. `addItem` is public and
 * the item is three fields, so we produce core's exact shape with our query and
 * the same bookmarks pane renders it.
 *
 * Verified live on Obsidian 1.12.3; see
 * `.agents/docs/architecture/research/core-bookmarks-and-search-actions.md`.
 * Note `saveSearch()` is *not* bookmarking — it pushes onto the
 * `recent-searches` localStorage list. Do not wire this to it.
 */

interface BookmarksPlugin {
	addItem(item: SearchBookmarkItem): void;
}

interface InternalPluginsApp extends App {
	internalPlugins?: {
		getEnabledPluginById(id: string): unknown;
	};
}

function getBookmarksPlugin(app: App): BookmarksPlugin | null {
	const plugin = (app as InternalPluginsApp).internalPlugins?.getEnabledPluginById(
		'bookmarks',
	) as Partial<BookmarksPlugin> | null | undefined;
	if (typeof plugin?.addItem !== 'function') return null;
	return plugin as BookmarksPlugin;
}

/** True when the Bookmarks core plugin is enabled and exposes `addItem`. */
export function isBookmarksAvailable(app: App): boolean {
	return getBookmarksPlugin(app) !== null;
}

/**
 * Record `query` as a search bookmark. Returns false when the query is empty or
 * the Bookmarks plugin is disabled, so the caller can say why nothing happened
 * instead of failing silently.
 *
 * Scope is deliberately not stored: core's item schema has no room for the
 * folder, filters or has/hasn't that make a Vaultman text search what it is, so
 * reopening the bookmark restores the query alone. Widening that schema is an
 * open question for the Bookmarks absorption, not for this patch.
 */
export function bookmarkSearchQuery(app: App, query: string): boolean {
	if (!canBookmarkSearch(query)) return false;
	const plugin = getBookmarksPlugin(app);
	if (!plugin) return false;
	plugin.addItem(buildSearchBookmarkItem(query, Date.now()));
	return true;
}
