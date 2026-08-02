import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';

import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';
import {
	bookmarkSearchQuery,
	installCoreBookmarkBridge,
	isBookmarksAvailable,
} from '../../src/services/serviceCoreBookmarks';
import {
	readSearchBookmarkModifiers,
	withSearchBookmarkModifiers,
	type SearchBookmarkItem,
} from '../../src/logic/logicCoreSearchActions';

const COMMAND_ID = 'bookmarks:bookmark-current-search';

interface StubOptions {
	bookmarks?: boolean;
	globalSearch?: boolean;
	command?: boolean;
	searchLeaf?: boolean;
}

interface Stub {
	app: App;
	executed: string[];
	viewStates: unknown[];
}

/**
 * The chain core's own command walks: the Bookmarks plugin owns it, the query
 * comes from `global-search`, and `global-search` reads it off the **core
 * search leaf's view state**. All three have to be there.
 */
function stubApp(options: StubOptions = {}): Stub {
	const {
		bookmarks = true,
		globalSearch = true,
		command = true,
		searchLeaf = true,
	} = options;
	const executed: string[] = [];
	const viewStates: unknown[] = [];

	const leaf = {
		getViewState: () => ({ type: 'search', state: { query: 'core-query' } }),
		setViewState: (state: unknown) => {
			viewStates.push(state);
			return Promise.resolve();
		},
	};

	const app = {
		commands: {
			commands: command ? { [COMMAND_ID]: {} } : {},
			executeCommandById: (id: string) => {
				executed.push(id);
				return true;
			},
		},
		internalPlugins: {
			getEnabledPluginById: (id: string) => {
				if (id === 'bookmarks') return bookmarks ? {} : null;
				if (id === 'global-search') return globalSearch ? {} : null;
				return null;
			},
		},
		workspace: {
			getLeavesOfType: (type: string) =>
				type === 'search' && searchLeaf ? [leaf] : [],
		},
	} as unknown as App;

	return { app, executed, viewStates };
}

describe('what the bookmark action needs before it can run', () => {
	it('is available when the whole chain is present', () => {
		expect(isBookmarksAvailable(stubApp().app)).toBe(true);
	});

	it('is unavailable without the Bookmarks plugin', () => {
		expect(isBookmarksAvailable(stubApp({ bookmarks: false }).app)).toBe(false);
	});

	it('is unavailable without global-search, which supplies the query', () => {
		expect(isBookmarksAvailable(stubApp({ globalSearch: false }).app)).toBe(
			false,
		);
	});

	it('is unavailable without a core search leaf to read the query from', () => {
		expect(isBookmarksAvailable(stubApp({ searchLeaf: false }).app)).toBe(false);
	});

	it('is unavailable when the command itself is missing', () => {
		expect(isBookmarksAvailable(stubApp({ command: false }).app)).toBe(false);
	});
});

