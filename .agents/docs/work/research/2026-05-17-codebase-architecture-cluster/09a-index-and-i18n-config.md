---
title: Index i18n and config
type: research-shard
status: complete
parent: "[[09-residual-src-support-layer|Residual src support layer]]"
created: 2026-05-17T18:55:00
updated: 2026-05-17T18:55:00
tags:
  - agent/research
  - architecture
  - index
  - i18n
  - config
created_by: codex
updated_by: codex
---

# Index I18n And Config

## `createNodeIndex`

`src/index/indexNodeCreate.ts` is the generic read-model factory.

- IN: `INodeIndex`, `NodeBase`, optional `getActivePerfProbe`.
- OUT: `nodes`, `flatIds`, `revision`, `refresh`, `subscribe`, `byId`, and `getSearchBuffer`.
- Data flow: `opts.build()` -> normalized search buffers -> revision increment -> subscriber notification.
- Guardrail: `refreshVersion` drops stale async refreshes.

## Index Factories

| File | Source dependency | Output contract |
| --- | --- | --- |
| `indexFiles.ts` | `app.vault.getFiles()` or Markdown fallback | File nodes by path. |
| `indexProps.ts` | `metadataCache.getFileCache(file).frontmatter` | Property nodes with values, frequencies, and file counts. |
| `indexTags.ts` | `metadataCache.getTags()` or manual cache scan | Tag nodes with counts and parent tags. |
| `indexOperations.ts` | queue pending changes or transactions | Queue change nodes grouped by operation kind. |
| `indexActiveFilters.ts` | filter service tree plus search rules | Active filter entries. |
| `indexPlugins.ts` | Obsidian community plugin manager internals | Plugin nodes with enabled/loaded state. |
| `indexSnippets.ts` | custom CSS service or adapter folder listing | CSS snippet nodes with enabled state. |
| `indexBasesImportTargets.ts` | `.base` files and Markdown base fences | Compatible Bases import target nodes. |

## Specialized Indexes

`indexContent.ts` does not reuse `createNodeIndex`. It needs async content search state:

- Query state and `setQuery`.
- Empty/scanning/done `ContentSearchStatus`.
- `ServiceCache` keyed by query plus vault fingerprint.
- Chunked `cachedRead` over Markdown files with periodic publishing.
- `activeWindow.setTimeout(..., 0)` yielding between batches.

`utilPropIndex.ts` is a component-backed live property index:

- Loads on plugin startup from all Markdown frontmatter.
- Listens to metadata `resolved` and `changed`, plus vault `delete` and `create`.
- Debounces changed-file flushes by 50 ms.
- Keeps values monotonically between full rebuilds after deletes, which is acceptable for autocomplete according to its source comment.

## i18n

`src/index/i18n/lang.ts` imports `en` and `es`, but `currentLang` is hard-coded to `en`. `translate(key, vars)` falls back to English and then the raw key, and performs simple `{placeholder}` replacement.

## Theme Config

`src/config/themePresetsBuiltin.ts` exports:

- `PRESET_NATIVE`: core-like Explorer, hidden dock/tabs, core toolbar, tree view only, locked node-element visibility.
- `PRESET_VAULTMAN`: full plugin layout, bar dock, top tabs, full toolbar, all primary view modes, unlocked node-element visibility.
- `BUILT_IN_PRESETS`: ordered as `native`, then `vaultman`.

`src/services/serviceTheme.svelte.ts` consumes this config and appends custom presets.

## Test Coverage

Relevant tests include `createNodeIndex`, all service index suites, content index, Bases import targets, plugin/snippet indexes, `utilPropIndex`, theme presets, and theme settings synchronization.
