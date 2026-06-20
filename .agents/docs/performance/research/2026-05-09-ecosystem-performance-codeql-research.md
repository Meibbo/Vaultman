---
title: Ecosystem performance and CodeQL guardrail research
type: research
status: done
created: 2026-05-09T15:20:00
updated: 2026-05-09T15:42:00
tags:
  - agent/performance
  - vaultman/viewtree
  - vaultman/codeql
  - vaultman/research
created_by: codex
updated_by: codex
---

# Ecosystem Performance And CodeQL Guardrail Research

## Scope

The user asked for comparative research on repositories and libraries in the
same problem space as Vaultman, with emphasis on performance learnings for
explorers and `viewTree`, plus CodeQL tests/queries worth adding because the
repository already has CodeQL in CI.

Local baseline observed on 2026-05-09:

- `package.json` describes Vaultman as an Obsidian bulk data and metadata
  editor, with Svelte 5, `@tanstack/svelte-virtual`, `@tanstack/table-core`,
  Vitest, WDIO/Obsidian integration tooling, and existing unit/component
  performance probes.
- `.github/workflows/codeql.yml` already runs `github/codeql-action` v4 for
  `javascript-typescript` with `security-extended,security-and-quality`.
- CodeQL CLI is installed locally, but this PowerShell session did not inherit
  it in `PATH`. Verified executable:
  `C:\Users\vic_A\codeql-home\codeql\codeql.exe`, version 2.25.3. The
  Antigravity CodeQL extension also has a bundled distribution at
  `C:\Users\vic_A\AppData\Roaming\Antigravity\User\globalStorage\github.vscode-codeql\distribution1\codeql\codeql.exe`.
- Hot local surfaces for this research are `src/components/views/viewTree.svelte`,
  `src/services/serviceViews.svelte.ts`, `src/services/serviceFilter.svelte.ts`,
  the explorer providers, and `test/unit/performance/stress.test.ts`.

## Comparative Findings

| Source | Performance pattern | Vaultman takeaway |
| --- | --- | --- |
| Dataview | Maintains a central `FullIndex` with separate page/tag/link/prefix/CSV indexes, a monotonic revision, IndexedDB-backed startup cache, and a limited worker importer for markdown parsing. | Add revisioned index contracts and persistent startup snapshots. Views should consume index revisions, not rebuild on every event. Tree/folder lookup should use a prefix/folder index instead of rebuilding hierarchy from all files. |
| Metadata Menu | Coalesces changed files and waits for Obsidian metadata resolution before heavy indexing; uses exclusion settings for folders/extensions/regexes; falls back to direct single-file parsing when a write path needs fresh data. | Treat `metadataCache.changed` as a dirty signal, not a full rebuild command. Add first-class exclusion filters and a changed-path set. For edits, parse the touched file directly rather than waiting on global metadata. |
| Omnisearch | Stores a MiniSearch index and indexed document metadata in Dexie/IndexedDB, keyed by path and mtime; reindexes only deltas; chunks indexing; limits expensive post-processing to the top result window. | Content search should become a delta-indexed lane. Do not re-read/re-score the vault on every search. Cap snippet/highlight work after ranking, not before. |
| Obsidian Tasks | Its query language has an explicit `limit`; docs warn that rendering hundreds or thousands of task results slows Obsidian editing. Query execution filters and sorts, then slices before grouping. | Explorer views need hard render/result budgets. Expensive grouping, badges, and decoration should run on bounded windows or cached rows. |
| TanStack Virtual | The virtualizer supports stable item keys, measured rows, overscan tuning, and scroll-state debouncing. Docs recommend configuring item keys instead of relying on index defaults. | `viewTree` currently uses `virtualRow.key` but does not configure `getItemKey`; default index keys can increase DOM churn when expand/collapse shifts rows. Use node IDs as virtual item keys and test remount/key churn. |
| Svelte 5 | `$state` deeply proxies arrays/objects, while `$state.raw` avoids deep proxying for large immutable/reassigned data. Keyed each blocks let Svelte insert/move/delete DOM more surgically. | Large explorer arrays, snapshots, and render models should be plain or `$state.raw` unless mutated deeply. Keep keyed each blocks by durable node IDs. Prefer `$derived` for pure computations, but cache large derivations by revision. |
| MiniSearch | `addAllAsync` indexes in chunks to avoid blocking; `loadJSONAsync` deserializes large indexes in batches; vacuuming is batched. | If Vaultman adds persistent content search, prefer async/chunked indexing and async index load on startup. |
| Dexie | `bulkPut()` is faster than repeated `put()` for large writes, and transactions are needed when partial persistence on failure is unacceptable. | Persistent index snapshots should use bulk writes in transactions, with schema/version/settings hashes as invalidation keys. |
| Obsidian MetadataCache | `changed` fires when a file has been indexed; `changed` is not a rename signal; `resolve`/`resolved` communicate link resolution progress/completion. | Index refresh scheduling must listen to both metadata and vault rename/delete/create events. Heavy metadata rebuilds should prefer the resolved/idle boundary. |

