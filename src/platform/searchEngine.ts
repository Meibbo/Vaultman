// SearchEngine seam — the contract the native-search adapter sits behind.
//
// The alpha keeps Obsidian's Core Search as its search engine (decision D-C-1):
// rather than reimplement query parsing, Vaultman drives the native global-search
// view and scrapes its results. That scraping is the EXEMPLAR fragile case for the
// Fragility Registry, so it lives behind this seam + a PlatformAdapter. A future
// pure/in-process engine can implement the same seam without touching callers.

/** A single search hit: the file path plus its match count, scraped from the view. */
export interface SearchHit {
	readonly path: string;
	readonly matchCount: number;
}

/** Outcome of reading the native search results DOM. */
export interface SearchResults {
	/** The query the results correspond to (best-effort; '' if unknown). */
	readonly query: string;
	readonly hits: readonly SearchHit[];
}

/**
 * Drives a search and reads its results. The native implementation routes the
 * query into Core Search and scrapes the results DOM; failures degrade to empty
 * results rather than throwing.
 */
export interface SearchEngine {
	/** Run a query against the underlying engine. */
	search(query: string): Promise<void>;
	/** Read the current results. Returns empty when the surface is unavailable. */
	readResults(): SearchResults;
	/** Whether the engine is currently usable (probe-backed). */
	readonly available: boolean;
}