describe('opening core’s Add bookmark modal with our query', () => {
	it('writes our query into the view state the command reads, then runs it', async () => {
		// Calling `bookmarks.addItem` directly stored a correct item but skipped
		// the naming modal, so the action felt like nothing had happened. Core's
		// command opens that modal — it just reads its query from the core search
		// leaf, which knows nothing about the Text explorer.
		const { app, executed, viewStates } = stubApp();

		await expect(bookmarkSearchQuery(app, 'alpha')).resolves.toBe(true);

		expect(viewStates).toHaveLength(1);
		expect(viewStates[0]).toMatchObject({ state: { query: 'alpha' } });
		expect(executed).toEqual([COMMAND_ID]);
	});

	it('sets the query before executing, never the other way round', async () => {
		// Reversed, the modal opens on whatever core happened to hold.
		const order: string[] = [];
		const { app } = stubApp();
		const leaf = (
			app as unknown as {
				workspace: { getLeavesOfType(t: string): { setViewState: unknown }[] };
			}
		).workspace.getLeavesOfType('search')[0];
		const originalSetViewState = leaf.setViewState as (s: unknown) => Promise<void>;
		leaf.setViewState = (state: unknown) => {
			order.push('setViewState');
			return originalSetViewState(state);
		};
		const commands = (app as unknown as { commands: { executeCommandById: unknown } })
			.commands;
		const originalExecute = commands.executeCommandById as (id: string) => boolean;
		commands.executeCommandById = (id: string) => {
			order.push('execute');
			return originalExecute(id);
		};

		await bookmarkSearchQuery(app, 'alpha');

		expect(order).toEqual(['setViewState', 'execute']);
	});

	it('trims the query the way core trims its own', async () => {
		const { app, viewStates } = stubApp();
		await bookmarkSearchQuery(app, '  spaced  ');
		expect(viewStates[0]).toMatchObject({ state: { query: 'spaced' } });
	});

	it('does nothing for an empty query', async () => {
		const { app, executed, viewStates } = stubApp();
		await expect(bookmarkSearchQuery(app, '   ')).resolves.toBe(false);
		expect(executed).toEqual([]);
		expect(viewStates).toEqual([]);
	});

	it('does not touch core’s view state when the chain is incomplete', async () => {
		// Half-applying this would leave core's search query rewritten for an
		// action that never happened.
		const { app, executed, viewStates } = stubApp({ bookmarks: false });
		await expect(bookmarkSearchQuery(app, 'alpha')).resolves.toBe(false);
		expect(executed).toEqual([]);
		expect(viewStates).toEqual([]);
	});
});

