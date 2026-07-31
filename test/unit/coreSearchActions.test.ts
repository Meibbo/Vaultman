import { describe, expect, it } from 'vitest';

import {
	buildSearchBookmarkItem,
	canBookmarkSearch,
} from '../../src/logic/logicCoreSearchActions';

/**
 * U121-019 #51 — the Bookmark action cell on the Text result header.
 *
 * Core's own command, `bookmarks:bookmark-current-search`, reads its query
 * from the `global-search` plugin, which reads it from the **core search
 * leaf's view state** (`getGlobalSearchQuery`). Nothing in that chain consults
 * Vaultman, so bookmarking from our explorer would have recorded core's query
 * instead of ours. We build the item ourselves and hand it to
 * `bookmarks.addItem`, which is public — same shape, our query.
 *
 * Shape taken verbatim from app.js (Obsidian 1.12.3):
 *
 *   function B2(e) { return { type: 'search', ctime: Date.now(), query: e }; }
 */

describe('search bookmark item matches core', () => {
	it('builds the three fields core builds, and nothing else', () => {
		const item = buildSearchBookmarkItem('status: done', 1700000000000);

		expect(item).toEqual({
			type: 'search',
			ctime: 1700000000000,
			query: 'status: done',
		});
		// An extra field is not free: the bookmarks pane renders these, and core
		// rewrites the file. Anything we invent here is untested against that.
		expect(Object.keys(item).sort()).toEqual(['ctime', 'query', 'type']);
	});

	it('trims the query the way a stored search should be stored', () => {
		expect(buildSearchBookmarkItem('  alpha  ', 1).query).toBe('alpha');
	});

	it('refuses an empty query, as core does', () => {
		// Core raises `msgNoSearchQuery()` rather than storing a blank search.
		expect(canBookmarkSearch('')).toBe(false);
		expect(canBookmarkSearch('   ')).toBe(false);
		expect(canBookmarkSearch('alpha')).toBe(true);
	});
});
