import { afterEach, describe, expect, it, vi } from 'vitest';
import type { App, Plugin } from 'obsidian';
import {
	GLOBAL_SEARCH_PLUGIN_ID,
	NativeSearchAdapter,
	findSearchResultContainer,
	scrapeSearchResults,
} from '../../src/platform/adapters/nativeSearchAdapter';
import type { PlatformAdapterContext } from '../../src/platform/platformAdapter';

afterEach(() => {
	document.body.innerHTML = '';
});

/** Build a Core-Search-shaped results DOM in jsdom. */
function buildSearchDom(
	files: Array<{ path: string; matches?: number }>,
): HTMLElement {
	const container = document.createElement('div');
	container.className = 'search-result-container';
	for (const f of files) {
		const fileBlock = document.createElement('div');
		fileBlock.className = 'search-result-file-title tree-item';

		const inner = document.createElement('div');
		inner.className = 'tree-item-inner';
		inner.textContent = f.path;
		fileBlock.appendChild(inner);

		if (f.matches != null) {
			const flair = document.createElement('div');
			flair.className = 'tree-item-flair';
			flair.textContent = String(f.matches);
			fileBlock.appendChild(flair);
		}
		container.appendChild(fileBlock);
	}
	document.body.appendChild(container);
	return container;
}

describe('scrapeSearchResults (Core Search DOM contract)', () => {
	it('reads file paths and match counts from the results tree', () => {
		const container = buildSearchDom([
			{ path: 'Projects/Alpha.md', matches: 3 },
			{ path: 'Notes/Beta.md', matches: 12 },
		]);

		expect(scrapeSearchResults(container)).toEqual([
			{ path: 'Projects/Alpha.md', matchCount: 3 },
			{ path: 'Notes/Beta.md', matchCount: 12 },
		]);
	});

	it('defaults match count to 0 when no flair is present', () => {
		const container = buildSearchDom([{ path: 'Solo.md' }]);
		expect(scrapeSearchResults(container)).toEqual([{ path: 'Solo.md', matchCount: 0 }]);
	});

	it('returns empty for a null container or empty results', () => {
		expect(scrapeSearchResults(null)).toEqual([]);
		expect(scrapeSearchResults(buildSearchDom([]))).toEqual([]);
	});

	it('findSearchResultContainer locates the live container', () => {
		buildSearchDom([{ path: 'X.md', matches: 1 }]);
		expect(findSearchResultContainer(document)).not.toBeNull();
	});
});

describe('NativeSearchAdapter.readResults end-to-end against jsdom', () => {
	function ctx(): PlatformAdapterContext {
		const app = {
			internalPlugins: {
				plugins: {
					[GLOBAL_SEARCH_PLUGIN_ID]: { enabled: true, instance: { openGlobalSearch: vi.fn() } },
				},
			},
		} as unknown as App;
		return { app, plugin: {} as Plugin, doc: document };
	}

	it('scrapes the document the adapter was applied with', () => {
		buildSearchDom([{ path: 'Found.md', matches: 5 }]);
		const adapter = new NativeSearchAdapter();
		adapter.apply(ctx());

		expect(adapter.readResults().hits).toEqual([{ path: 'Found.md', matchCount: 5 }]);
	});

	it('returns empty hits after revert (no residual document reference)', () => {
		buildSearchDom([{ path: 'Found.md', matches: 5 }]);
		const adapter = new NativeSearchAdapter();
		adapter.apply(ctx());
		adapter.revert();

		expect(adapter.readResults().hits).toEqual([]);
	});
});