## Prioritized Performance Opportunities

1. Add `getItemKey` to TanStack virtualizers in `viewTree`, `ViewNodeGrid`, and
   `ViewNodeTable`, using durable node/row IDs. This is the most direct library
   compliance gap in `viewTree`.
2. Introduce revisioned provider/index contracts:
   `filesRevision`, `propsRevision`, `tagsRevision`, `contentRevision`,
   `queueRevision`, and `filterRevision`. Cache render models by those revisions
   instead of object identity alone.
3. Split tree flattening from visual state. `viewTree.flatten` should depend on
   tree nodes plus expanded-set revision, not hover badges, selection, focus, or
   queue badge churn.
4. Cache folder/prefix hierarchy in the files index. Full tree reconstruction
   from all file paths should not be on the common render path.
5. Use leading UI refresh plus trailing coalescing for responsiveness, but move
   heavy metadata/index refresh to metadata-resolved/idle batches. More debounce
   fixes CPU but reintroduces the latency regression the user noticed.
6. Add persistent startup snapshots for props/tags/file hierarchy first. Content
   indexing can follow if content search remains a bottleneck.
7. Add exclusion settings for ignored folders/extensions/path regexes so big
   generated or plugin folders never enter core explorer indexes.
8. Make content search delta-indexed by path and mtime, with chunked async
   indexing and top-N post-processing for snippets/highlights.
9. Keep performance tests structural where possible. Wall-clock budgets are
   useful as smoke alarms but should be coarse because CI machines vary.
10. Extend `PerfMeter`/`perfProbe` labels around `viewService.getModel`,
    `viewTree.flatten`, provider `getTree`, filter evaluation, content query,
    and virtual scroll windows so regressions are attributable.

## Test Ideas For Runtime Performance

- `viewTree` mounted virtual key test: expand/collapse a large tree and assert
  virtual rows keep durable node keys instead of index keys.
- `viewTree` flatten memo test: selection/focus/hover badge changes should not
  increment `viewTree.flatten` when nodes and expanded revision are unchanged.
- `ViewService` model cache test: unchanged provider/filter/queue revisions
  return cached decoration indexes; changed selection should not force semantic
  layer recomputation for every row.
- Metadata burst test: many `metadataCache.changed` events produce one heavy
  props/tags refresh after the resolved/idle boundary.
- Files hierarchy delta test: create/rename/delete updates affected folder
  branches without rebuilding all 10k file nodes.
- Content search delta test: changing one file reindexes one path, not the whole
  vault, and snippets are generated only for the top result window.
- Persistent snapshot startup test: unchanged path/mtime/schema loads from cache
  without vault reads; schema/settings change invalidates the snapshot.
- Large-vault smoke budgets: keep broad elapsed assertions coarse, but assert
  counts such as full-vault reads, model rebuilds, flatten calls, and index
  refreshes precisely.

## CodeQL Guardrails

CodeQL is not a latency benchmark runner. Its best use here is static regression
prevention: catch code shapes that have repeatedly caused slow explorers, hidden
async work, or unsafe user-input handling.

Recommended custom queries:

| Query | What it catches | Why it matters |
| --- | --- | --- |
| `vaultman/trailing-debounce-explorer-refresh` | `debounce(...)` or raw `setTimeout(...)` in explorer refresh and metadata event paths when `leadingDebounce` or an approved scheduler is required. | Prevents the Gemini-style visible latency regression from returning. |
| `vaultman/virtualizer-missing-item-key` | `createVirtualizer(...)` calls in view components without `getItemKey`. | Enforces TanStack key requirements for stable large trees/tables/grids. |
| `vaultman/unbounded-vault-read-promise-all` | `Promise.all(files.map(... vault.read/cachedRead ...))` outside an approved chunker/pool helper. | Prevents all-vault read storms and UI stalls. |
| `vaultman/full-vault-scan-in-render-path` | Calls to `getMarkdownFiles()`, `getFiles()`, or full index scans from view/render/component paths. | Keeps render paths on cached indexes rather than live vault traversal. |
| `vaultman/for-each-async` | `array.forEach(async ...)` and promise-returning callbacks ignored by `forEach`. | Avoids unawaited work, hidden failures, and uncontrolled concurrency. |
| `vaultman/raw-regexp-from-user-input` | `new RegExp(...)` from settings/search/template/modal data outside a safe compiler wrapper. | Complements CodeQL's regex/ReDoS coverage with Vaultman-specific sources. |
| `vaultman/dynamic-code-exec-in-fnr` | `eval`, `new Function`, dynamic `import`, or `require` in template/FnR/token code. | Locks down the token system's no-code-execution contract. |
| `vaultman/unsafe-html-sink` | `innerHTML`, `insertAdjacentHTML`, or raw HTML sinks outside approved rendering helpers. | Protects markdown/frontmatter-derived UI. |
| `vaultman/path-taint-to-adapter` | User-controlled settings/modal/filter text flowing to adapter/vault write/read/rename sinks without normalization. | Models Obsidian adapter APIs as path-injection sinks. |
| `vaultman/json-parse-vault-content-without-try` | `JSON.parse(...)` on vault/canvas/base content outside safe parser helpers. | Prevents one malformed vault file from crashing indexing. |
| `vaultman/no-metadata-trigger-private-api` | `metadataCache.trigger(...)` or private Obsidian API calls outside tests/mocks. | Keeps plugin behavior on public APIs and avoids brittle index hacks. |

