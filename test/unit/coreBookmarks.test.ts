import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';

import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';
import {
	bookmarkSearchQuery,
	isBookmarksAvailable,
} from '../../src/services/serviceCoreBookmarks';

import type { SearchBookmarkItem } from '../../src/logic/logicCoreSearchActions';

/** Minimal stand-in for the slice of `app` the bridge actually touches. */
function appWith(plugin: unknown): App {
	return {
		internalPlugins: {
			getEnabledPluginById: (id: string) =>
				id === 'bookmarks' ? plugin : null,
		},
	} as unknown as App;
}

describe('bookmarking a Vaultman text search', () => {
	it('builds core’s own item shape so the bookmarks pane renders it', () => {
		const addItem = vi.fn<(item: SearchBookmarkItem) => void>();
		const before = Date.now();

		expect(bookmarkSearchQuery(appWith({ addItem }), 'alpha')).toBe(true);

		expect(addItem).toHaveBeenCalledTimes(1);
		const item: SearchBookmarkItem = addItem.mock.calls[0][0];
		expect(item.type).toBe('search');
		expect(item.query).toBe('alpha');
		expect(item.ctime).toBeGreaterThanOrEqual(before);
		// Core's factory is exactly `{ type, ctime, query }`. An extra field here
		// is a schema guess, and the scope a Vaultman search carries has no home
		// in it — that gap is recorded, not smuggled in.
		expect(Object.keys(item).sort()).toEqual(['ctime', 'query', 'type']);
	});

	it('takes the query from us, not from core’s search leaf', () => {
		// The whole reason the core command is not reused: it reads the query out
		// of the core search leaf's view state, which knows nothing about the Text
		// explorer. Whitespace is trimmed the way core trims its own.
		const addItem = vi.fn<(item: SearchBookmarkItem) => void>();
		bookmarkSearchQuery(appWith({ addItem }), '  spaced query  ');
		expect(addItem.mock.calls[0][0].query).toBe('spaced query');
	});

	it('reports failure instead of pretending, when Bookmarks is disabled', () => {
		expect(isBookmarksAvailable(appWith(null))).toBe(false);
		expect(bookmarkSearchQuery(appWith(null), 'alpha')).toBe(false);
	});

	it('treats a plugin without addItem as unavailable', () => {
		expect(isBookmarksAvailable(appWith({}))).toBe(false);
		expect(bookmarkSearchQuery(appWith({}), 'alpha')).toBe(false);
	});

	it('does not bookmark an empty query', () => {
		const addItem = vi.fn();
		expect(bookmarkSearchQuery(appWith({ addItem }), '   ')).toBe(false);
		expect(addItem).not.toHaveBeenCalled();
	});
});

describe('U121-019 #51: where the header actions live', () => {
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

	it('keeps Has/Hasn’t beside the count it changes, not in the search row', () => {
		expect(findRow).not.toContain('contentIsExclusion');
		expect(headerActions).toContain('contentIsExclusion');
	});

	it('puts Copy and Bookmark on the header as optional bridges', () => {
		expect(headerActions).toContain('onCopySearchResults');
		expect(headerActions).toContain('onBookmarkSearch');
	});

	it('stops header action clicks from toggling the result tree', () => {
		// The header row is itself the collapse toggle. Without this every action
		// cell would fold the results as a side effect of being pressed.
		const clicks = headerActions.match(/onclick=\{\(e: MouseEvent\) =>/g) ?? [];
		const stops = headerActions.match(/e\.stopPropagation\(\);/g) ?? [];
		expect(clicks.length).toBeGreaterThanOrEqual(3);
		expect(stops.length).toBe(clicks.length);
	});
});
