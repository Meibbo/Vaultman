import { describe, expect, it, vi } from 'vitest';
import type { App, Plugin } from 'obsidian';
import {
	nativeSearchEngineFrom,
} from '../../../src/types/typeSearchEngine';
import type {
	ContentSearchRule,
	SearchEngine,
	SearchEngineResults,
} from '../../../src/types/typeSearchEngine';
import {
	GLOBAL_SEARCH_PLUGIN_ID,
	NativeSearchAdapter,
} from '../../../src/platform/adapters/nativeSearchAdapter';
import type { PlatformAdapterContext } from '../../../src/platform/platformAdapter';
import type {
	SearchEngine as NativeSearchTransport,
	SearchResults,
} from '../../../src/platform/searchEngine';

const RULE: ContentSearchRule = { kind: 'content_search', query: 'tag:#project' };

describe('typeSearchEngine — canonical seam shape (D-C-1)', () => {
	it('a minimal canonical engine satisfies {id, query(rule, scope), capabilities}', async () => {
		const engine: SearchEngine = {
			id: 'fake',
			capabilities: { fuzzy: true, scoped: true, matchCounts: false },
			async query(rule, scope) {
				return { query: rule.query, hits: scope?.nodeIds ? [] : [] };
			},
		};
		const results: SearchEngineResults = await engine.query(RULE);
		expect(results.query).toBe('tag:#project');
		expect(engine.capabilities.fuzzy).toBe(true);
	});

	it('ContentSearchRule is discriminated by kind=content_search (rule contract preserved)', () => {
		const rule: ContentSearchRule = { kind: 'content_search', query: 'foo', fuzzy: true };
		expect(rule.kind).toBe('content_search');
	});
});

describe('nativeSearchEngineFrom — cast B transport → canonical seam (no behavior change)', () => {
	/** A hand-rolled transport double matching lane B's SearchEngine interface. */
	function transportDouble(
		results: SearchResults,
		available = true,
	): { transport: NativeSearchTransport; search: ReturnType<typeof vi.fn> } {
		const search = vi.fn(async () => {});
		const transport: NativeSearchTransport = {
			available,
			search,
			readResults: () => results,
		};
		return { transport, search };
	}

	it('exposes the native id and the native (non-fuzzy, unscoped, match-counts) capabilities', () => {
		const { transport } = transportDouble({ query: '', hits: [] });
		const engine = nativeSearchEngineFrom(transport);
		expect(engine.id).toBe('native-search');
		expect(engine.capabilities).toEqual({ fuzzy: false, scoped: false, matchCounts: true });
	});

	it('query() drives the transport search then maps scraped hits 1:1', async () => {
		const { transport, search } = transportDouble({
			query: '',
			hits: [
				{ path: 'Projects/Alpha.md', matchCount: 3 },
				{ path: 'Notes/Beta.md', matchCount: 12 },
			],
		});
		const engine = nativeSearchEngineFrom(transport);

		const results = await engine.query(RULE);

		expect(search).toHaveBeenCalledWith('tag:#project');
		expect(results).toEqual({
			query: 'tag:#project',
			hits: [
				{ path: 'Projects/Alpha.md', matchCount: 3 },
				{ path: 'Notes/Beta.md', matchCount: 12 },
			],
		});
	});

	it('degrades to empty hits (no throw) when the transport is unavailable', async () => {
		const { transport } = transportDouble({ query: '', hits: [] }, false);
		const engine = nativeSearchEngineFrom(transport);
		await expect(engine.query(RULE)).resolves.toEqual({ query: 'tag:#project', hits: [] });
	});

	it('accepts a scope argument without throwing (native ignores it; caller intersects)', async () => {
		const { transport } = transportDouble({
			query: '',
			hits: [{ path: 'X.md', matchCount: 1 }],
		});
		const engine = nativeSearchEngineFrom(transport);
		const results = await engine.query(RULE, { nodeIds: ['only-this'], pathPrefix: 'X' });
		// native does not filter by scope; it returns what Core Search produced
		expect(results.hits).toEqual([{ path: 'X.md', matchCount: 1 }]);
	});
});

describe('nativeSearchEngineFrom — real NativeSearchAdapter casts to the seam', () => {
	// Node-env safe: a minimal Document stub (no jsdom). `querySelector` returns null,
	// so readResults yields empty hits — enough to prove the cast wires to the REAL
	// adapter's search→readResults path without behavior change. The DOM-scrape
	// behavior itself is covered by component tests (test/component/nativeSearchScrape).
	const docStub = { querySelector: () => null } as unknown as Document;

	function ctx(openGlobalSearch = vi.fn()): PlatformAdapterContext {
		const app = {
			internalPlugins: {
				plugins: {
					[GLOBAL_SEARCH_PLUGIN_ID]: { enabled: true, instance: { openGlobalSearch } },
				},
			},
		} as unknown as App;
		return { app, plugin: {} as Plugin, doc: docStub };
	}

	it('the exemplar adapter satisfies the canonical seam and forwards the query verbatim', async () => {
		const openGlobalSearch = vi.fn();
		const adapter = new NativeSearchAdapter();
		adapter.apply(ctx(openGlobalSearch));

		// The adapter IS a lane-B transport; cast it into the canonical seam.
		const engine: SearchEngine = nativeSearchEngineFrom(adapter);

		await engine.query(RULE);
		// behavior identical to adapter.search('tag:#project') — same private symbol path
		expect(openGlobalSearch).toHaveBeenCalledWith('tag:#project');
		expect(engine.id).toBe('native-search');
	});

	it('cast result equals direct adapter usage (no behavior change)', async () => {
		const adapter = new NativeSearchAdapter();
		adapter.apply(ctx());
		const engine = nativeSearchEngineFrom(adapter);

		const viaSeam = await engine.query(RULE);
		// drive the adapter directly the way lane B's own tests do
		await adapter.search('tag:#project');
		const direct = adapter.readResults();

		expect(viaSeam.hits).toEqual(direct.hits);
		expect(viaSeam.query).toBe('tag:#project');
	});
});