describe('U121-019 #51: the result header', () => {
	const findRow =
		tabContentSource.match(
			/<!-- Find row[\s\S]*?<\/div>\n\{#if contentRegexError\}/,
		)?.[0] ?? '';
	const headerActions =
		tabContentSource.match(
			/vaultman-content-header-actions[\s\S]*?\n\t\t\t<\/div>/,
		)?.[0] ?? '';

	it('reads the two regions it means to guard', () => {
		expect(findRow).not.toBe('');
		expect(headerActions).not.toBe('');
	});

	it('leaves Has/Hasn’t to the U121-029 lane, which now owns it', () => {
		// This guard existed to keep the control where 1.2.0 had it so that lane's
		// change would apply without a conflict. It has: U121-029 moved it out of
		// the renderer entirely, into a header action built by the host. What the
		// guard pins now is that this component does not render it at all.
		expect(findRow).not.toContain('contentIsExclusion');
		expect(headerActions).not.toContain('contentIsExclusion');
		// `contentIsExclusion` survives as a prop the host binds; what must not
		// come back is this component rendering a control for it.
		expect(tabContentSource).not.toContain('class:is-active={contentIsExclusion}');
	});

	it('offers one overflow menu rather than a cell per action', () => {
		expect(headerActions).toContain('onHeaderMenu');
		expect(headerActions).toContain('lucide-more-vertical');
		expect(headerActions).not.toContain('lucide-copy');
		expect(headerActions).not.toContain('lucide-bookmark');
	});

	it('stops the menu click from toggling the result tree', () => {
		// The header row is itself the collapse toggle.
		expect(headerActions).toContain('e.stopPropagation();');
	});
});

describe('the mock chain itself', () => {
	it('reports the command result rather than assuming success', async () => {
		const { app } = stubApp();
		const commands = (app as unknown as {
			commands: { executeCommandById: (id: string) => boolean };
		}).commands;
		commands.executeCommandById = vi.fn().mockReturnValue(false);

		await expect(bookmarkSearchQuery(app, 'alpha')).resolves.toBe(false);
	});
});

describe('a stored search remembers what kind of search it was', () => {
	it('carries the toggles core has no field for', () => {
		// Verified on Obsidian 1.12.3: an unknown key on a bookmark item survives
		// `saveData` and comes back out of `.obsidian/bookmarks.json` intact, and
		// core's pane still renders the item as an ordinary search bookmark.
		const base: SearchBookmarkItem = {
			type: 'search',
			ctime: 1,
			query: 'alpha',
		};
		const decorated = withSearchBookmarkModifiers(base, {
			caseSensitive: true,
			isRegex: true,
		});

		expect(decorated.type).toBe('search');
		expect(decorated.query).toBe('alpha');
		expect(readSearchBookmarkModifiers(decorated)).toEqual({
			caseSensitive: true,
			isRegex: true,
		});
	});

	it('leaves core’s three fields alone when there is nothing to remember', () => {
		const base: SearchBookmarkItem = { type: 'search', ctime: 1, query: 'a' };
		const plain = withSearchBookmarkModifiers(base, {
			caseSensitive: false,
			isRegex: false,
		});
		expect(Object.keys(plain).sort()).toEqual(['ctime', 'query', 'type']);
	});

	it('reads a core-made bookmark as a plain search', () => {
		// Anything bookmarked from core's own pane has no modifiers, and must not
		// come back as a regex search by accident.
		expect(
			readSearchBookmarkModifiers({ type: 'search', ctime: 1, query: 'a' }),
		).toEqual({ caseSensitive: false, isRegex: false });
		expect(readSearchBookmarkModifiers(null)).toEqual({
			caseSensitive: false,
			isRegex: false,
		});
	});
});

describe('the bridge over the Bookmarks plugin', () => {
	function bookmarksApp(): {
		app: App;
		plugin: { addItem: unknown; openBookmark: unknown };
		added: SearchBookmarkItem[];
		opened: SearchBookmarkItem[];
	} {
		const added: SearchBookmarkItem[] = [];
		const opened: SearchBookmarkItem[] = [];
		const plugin = {
			addItem: (item: SearchBookmarkItem) => added.push(item),
			openBookmark: (item: SearchBookmarkItem) => {
				opened.push(item);
				return Promise.resolve();
			},
			saveData: () => Promise.resolve(),
		};
		const app = {
			internalPlugins: {
				getEnabledPluginById: (id: string) => (id === 'bookmarks' ? plugin : null),
			},
		} as unknown as App;
		return { app, plugin, added, opened };
	}

	it('sends a stored search to us and leaves every other kind to core', () => {
		const { app, plugin, opened } = bookmarksApp();
		const routed: { query: string; caseSensitive: boolean }[] = [];
		const uninstall = installCoreBookmarkBridge(app, {
			isEnabled: () => true,
			openSearch: (query, modifiers) =>
				routed.push({ query, caseSensitive: modifiers.caseSensitive }),
		});

		const open = plugin.openBookmark as (item: unknown) => unknown;
		void open({
			type: 'search',
			ctime: 1,
			query: 'alpha',
			vaultmanTextSearch: { caseSensitive: true, isRegex: false },
		});
		void open({ type: 'file', ctime: 2, path: 'a.md' });

		expect(routed).toEqual([{ query: 'alpha', caseSensitive: true }]);
		expect(opened).toHaveLength(1);
		expect((opened[0] as { type: string }).type).toBe('file');

		uninstall();
	});

	it('leaves core alone entirely while the setting is off', () => {
		const { app, plugin, opened } = bookmarksApp();
		const routed: string[] = [];
		const uninstall = installCoreBookmarkBridge(app, {
			isEnabled: () => false,
			openSearch: (query) => routed.push(query),
		});

		const open = plugin.openBookmark as (item: unknown) => unknown;
		void open({ type: 'search', ctime: 1, query: 'alpha' });

		expect(routed).toEqual([]);
		expect(opened).toHaveLength(1);

		uninstall();
	});

	it('restores both methods on teardown', () => {
		const { app, plugin } = bookmarksApp();
		const originalAdd = plugin.addItem;
		const originalOpen = plugin.openBookmark;

		const uninstall = installCoreBookmarkBridge(app, {
			isEnabled: () => true,
			openSearch: () => undefined,
		});
		expect(plugin.openBookmark).not.toBe(originalOpen);

		uninstall();

		// Patching another plugin is only acceptable if exactly what was there goes
		// back — a bound copy would look equivalent and quietly nest the next
		// wrapper on top of ours.
		expect(plugin.addItem).toBe(originalAdd);
		expect(plugin.openBookmark).toBe(originalOpen);
	});
});