Recommended CodeQL layout:

```text
codeql/
  queries/
    javascript/
      vaultman/
        qlpack.yml
        virtualizer-missing-item-key.ql
        trailing-debounce-explorer-refresh.ql
        unbounded-vault-read-promise-all.ql
        ...
  tests/
    javascript/
      vaultman/
        virtualizer-missing-item-key/
          virtualizer-missing-item-key.qlref
          virtualizer-missing-item-key.expected
          bad.ts
          good.ts
```

Recommended workflow shape:

- Keep the existing `security-extended` and `security-and-quality` suites.
- Add `.github/codeql/codeql-config.yml` and reference it via
  `github/codeql-action/init@v4` `config-file`.
- Put custom query paths in the config file with `queries: - uses: ./codeql/queries/...`.
- Add a separate CI job for query tests. Local command verified path pattern:
  `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run codeql/tests --threads=0`.
  For interactive shells that do not resolve `codeql`, prepend the CLI folder:
  `$env:PATH = "C:\Users\vic_A\codeql-home\codeql;$env:PATH"`.
- Use `.qlref` plus `.expected` files for each query test. CodeQL docs require
  consistent base names between `.ql`, `.qlref`, and `.expected` files.

## Source Links

- Dataview `FullIndex`:
  https://github.com/blacksmithgu/obsidian-dataview/blob/5ad0994ff384cbb797de382e7edff2388141b73a/src/data-index/index.ts
- Metadata Menu `FieldIndex`:
  https://github.com/mdelobelle/metadatamenu/blob/dc244cc9d274f26226b5a3fee640b9a64b5286d7/src/index/FieldIndex.ts
- Metadata Menu note parsing:
  https://github.com/mdelobelle/metadatamenu/blob/dc244cc9d274f26226b5a3fee640b9a64b5286d7/src/note/note.ts
- Omnisearch Dexie database:
  https://github.com/scambier/obsidian-omnisearch/blob/eb6bbd48873886e2daf58d0436d25be106a65ffc/src/database.ts
- Omnisearch search engine:
  https://github.com/scambier/obsidian-omnisearch/blob/eb6bbd48873886e2daf58d0436d25be106a65ffc/src/search/search-engine.ts
- Obsidian Tasks query implementation:
  https://github.com/obsidian-tasks-group/obsidian-tasks/blob/ba9f184d67042d494a30edc1f22148711c681252/src/Query/Query.ts
- Obsidian Tasks README performance note:
  https://github.com/obsidian-tasks-group/obsidian-tasks/blob/ba9f184d67042d494a30edc1f22148711c681252/README.md
- TanStack Virtual API:
  https://tanstack.com/virtual/latest/docs/api/virtualizer
- Svelte `$state` and keyed each docs:
  https://svelte.dev/docs/svelte/$state
  https://svelte.dev/docs/svelte/each
- MiniSearch API:
  https://lucaong.github.io/minisearch/classes/MiniSearch.MiniSearch.html
- Dexie `bulkPut`:
  https://old.dexie.org/docs/Table/Table.bulkPut()
- Obsidian MetadataCache:
  https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/MetadataCache/
- GitHub custom CodeQL queries:
  https://docs.github.com/en/code-security/concepts/code-scanning/codeql/custom-codeql-queries
- GitHub CodeQL workflow configuration:
  https://docs.github.com/en/code-security/reference/code-scanning/workflow-configuration-options
- CodeQL query tests:
  https://docs.github.com/en/enterprise-cloud@latest/code-security/how-tos/find-and-fix-code-vulnerabilities/scan-from-the-command-line/testing-custom-queries
