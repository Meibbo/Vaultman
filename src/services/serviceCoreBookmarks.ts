import type { App, WorkspaceLeaf } from 'obsidian';

import {
	buildSearchBookmarkItem,
	canBookmarkSearch,
	readSearchBookmarkModifiers,
	withSearchBookmarkModifiers,
	type SearchBookmarkItem,
	type SearchBookmarkModifiers,
} from '../logic/logicCoreSearchActions';

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

function bookmarksPlugin(app: App): BookmarksPluginInternals | null {
	return ((app as CommandApp).internalPlugins?.getEnabledPluginById(
		'bookmarks',
	) ?? null) as BookmarksPluginInternals | null;
}

/**
 * The only hard requirement: the Bookmarks plugin itself.
 *
 * This used to also demand `global-search`, the command and a core search leaf,
 * because the flow went through core's own command. That made bookmarking fail
 * with "Bookmarks is disabled" whenever the **Search** plugin was off — a
 * message that named the wrong plugin for a search the Text explorer had run
 * perfectly well on its own.
 */
export function isBookmarksAvailable(app: App): boolean {
	return typeof bookmarksPlugin(app)?.addItem === 'function';
}

/**
 * Whether core's naming modal can be reached.
 *
 * The modal belongs to a command that reads its query from `global-search`,
 * which reads it off the core search leaf. With Search disabled none of that
 * exists — but the bookmark itself does not need any of it.
 */
function canUseCoreModal(app: App): boolean {
	const internal = (app as CommandApp).internalPlugins;
	if (!internal?.getEnabledPluginById('global-search')) return false;
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
	modifiers?: SearchBookmarkModifiers,
): Promise<boolean> {
	if (!canBookmarkSearch(query)) return false;
	const plugin = bookmarksPlugin(app);
	if (!plugin?.addItem) return false;

	// Core's modal creates the item, so the toggles it has no field for are
	// parked for the `addItem` hook to attach when it does.
	if (modifiers) stageBookmarkModifiers(query, modifiers);

	if (!canUseCoreModal(app)) {
		// Search is off, so there is no modal to borrow — but the bookmark is
		// ours to make. The item goes in directly, named by its query the way an
		// unnamed core bookmark is, and it still reopens in the Text explorer.
		const item = withSearchBookmarkModifiers(
			buildSearchBookmarkItem(query, Date.now()),
			modifiers ?? { caseSensitive: false, isRegex: false },
		);
		pendingModifiers = null;
		plugin.addItem(item);
		void plugin.saveData?.();
		return true;
	}

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

interface BookmarksPluginInternals {
	addItem?(item: SearchBookmarkItem): void;
	openBookmark?(item: SearchBookmarkItem, ...rest: unknown[]): unknown;
	saveData?(): unknown;
}

export interface CoreBookmarkBridgeHandlers {
	/** True while the user wants search bookmarks to land in the Text explorer. */
	isEnabled(): boolean;
	/** Open a stored search here instead of in core's pane. */
	openSearch(query: string, modifiers: SearchBookmarkModifiers): void;
}

/**
 * Wrap the Bookmarks plugin so a stored search belongs to us.
 *
 * Two hooks, both on the plugin instance and both restored on unload:
 *
 * - `addItem` decorates the item core's own "Add bookmark" modal produces. The
 *   modal is what makes the action feel like it happened, so the flow stays
 *   core's; we only attach the case-sensitivity and regex toggles it has no
 *   field for. Verified on 1.12.3 that the extra key survives `saveData` and
 *   comes back from `.obsidian/bookmarks.json` intact.
 * - `openBookmark` sends a `{ type: 'search' }` item to the Text explorer rather
 *   than to core's pane, so the bookmark reopens where it was made — with its
 *   modifiers — even with the Search core plugin enabled.
 *
 * This patches another plugin's methods at runtime. That is the only place the
 * decision is made, and it is gated behind a setting that is off by default; it
 * belongs in the fragility registry, not in the "quietly fine" pile.
 */
export function installCoreBookmarkBridge(
	app: App,
	handlers: CoreBookmarkBridgeHandlers,
): () => void {
	const plugin = (app as CommandApp).internalPlugins?.getEnabledPluginById(
		'bookmarks',
	) as BookmarksPluginInternals | null | undefined;
	if (!plugin) return () => undefined;

	// The raw properties, not bound copies: teardown has to put back exactly what
	// was there, or the next thing to wrap these would wrap our wrapper. Every
	// call below goes through `.call(plugin, …)`, which is the receiver the rule
	// is worried about losing.
	/* eslint-disable @typescript-eslint/unbound-method -- captured to be restored
	   by identity on teardown; invoked with an explicit receiver. */
	const originalAdd = plugin.addItem;
	const originalOpen = plugin.openBookmark;
	/* eslint-enable @typescript-eslint/unbound-method */

	if (originalAdd) {
		plugin.addItem = (item: SearchBookmarkItem) => {
			const pending = pendingModifiers;
			if (
				pending &&
				item?.type === 'search' &&
				item.query.trim() === pending.query
			) {
				pendingModifiers = null;
				originalAdd.call(
					plugin,
					withSearchBookmarkModifiers(item, pending.modifiers),
				);
				void plugin.saveData?.();
				return;
			}
			originalAdd.call(plugin, item);
		};
	}

	if (originalOpen) {
		plugin.openBookmark = (item: SearchBookmarkItem, ...rest: unknown[]) => {
			if (handlers.isEnabled() && item?.type === 'search') {
				handlers.openSearch(item.query, readSearchBookmarkModifiers(item));
				return Promise.resolve();
			}
			return originalOpen.call(plugin, item, ...rest);
		};
	}

	return () => {
		if (originalAdd) plugin.addItem = originalAdd;
		if (originalOpen) plugin.openBookmark = originalOpen;
		pendingModifiers = null;
	};
}

/**
 * Modifiers waiting to be attached to the next matching item core adds.
 *
 * Core's modal owns the moment the item is created, so the toggles are parked
 * here between opening the modal and the user confirming it.
 */
let pendingModifiers: {
	query: string;
	modifiers: SearchBookmarkModifiers;
} | null = null;

/** Park the modifiers for the search the user is about to bookmark. */
export function stageBookmarkModifiers(
	query: string,
	modifiers: SearchBookmarkModifiers,
): void {
	pendingModifiers = { query: query.trim(), modifiers };
}
