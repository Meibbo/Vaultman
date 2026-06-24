# Core Search results research

Date: 2026-05-09
Mode: research
Scope: determine whether Vaultman can reuse Obsidian core Search results or engine without visibly driving the Search pane.

## User goal

Find a way to get results equivalent to the Obsidian core Search plugin because its speed is much better than Vaultman's current FnR in tab content. The user explicitly rejected a cheap visible trick such as sending the user's query into the visible Search UI.

## Environment observed

- Obsidian: `1.12.7 (installer 1.12.7)`.
- Core plugin id: `global-search`.
- Command id observed: `global-search:open`.
- Current Search view type: `search`.

## Public API check

The public `obsidian.d.ts` exposes text-level search helpers only:

- `prepareFuzzySearch(query): (text) => SearchResult | null`
- `prepareSimpleSearch(query): (text) => SearchResult | null`
- `renderMatches(...)`
- `renderResults(...)`
- `SearchComponent`
- `SearchResult`

No public API was found for invoking the core Search plugin as a vault-wide search engine or retrieving its result list.

This matches external evidence from an Obsidian forum request asking for the core Search functionality to be added to the API; the requester reported only seeing `prepareFuzzySearch` and `prepareSimpleSearch`.

## Runtime introspection

`app.internalPlugins.getEnabledPluginById('global-search')` was available and enabled.

The enabled plugin wrapper exposed these relevant methods:

- `getGlobalSearchQuery`
- `init`
- `initLeaf`
- `openGlobalSearch`

It did not expose a direct `search(query)` or result API.

The registered view creator exists at:

- `app.viewRegistry.getViewCreatorByType('search')`

The active `SearchView` instance exposed useful internals:

- `getQuery()`
- `setQuery(query)`
- `startSearch()`
- `stopSearch()`
- `searchQuery`
- `queue`
- `dom`

The view's `searchQuery` object exposed:

- `query`
- `caseSensitive`
- `requiredInputs`
- `matcher`
- `match(file, input)`
- `matchContent(content)`
- `matchFilepath(path)`
- `matchTag(tag)`

For the current query `es`, `requiredInputs` was `{ content: true }`.

## Core pipeline shape

The minified `SearchView.startSearch()` source shows this shape:

1. Stop the previous search.
2. Build an internal `SearchQuery` object from the app, query text, and case sensitivity.
3. Empty the result DOM.
4. Start an internal queue over `app.vault.getFiles()`.
5. Call an internal, non-exported scanner function with `requiredInputs`, the queue, and a per-file callback.
6. Per file, call `searchQuery.match(file, input)`.
7. Add or remove a result through the Search result DOM adapter.

Important limitation: the scanner, queue, parser classes, and result row classes are minified closure-local symbols. They are not reachable as stable global names.

## Search result data shape

The active Search view's result map is `view.dom.resultDomLookup`, keyed by `TFile`.

Each value includes:

- `file`
- `content`
- `result`
- `info`
- `rendered`
- `collapsed`
- `childrenEl`
- `selfEl`

The `result` object is not the same shape as public `SearchResult`; it can contain keys such as:

- `filename: [[start, end], ...]`
- `content: [[start, end], ...]`
- `canvas-<nodeId>: [[start, end], ...]`

Example from active Search query `es`:

- Path: `+/9 Differences Between Spanish And English Punctuation.md`
- `filename` matches: 1
- `content` matches: 89

## Headless SearchView experiment

I created an offscreen, fake leaf and instantiated the registered `search` view creator without opening or changing the visible Search pane.

The offscreen container used a class marker:

- `.vaultman-headless-search-test`

For query `es`, after roughly 5 seconds of scan time, the hidden view had:

- `working: true`
- `matchCount: 874`
- `fileCount: 40`
- Sample paths matching the visible Search pane's ordering:
  - `+/+.md`
  - `+/9 Differences Between Spanish And English Punctuation.md`
  - `+/12 Principles for using Zettelkasten - Knowledge management.md`

This proves a non-visible SearchView can invoke the core Search pipeline and produce core-shaped results.

However, a later longer-running probe became unsafe: Obsidian `eval` stopped responding inside a 3-minute timeout and shell startup became very slow. I removed the visible offscreen DOM root afterward, but this is enough evidence that raw headless SearchView needs stricter lifecycle control before it is productized.

## CLI search experiment

The `obsidian help` output listed headless commands:

- `search query=<text> path=<folder> limit=<n> total case format=text|json`
- `search:context ...`
- `search:open query=<text>`

`search:open` is rejected for this use case because it opens or drives the user-visible Search view.

`obsidian search query=... limit=5 format=json` timed out in this session for both common and unlikely queries. It is also not appropriate as an in-plugin runtime dependency because it would shell out to the external CLI from inside Obsidian.

## Interpretation

There is no documented, stable core Search result API.

There are two real internal options:

1. Use the internal `SearchQuery` parser/matcher, then run our own controlled file loop with `vault.cachedRead`.
2. Instantiate a hidden `SearchView` and read `view.dom.resultDomLookup`.

Option 1 is less likely to freeze Obsidian and avoids visible UI, but still depends on internal/minified constructor access. It likely gives core query semantics because matching is delegated to `SearchQuery.match(...)`, but it does not reuse the core queue/scanner.

Option 2 gets closest to core Search behavior and ordering, but is brittle and currently unsafe without stronger cleanup, cancellation, timeouts, and a single-flight guard.

If the core Search plugin is disabled, there is no confirmed stable path to the same engine. The public API fallback is only `prepareSimpleSearch` / `prepareFuzzySearch`, which does not reproduce the full core Search syntax, operators, or result shape. Temporarily enabling `global-search` through `app.internalPlugins` would mutate user/plugin state and should not be used unless the user explicitly accepts that behavior.

## Recommended next step

Do not ship the headless SearchView adapter yet.

Next experiment should be a tightly-scoped, reversible prototype:

1. Obtain the internal `SearchQuery` constructor from a registered Search view or a temporary hidden view.
2. Instantiate `new SearchQuery(app, query, caseSensitive)`.
3. Run a cancellable, chunked loop over `app.vault.getFiles()`.
4. Use `vault.cachedRead(file)` only when `requiredInputs.content` is true.
5. Call `searchQuery.match(file, contentOrInput)`.
6. Normalize the result object into Vaultman's existing result row shape.
7. Benchmark against current FnR using the same query set.

If that is not fast enough, put the riskier hidden SearchView path behind an experimental setting and never mutate the visible Search pane.

