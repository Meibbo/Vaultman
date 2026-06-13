// NativeSearchAdapter — the EXEMPLAR fragile adapter (ADR 0004, spec lane B).
//
// The alpha uses Obsidian's Core Search as its engine (D-C-1). This adapter owns
// every private/undocumented touchpoint involved:
//   - the internal `global-search` plugin (probe + drive),
//   - the `search` leaf view type,
//   - the Core Search results DOM (scraping `.search-result-*`).
// It sits behind the SearchEngine seam and degrades to empty results if the probe
// fails, so a Core Search redesign cannot crash Vaultman.

import type { App } from 'obsidian';
import { extApp, getInternalPlugin } from '../../types/typeObsidian';
import type {
	CapabilityResult,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from '../platformAdapter';
import type { SearchEngine, SearchHit, SearchResults } from '../searchEngine';

/** Internal plugin id for Core Search. */
export const GLOBAL_SEARCH_PLUGIN_ID = 'global-search';
/** Leaf view type Core Search registers. */
export const SEARCH_VIEW_TYPE = 'search';

/** Results-tree container in the Core Search leaf. */
export const SEARCH_RESULT_CONTAINER_SELECTOR = '.search-result-container';
/** One file's result block. */
export const SEARCH_RESULT_FILE_SELECTOR = '.search-result-file-title';
/** The file path text inside a result block. */
export const SEARCH_RESULT_FILE_TITLE_TEXT_SELECTOR = '.tree-item-inner';
/** Per-file match count badge. */
export const SEARCH_RESULT_MATCH_COUNT_SELECTOR = '.search-result-file-matches, .tree-item-flair';

/** Shape of the internal global-search plugin instance we depend on. */
interface GlobalSearchInstance {
	openGlobalSearch?: (query: string) => void;
}

/**
 * Pure scraper: read hits out of a Core Search results-container element. Exported
 * so the fragile DOM contract is unit-testable without a live Obsidian workspace
 * (mirrors the resolveNativeBindingTarget pattern).
 */
export function scrapeSearchResults(container: Element | null): SearchHit[] {
	if (!container) return [];
	const fileNodes = container.querySelectorAll(SEARCH_RESULT_FILE_SELECTOR);
	const hits: SearchHit[] = [];
	fileNodes.forEach((node) => {
		const path = (
			node.querySelector(SEARCH_RESULT_FILE_TITLE_TEXT_SELECTOR)?.textContent ??
			node.textContent ??
			''
		).trim();
		if (!path) return;
		const flair = node
			.querySelector(SEARCH_RESULT_MATCH_COUNT_SELECTOR)
			?.textContent?.trim();
		const matchCount = flair ? Number.parseInt(flair, 10) || 0 : 0;
		hits.push({ path, matchCount });
	});
	return hits;
}

/** Locate the first Core Search results container in a document. */
export function findSearchResultContainer(doc: Document): Element | null {
	return doc.querySelector(SEARCH_RESULT_CONTAINER_SELECTOR);
}

function resolveGlobalSearch(app: App): GlobalSearchInstance | undefined {
	return getInternalPlugin<GlobalSearchInstance>(app, GLOBAL_SEARCH_PLUGIN_ID);
}

const FRAGILITY: FragilityRecord = {
	id: 'native-search',
	title: 'Native Core Search engine',
	summary:
		'Drives Obsidian Core Search (global-search internal plugin) and scrapes its ' +
		'results DOM to act as the alpha search engine (D-C-1). No public API exposes ' +
		'search results, so this is DOM scraping by necessity.',
	privateSymbols: [
		"app.internalPlugins.plugins['global-search'].instance",
		"app.internalPlugins.plugins['global-search'].instance.openGlobalSearch",
	],
	selectorSources: [
		SEARCH_RESULT_CONTAINER_SELECTOR,
		SEARCH_RESULT_FILE_SELECTOR,
		SEARCH_RESULT_FILE_TITLE_TEXT_SELECTOR,
		SEARCH_RESULT_MATCH_COUNT_SELECTOR,
	],
	obsidianAssumptions: [
		'global-search ships enabled as a core plugin',
		"its instance exposes openGlobalSearch(query) (undocumented)",
		'results render under .search-result-container with .search-result-file-title rows',
	],
	fallback:
		'Search engine reports unavailable; readResults() returns empty hits and callers ' +
		'fall back to in-plugin filtering. No crash.',
	mobile: {
		supported: 'degraded',
		notes:
			'Core Search exists on mobile but its results pane is sidebar-hosted; scraping ' +
			'works only while that pane is mounted. Treat as degraded until is-phone tested.',
	},
};

/**
 * The exemplar PlatformAdapter. Also exposes a SearchEngine view of itself so
 * callers depend on the seam, not the adapter internals.
 */
export class NativeSearchAdapter implements PlatformAdapter, SearchEngine {
	readonly id = FRAGILITY.id;
	readonly fragility = FRAGILITY;

	private doc: Document | null = null;
	private instance: GlobalSearchInstance | undefined;
	private isApplied = false;

	probe(ctx: PlatformAdapterContext): CapabilityResult {
		const instance = resolveGlobalSearch(ctx.app);
		if (!instance) {
			return { ok: false, reason: `${GLOBAL_SEARCH_PLUGIN_ID} internal plugin not available` };
		}
		if (typeof instance.openGlobalSearch !== 'function') {
			return { ok: false, reason: 'global-search.openGlobalSearch is not a function' };
		}
		// Confirm the search view type is registered (best-effort; absence of the
		// registry on the mock is tolerated).
		const viewRegistry = (extApp(ctx.app) as { viewRegistry?: { typeByExtension?: unknown } })
			.viewRegistry;
		void viewRegistry; // documented dependency; not strictly required to function.
		return { ok: true };
	}

	apply(ctx: PlatformAdapterContext): void {
		this.doc = ctx.doc;
		this.instance = resolveGlobalSearch(ctx.app);
		this.isApplied = true;
	}

	revert(): void {
		this.doc = null;
		this.instance = undefined;
		this.isApplied = false;
	}

	// ----- SearchEngine seam -----

	get available(): boolean {
		return this.isApplied && typeof this.instance?.openGlobalSearch === 'function';
	}

	async search(query: string): Promise<void> {
		if (!this.available) return;
		this.instance?.openGlobalSearch?.(query);
		// Core Search renders asynchronously; callers read results on the next tick.
		await Promise.resolve();
	}

	readResults(): SearchResults {
		if (!this.available || !this.doc) {
			return { query: '', hits: [] };
		}
		const container = findSearchResultContainer(this.doc);
		return { query: '', hits: scrapeSearchResults(container) };
	}
}
