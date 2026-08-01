import type { App, WorkspaceLeaf } from 'obsidian';

import { canBookmarkSearch } from '../logic/logicCoreSearchActions';

/**
 * U121-019 #51 — bookmarking a Vaultman text search.
 *
 * Calling `bookmarks.addItem` directly stored a correct item but skipped the
 * naming modal core shows, so the action felt like nothing had happened. Core's
 * own command does open that modal, and it is reachable — it just reads its
 * query from the wrong place:
 *
 *     bookmarks:bookmark-current-search
 *       -> global-search.getGlobalSearchQuery()
 *       -> the **core search leaf's view state**
 *
 * Nothing in that chain consults Vaultman. So our query is written into that
 * view state first, and then the command runs: core's real "Add bookmark"
 * modal opens, pre-filled with our query. Verified live on Obsidian 1.12.3.
 *
 * Two consequences, both deliberate and neither hidden:
 *
 * - Core's search query is left set to ours. It is the same query the user just
 *   typed here, and it is what makes the saved bookmark reopen onto the same
 *   results.
 * - Reopening the bookmark opens **core's** search pane, not the Text explorer.
 *   `{ type: 'search' }` is core's item type and core owns its activation.
 *   Landing on our own scene needs an item type of our own, or an interception
 *   of core's handler — a separate piece of work, recorded rather than faked.
 *
 * Scope is still not stored: core's item schema has no room for the folder,
 * filters or has/hasn't that make a Vaultman text search what it is.
 */

const BOOKMARK_SEARCH_COMMAND = 'bookmarks:bookmark-current-search';

interface CommandApp extends App {
	commands?: {
		executeCommandById(id: string): boolean;
		commands: Record<string, unknown>;
	};
	internalPlugins?: {
		getEnabledPluginById(id: string): unknown;
	};
	workspace: App['workspace'] & {
		getLeavesOfType(type: string): WorkspaceLeaf[];
	};
}

function commandExists(app: App): boolean {
	const commands = (app as CommandApp).commands;
	if (!commands) return false;
	return BOOKMARK_SEARCH_COMMAND in commands.commands;
}

function searchLeaf(app: App): WorkspaceLeaf | null {
	return (app as CommandApp).workspace.getLeavesOfType('search')?.[0] ?? null;
}

/**
 * True when the command, the Bookmarks plugin and a core search leaf are all
 * present. All three are required: the command lives in Bookmarks, its query
 * comes from `global-search`, and the query itself is read off the search leaf.
 */
export function isBookmarksAvailable(app: App): boolean {
	const internal = (app as CommandApp).internalPlugins;
	if (!internal?.getEnabledPluginById('bookmarks')) return false;
	if (!internal.getEnabledPluginById('global-search')) return false;
	if (!commandExists(app)) return false;
	return searchLeaf(app) !== null;
}

/**
 * Open core's "Add bookmark" modal for `query`. Resolves false when the query is
 * empty or any part of the chain is missing, so the caller can say why nothing
 * happened rather than fail silently.
 */
export async function bookmarkSearchQuery(
	app: App,
	query: string,
): Promise<boolean> {
	if (!canBookmarkSearch(query)) return false;
	if (!isBookmarksAvailable(app)) return false;

	const leaf = searchLeaf(app);
	if (!leaf) return false;

	// The command reads the query from here, so it is written here.
	const state = leaf.getViewState();
	await leaf.setViewState({
		...state,
		state: { ...state.state, query: query.trim() },
	});

	return (app as CommandApp).commands?.executeCommandById(
		BOOKMARK_SEARCH_COMMAND,
	) ?? false;
}
