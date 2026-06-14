// typeSearchEngine — the CANONICAL SearchEngine seam (D-C-1).
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS LIVES IN THE VIEW/FILTER CONTRACT PLANE
// ─────────────────────────────────────────────────────────────────────────────
// D-C-1: the alpha keeps Obsidian Core Search as its engine, behind a SWAPPABLE
// `SearchEngine` seam; the `content_search` filter-rule contract is preserved, and a
// future minisearch engine (H1) drops in through the same seam without touching rules.
//
// There are TWO distinct layers and this file reconciles them WITHOUT mutating B's:
//   1. TRANSPORT (lane B, `src/platform/searchEngine.ts`): drive Core Search + scrape
//      its DOM — `{ search(query), readResults(), available }`. That is the fragile
//      adapter surface (ADR 0004); `NativeSearchAdapter implements it`. Untouched here.
//   2. FILTER-RULE PLANE (this file, the CANONICAL seam): what the view/filter system
//      depends on — `{ id, query(rule, scope): AsyncResults, capabilities }`. A search
//      is just a composable filter rule (`content_search`), scoped to a node set.
//
// The native adapter is cast INTO the canonical seam by `nativeSearchEngineFrom`,
// which wraps it with zero behavior change (extract query string from the rule,
// drive the transport, map scraped hits → canonical results). B's `searchEngine.ts`
// and `nativeSearchAdapter.ts` stay byte-for-byte unchanged; their tests still pass.

import type { SearchEngine as NativeSearchTransport } from '../platform/searchEngine';

// ─────────────────────────────────────────────────────────────────────────────
// The filter-rule a search consumes (content_search), kept structural on purpose
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The rule shape the canonical engine matches against. This is the `content_search`
 * filter rule expressed structurally so the seam does not hard-import the Logic-owned
 * `FilterRule`/`FilterType` (those live in `src/types/typeFilter.ts`, owned by Q4 —
 * lane C must not edit them). When the rule pipeline formalizes `content_search` as a
 * `FilterType`, this type narrows to it; today it carries the query + optional
 * fuzziness so the contract is stable across the native→minisearch swap.
 *
 * Invariant (D-C-1): `content_search` stays a COMPOSABLE filter rule — it ANDs/ORs
 * with other rules in a FilterGroup; the engine resolves only this leaf.
 */
export interface ContentSearchRule {
	/** Discriminant tying this to the `content_search` filter-rule kind. */
	readonly kind: 'content_search';
	/** The query string (native engine forwards it verbatim to Core Search). */
	readonly query: string;
	/** Optional matching hints a future engine (minisearch) may honor; native ignores. */
	readonly fuzzy?: boolean;
	readonly caseSensitive?: boolean;
}

/**
 * The scope a query runs within. Structural and minimal: a search is always relative
 * to some node set (a folder, a filtered view, the whole vault). The native transport
 * ignores scope (Core Search is vault-global) and the caller intersects results with
 * the scope; a future in-process engine can honor scope directly. Carrying it in the
 * signature now means the contract does not break when that engine arrives.
 */
export interface SearchScope {
	/** Restrict to these node/file ids; undefined = unscoped (whole vault). */
	readonly nodeIds?: readonly string[];
	/** Restrict to a folder path prefix; undefined = no path restriction. */
	readonly pathPrefix?: string;
}

/** One canonical hit: the path plus its match count. */
export interface SearchEngineHit {
	readonly path: string;
	readonly matchCount: number;
}

/** Canonical results: the query echoed back plus the hits. */
export interface SearchEngineResults {
	readonly query: string;
	readonly hits: readonly SearchEngineHit[];
}

/** A query is always async (native renders on the next tick; remote engines await IO). */
export type AsyncResults = Promise<SearchEngineResults>;

/**
 * What an engine can do — lets the UI/filter layer adapt (e.g. hide a fuzzy toggle for
 * an engine that cannot fuzzy-match, or skip scope UI for a vault-global engine).
 */
export interface SearchEngineCapabilities {
	/** Honors `ContentSearchRule.fuzzy`. Native Core Search = false. */
	readonly fuzzy: boolean;
	/** Honors `SearchScope` server-side (vs caller-side intersection). Native = false. */
	readonly scoped: boolean;
	/** Returns per-file match counts. Native = true (scraped flair). */
	readonly matchCounts: boolean;
}

/**
 * THE CANONICAL SEAM (D-C-1). Everything in the view/filter plane depends on THIS,
 * never on a concrete adapter. Native today (via `nativeSearchEngineFrom`), minisearch
 * later — same signature.
 */
export interface SearchEngine {
	/** Stable engine id (e.g. 'native-search', later 'minisearch'). */
	readonly id: string;
	/** Run a content-search rule within a scope; resolves to canonical results. */
	query(rule: ContentSearchRule, scope?: SearchScope): AsyncResults;
	/** Static capability declaration the UI/filter layer reads. */
	readonly capabilities: SearchEngineCapabilities;
}

// ─────────────────────────────────────────────────────────────────────────────
// Native adapter cast — wraps B's transport into the canonical seam (NO behavior change)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The subset of the native transport (lane B `SearchEngine`) this cast consumes. Kept
 * as a structural supertype so the cast also accepts test doubles. `NativeSearchAdapter`
 * satisfies it because it implements B's transport interface.
 */
export type NativeSearchEngineLike = Pick<
	NativeSearchTransport,
	'search' | 'readResults' | 'available'
>;

/**
 * Cast a native-search transport (lane B) into the canonical `SearchEngine`.
 *
 * Behavior is IDENTICAL to calling the adapter directly:
 *   - `query({query})` → `await transport.search(query)` then `transport.readResults()`,
 *     mapping `{path, matchCount}` hits 1:1 onto canonical hits and echoing the query.
 *   - when the transport is unavailable, `search` is already a no-op and `readResults`
 *     returns empty, so `query` resolves to `{ query, hits: [] }` — the same graceful
 *     degradation B guarantees. No throw.
 *   - `scope` and `fuzzy` are not honored by the native engine (capabilities say so);
 *     the caller intersects with scope. This preserves the `content_search`-as-rule
 *     contract while leaving room for a scoped/fuzzy engine to honor them later.
 *
 * This is the D-C-1 reconciliation: B's adapter is unchanged; callers depend on the
 * seam; minisearch will provide its own `SearchEngine` without a transport at all.
 */
export function nativeSearchEngineFrom(
	transport: NativeSearchEngineLike,
	id = 'native-search',
): SearchEngine {
	return {
		id,
		capabilities: {
			fuzzy: false,
			scoped: false,
			matchCounts: true,
		},
		async query(rule: ContentSearchRule, _scope?: SearchScope): AsyncResults {
			void _scope; // native is vault-global; caller intersects with scope.
			await transport.search(rule.query);
			const results = transport.readResults();
			return {
				query: rule.query,
				hits: results.hits.map((h) => ({ path: h.path, matchCount: h.matchCount })),
			};
		},
	};
}
