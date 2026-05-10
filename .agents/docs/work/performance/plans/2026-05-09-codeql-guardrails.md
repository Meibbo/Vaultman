---
title: CodeQL performance guardrails
type: implementation-record
status: done
parent: "[[docs/work/performance/research/2026-05-09-ecosystem-performance-codeql-research|ecosystem-performance-codeql-research]]"
created: 2026-05-09T18:26:27
updated: 2026-05-09T19:26:31
tags:
  - agent/performance
  - vaultman/codeql
  - vaultman/guardrails
created_by: codex
updated_by: codex
---

# CodeQL Performance Guardrails

## Scope

Continue the performance lane after durable TanStack virtualizer keys by
starting the custom CodeQL query pack. Implemented guardrails now include
`vaultman/virtualizer-missing-item-key`,
`vaultman/trailing-debounce-explorer-refresh`, and
`vaultman/unbounded-vault-read-promise-all`, matching the next actions recorded in
[[docs/work/performance/research/2026-05-09-ecosystem-performance-codeql-research|ecosystem performance and CodeQL guardrail research]].

## Implementation

### Virtualizer Missing Item Key

- Added `codeql/queries/javascript/vaultman/VirtualizerMissingItemKey.ql`.
- The query flags object-literal options passed to:
  - `createVirtualizer({...})`
  - `.setOptions({...})`
- The object must look like TanStack virtualizer options by carrying `count`,
  `getScrollElement`, and one virtualizer anchor option such as `estimateSize`,
  `overscan`, or `getItemKey`.
- The query reports the options object only when `getItemKey` is absent.
- The query intentionally uses local AST matching instead of dataflow so it
  stays precise for Vaultman's current Svelte virtualizer call shapes.
- Added a CodeQL test fixture under
  `codeql/tests/javascript/vaultman/virtualizer-missing-item-key/`.
- Wired `.github/codeql/codeql-config.yml` so the existing CodeQL analysis keeps
  `security-extended` and `security-and-quality` while also running the local
  Vaultman query pack.
- Added a `query-tests` job to `.github/workflows/codeql.yml` using
  `github/codeql-action/setup-codeql@v4` and:

```powershell
codeql test run --additional-packs codeql/queries/javascript codeql/tests --threads=0
```

### Trailing Debounce Explorer Refresh

- Added
  `codeql/queries/javascript/vaultman/TrailingDebounceExplorerRefresh.ql`.
- The query flags `debounce(...)` and raw `setTimeout(...)` calls whose callback
  directly refreshes Vaultman explorer indexes:
  - `filesIndex`
  - `propsIndex`
  - `tagsIndex`
  - `contentIndex`
  - `operationsIndex`
  - `activeFiltersIndex`
  - `cssSnippetsIndex`
  - `pluginsIndex`
  - `templatesIndex`
- The query intentionally does not flag `leadingDebounce(...)`, because that is
  the approved immediate-first, trailing-coalesced scheduler for explorer UI
  refresh paths.
- The query also avoids plain UI timer/debounce callbacks that do not call an
  explorer index `.refresh()`.
- Added a CodeQL test fixture under
  `codeql/tests/javascript/vaultman/trailing-debounce-explorer-refresh/`.

### Unbounded Vault Read Promise.all

- Added `codeql/queries/javascript/vaultman/UnboundedVaultReadPromiseAll.ql`.
- The query flags `Promise.all(...)` calls whose argument is `.map(...)` over a
  full-vault file collection and whose callback directly calls
  `app.vault.read(...)` or `app.vault.cachedRead(...)`.
- Full-vault collections are intentionally narrow:
  - `files`
  - `allFiles`
  - `markdownFiles`
  - `vaultFiles`
  - direct `app.vault.getFiles().map(...)`
  - direct `app.vault.getMarkdownFiles().map(...)`
- The query intentionally avoids approved bounded shapes such as `chunk.map(...)`
  and `batch.map(...)` by only matching the known full-vault collection names
  and direct full-vault getter calls.
