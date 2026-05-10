# 2026-05-10 Content Search Cache And Explorer Interaction Fixes

## Scope

User-reported polish/performance fixes:

- Content tab search should not remount and jump scroll while incremental matches arrive.
- Repeated same-query content searches should reuse known match positions while the vault file fingerprint is unchanged.
- Search result line numbers should be visually faint.
- Tree and grid rows/tiles should receive their own click/activation events instead of being intercepted by box selection.
- Queue island toolbar should not include a redundant close squircle.
- Search syntax help should live inside the search box, not beside the explorer toolbar FABs.
- Filter operations must not widen to every vault file.
- Filter tab pane activation should not animate opacity.

Existing local research was found in `../research/2026-05-09-ecosystem-performance-codeql-research.md`; no new web research was needed. The relevant Omnisearch pattern recorded there is persistent query/index caching with per-file fingerprints and chunked work. This implementation uses a smaller in-memory query cache keyed by query plus vault fingerprint; persistent Dexie-style indexing remains a future extension.

## Implementation

- Added `ServiceCache<K, V>` with LRU eviction and fingerprint validation.
- Added `serviceOperationScope` to normalize legacy `all` to `auto` and resolve operation files as `selected > filtered > []`.
- Cached content-index matches by same query and markdown file fingerprint (`path`, `mtime`, `size`).
- Removed the `{#key query:contentVersion}` remount from the Content tab and made `explorerContent` subscribe to `contentIndex`.
- Split content match display into `labelPrefix` plus label, with faint styling for the line prefix.
- Prevented tree/grid box selection from starting on an interactive row/tile, so normal click, open, and navigation gestures are not swallowed.
- Removed the queue island close squircle.
- Moved search syntax help into the search pill.
- Removed `all` operation scope from settings/sort/content FnR UI and stopped providers from falling back to all vault files.
- Scoped native property rename queue expansion to `change.files` instead of scanning the vault.
- Removed opacity transition from `.vm-tab-content`.

## Verification

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceCache.test.ts test/unit/services/serviceOperationScope.test.ts test/unit/services/serviceContentIndex.test.ts test/unit/components/explorerContent.test.ts test/unit/services/serviceQueue.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/reactiveExplorers.test.ts test/component/navbarToolbarMenuPlacement.test.ts test/component/overlaySortMenu.test.ts test/component/cmenuSetAction.test.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts --fileParallelism=false`
- `pnpm run check`
- `pnpm run lint`
- `pnpm run build`
- `git diff --check -- <touched files>`

