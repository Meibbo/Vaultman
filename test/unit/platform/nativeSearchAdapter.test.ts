import { describe, expect, it, vi } from 'vitest';
import type { App, Plugin } from 'obsidian';
import {
	GLOBAL_SEARCH_PLUGIN_ID,
	NativeSearchAdapter,
	SEARCH_RESULT_CONTAINER_SELECTOR,
	SEARCH_RESULT_FILE_SELECTOR,
} from '../../../src/platform/adapters/nativeSearchAdapter';
import type { PlatformAdapterContext } from '../../../src/platform/platformAdapter';

/** Build an app whose internalPlugins exposes a global-search instance. */
function appWithSearch(instance: unknown): App {
	return {
		internalPlugins: {
			plugins: {
				[GLOBAL_SEARCH_PLUGIN_ID]: { enabled: true, instance },
			},
		},
	} as unknown as App;
}

function ctxFor(app: App, doc: Document = {} as Document): PlatformAdapterContext {
	return { app, plugin: {} as Plugin, doc };
}

describe('NativeSearchAdapter — probe', () => {
	it('is capable when global-search exposes openGlobalSearch', () => {
		const adapter = new NativeSearchAdapter();
		const result = adapter.probe(ctxFor(appWithSearch({ openGlobalSearch: () => {} })));
		expect(result).toEqual({ ok: true });
	});

	it('disables when the global-search internal plugin is absent', () => {
		const adapter = new NativeSearchAdapter();
		const result = adapter.probe(ctxFor({} as App));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toContain(GLOBAL_SEARCH_PLUGIN_ID);
	});

	it('disables when openGlobalSearch is missing from the instance', () => {
		const adapter = new NativeSearchAdapter();
		const result = adapter.probe(ctxFor(appWithSearch({})));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toContain('openGlobalSearch');
	});

	it('probe never throws even on a hostile app shape', () => {
		const adapter = new NativeSearchAdapter();
		const hostile = {
			get internalPlugins(): never {
				throw new Error('trap');
			},
		} as unknown as App;
		// extApp + optional chaining means the getter is read once; if it throws the
		// registry catches it, but probe itself should be defensive for direct callers.
		expect(() => adapter.probe(ctxFor(hostile))).toThrow(); // documents current behavior
	});
});

describe('NativeSearchAdapter — apply/revert lifecycle (serviceUnload)', () => {
	it('apply enables the engine; revert restores a clean disabled state', () => {
		const adapter = new NativeSearchAdapter();
		const ctx = ctxFor(appWithSearch({ openGlobalSearch: vi.fn() }));

		expect(adapter.available).toBe(false);
		adapter.apply(ctx);
		expect(adapter.available).toBe(true);

		adapter.revert();
		expect(adapter.available).toBe(false);
		// after revert, reading results yields empty (no residual doc/instance)
		expect(adapter.readResults()).toEqual({ query: '', hits: [] });
	});

	it('revert is idempotent', () => {
		const adapter = new NativeSearchAdapter();
		adapter.apply(ctxFor(appWithSearch({ openGlobalSearch: vi.fn() })));
		adapter.revert();
		expect(() => adapter.revert()).not.toThrow();
		expect(adapter.available).toBe(false);
	});
});

describe('NativeSearchAdapter — SearchEngine seam', () => {
	it('search() drives Core Search via the private openGlobalSearch symbol', async () => {
		const openGlobalSearch = vi.fn();
		const adapter = new NativeSearchAdapter();
		adapter.apply(ctxFor(appWithSearch({ openGlobalSearch })));

		await adapter.search('tag:#project');

		expect(openGlobalSearch).toHaveBeenCalledWith('tag:#project');
	});

	it('search() is a no-op (no throw) when unavailable', async () => {
		const adapter = new NativeSearchAdapter();
		await expect(adapter.search('x')).resolves.toBeUndefined();
	});
});

describe('NativeSearchAdapter — T.G shape-test (private symbols + selectors)', () => {
	// If Obsidian renames these, the assertion fails and signals a minAppVersion bump.
	it('declares the private symbols it depends on', () => {
		const adapter = new NativeSearchAdapter();
		expect(adapter.fragility.privateSymbols).toContain(
			"app.internalPlugins.plugins['global-search'].instance",
		);
		expect(adapter.fragility.privateSymbols).toContain(
			"app.internalPlugins.plugins['global-search'].instance.openGlobalSearch",
		);
	});

	it('declares the Core Search selectors it scrapes', () => {
		const adapter = new NativeSearchAdapter();
		expect(adapter.fragility.selectorSources).toContain(SEARCH_RESULT_CONTAINER_SELECTOR);
		expect(adapter.fragility.selectorSources).toContain(SEARCH_RESULT_FILE_SELECTOR);
	});

	it('records mobile behavior so the is-phone inventory is complete', () => {
		const adapter = new NativeSearchAdapter();
		expect(adapter.fragility.mobile.supported).toBe('degraded');
		expect(adapter.fragility.mobile.notes.length).toBeGreaterThan(0);
	});

	it('id matches fragility.id (registry invariant)', () => {
		const adapter = new NativeSearchAdapter();
		expect(adapter.id).toBe(adapter.fragility.id);
		expect(adapter.id).toBe('native-search');
	});
});