- The query also avoids explicit small arrays such as
  `Promise.all([app.vault.read(a), app.vault.cachedRead(b)])`, selected-file
  collections, and `.map(...)` callbacks that do not read vault content.
- Added a CodeQL test fixture under
  `codeql/tests/javascript/vaultman/unbounded-vault-read-promise-all/`.

## TDD Record

### Virtualizer Missing Item Key

1. Initial RED with the existing scaffold failed at pack resolution because the
   local query pack was not passed as an additional pack.
2. RED rerun with `--additional-packs codeql\queries\javascript` failed on the
   missing `VirtualizerMissingItemKey.ql` reference.
3. After adding the query, the test failed against the empty expected file with
   exactly two alerts:
   - `createVirtualizer({...})` without `getItemKey`
   - `.setOptions({...})` without `getItemKey`
4. The two good fixture cases with `getItemKey` were not reported.
5. The expected file was updated and the query test passed.

### Trailing Debounce Explorer Refresh

1. RED fixture was added first under
   `codeql/tests/javascript/vaultman/trailing-debounce-explorer-refresh/`.
2. Initial RED failed because `TrailingDebounceExplorerRefresh.ql` could not be
   resolved.
3. After adding the query, the test failed against the empty expected file with
   exactly four alerts:
   - `debounce(() => filesIndex.refresh(), ...)`
   - `debounce(() => { propsIndex.refresh(); tagsIndex.refresh(); }, ...)`
   - `activeWindow.setTimeout(() => contentIndex.refresh(), ...)`
   - `setTimeout(() => activeFiltersIndex.refresh(), ...)`
4. The good fixture cases were not reported:
   - `leadingDebounce(() => filesIndex.refresh(), ...)`
   - `debounce(...)` around a popup refresh helper
   - `activeWindow.setTimeout(...)` around a CSS transition helper
5. The expected file was updated and the query test passed.

### Unbounded Vault Read Promise.all

1. RED fixture was added first under
   `codeql/tests/javascript/vaultman/unbounded-vault-read-promise-all/`.
2. Initial RED failed because `UnboundedVaultReadPromiseAll.ql` could not be
   resolved.
3. After adding the query, the test failed against the empty expected file with
   exactly four alerts:
   - `Promise.all(files.map(async file => app.vault.read(file)))`
   - `Promise.all(allFiles.map(file => app.vault.cachedRead(file)))`
   - `Promise.all(app.vault.getFiles().map(file => app.vault.read(file)))`
   - `Promise.all(app.vault.getMarkdownFiles().map(file => app.vault.cachedRead(file)))`
4. The good fixture cases were not reported:
   - `Promise.all(chunk.map(file => app.vault.cachedRead(file)))` inside a
     chunked loop
   - `Promise.all(selectedFiles.map(file => app.vault.read(file)))`
   - explicit small arrays
   - `.map(...)` callbacks that only inspect file names
5. The expected file was updated and the query test passed.

## Verification

- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" query compile --additional-packs codeql\queries\javascript codeql\queries\javascript\vaultman\VirtualizerMissingItemKey.ql`
  passed.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\virtualizer-missing-item-key --threads=0`
  passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\trailing-debounce-explorer-refresh --threads=0`
  passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\unbounded-vault-read-promise-all --threads=0`
  passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests --threads=0`
  passed with 3 tests.

CodeQL on Windows repeatedly reported it could not clean up the generated
`.testproj` directories after successful test runs. The generated
`virtualizer-missing-item-key.testproj` and
`trailing-debounce-explorer-refresh.testproj` and
`unbounded-vault-read-promise-all.testproj` directories were removed manually
after verifying their resolved paths stayed inside their query test fixture
directories.

## Remaining Performance Lane

Recommended next slice:

- Switch from static guardrails back to runtime performance by implementing
  revision-gated explorer model caches for files, props, tags, content, queue,
  and filters.
