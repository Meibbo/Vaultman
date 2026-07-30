---
title: Node notes next-priority implementation order
type: backlog-priority
status: active
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/05-note-binding-and-set|binding notes and set]]"
created: 2026-05-09T03:42:43
updated: 2026-05-09T16:14:38
tags:
  - agent/backlog
  - vaultman/node-binding
  - vaultman/page-tools
  - priority/next
created_by: codex
updated_by: codex
---


# Node Notes Next-Priority Implementation Order

## Decision

Promote the node-notes addendum as the next implementation lane before the remaining post-cut-9 polish cuts and before TanStack table follow-up polish.

Reason: this work extends the already-shipped `NodeBindingService` while that context is fresh, gives the finished binding-note feature visible new surfaces, and directly answers the latest user request. The remaining cut ladder still matters, but most pending items are polish, audits, or broader holding cuts.

## Immediate Guardrail

Do not start product-code implementation until the current dirty worktree is understood. At the time this priority was recorded, unrelated modified/untracked files already existed outside this docs change.

## Ordered Node-Notes Cuts

### NN-0 - Contract Correction

Status: done 2026-05-09T05:44:04.

Scope:

- Update `NodeBindingService` tests for:
  - `snippet -> $snippetname`
  - `plugin -> %pluginname`
- Extend `BindingNodeKind` with `plugin`.
- Decide and encode canonical plugin token as `%${manifest.id}`.
- Add typed internal wrappers in `typeObsidian.ts` for `customCss` and community plugin controls.

Why first: every later UI path depends on these semantics.

Outcome:

- `computeAliasToken` now maps snippets to `$snippetname`.
- `BindingNodeKind` now includes `plugin`.
- Plugin binding tokens prefer stable manifest ids via `BindingNodeInput.pluginId`, producing `%pluginId`; label fallback remains available only when a manifest id is not supplied.
- `typeObsidian.ts` now centralizes typed wrappers for `customCss`, CSS snippet toggling/reload, community plugin manifests, enabled state, and loaded state.

Verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeBinding.test.ts test/unit/types/typeObsidian.test.ts` passed with 2 files and 17 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceContentIndex.test.ts test/unit/services/serviceTagsIndex.test.ts test/unit/services/serviceNodeBinding.test.ts test/unit/types/typeObsidian.test.ts` passed with 4 files and 29 tests.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run build` passed and synced Vite+ build artifacts.
- Scoped `git diff --check` over touched source/test/doc files exited 0.

Verification-adjacent cleanup:

- Restored `node_modules` with `CI=true pnpm install --frozen-lockfile` after stale local junctions pointed at missing `vite-plus`/`vitest` files. The lockfile did not change.
- Removed a stale unused `fileIndex` local from `indexContent.ts`.
- Replaced local raw metadata-cache `any` usage in `indexTags.ts` with a typed optional `getTags` view.
- Moved content-index yield timing to `activeWindow.setTimeout` for Obsidian popout compatibility.
- Updated `utilDebounce.ts` to use typed tuple args and `activeWindow` timers.
- Removed two unused test imports flagged by `vp lint`.
- Added `cachedRead` and a test `activeWindow` fallback to `test/helpers/obsidian-mocks.ts`.

### NN-1 - Snippets Explorer In pageTools

Status: done 2026-05-09T06:54:22.

Scope:

- Implement snippets index from `app.customCss.snippets`, with filesystem fallback over `.obsidian/snippets/*.css`.
- Add `explorerSnippets` provider.
- Add `tabSnippets.svelte` inside `pageTools`.
- Render the enabled/disabled toggle in the count-side slot.
- Wire binding-note action using `$snippetname`.

Why before plugins: snippet toggling is narrower than plugin toggling and uses an already-known Obsidian internal surface from MySnippets.

Outcome:

- `createCSSSnippetsIndex(app)` reads Obsidian `customCss.snippets`, carries enabled state, and falls back to `.obsidian/snippets/*.css`.
- `explorerSnippets` renders snippet rows in `pageTools`, toggles enabled state through the typed `customCss` wrapper, refreshes via provider subscriptions, and registers `snippet.bindingNote` for `$snippetname` notes.
- `tabSnippets.svelte` is wired into `pageTools` and `TTabs`.

Verification:

- Focused snippet/node-binding unit suites passed with 4 files and 22 tests.
- Focused `pageToolsSnippets` component suite passed with 1 file and 3 tests.
- `pnpm run check`, `pnpm run lint`, `pnpm run build`, and `git diff --check` passed; diff-check only emitted line-ending normalization warnings.

### NN-2 - Plugins Explorer In pageTools

Status: done 2026-05-09T08:11:56.

Scope:

- Implement plugins index from `app.plugins.manifests`.
- Add `explorerPlugins` provider.
- Add `tabPlugins.svelte` inside `pageTools`.
- Make binding-note action create/open `%pluginId` notes.
- Keep enable/disable guarded and explicit; never disable Vaultman itself.

Why after snippets: plugin controls mutate Obsidian state and need stricter guardrails.

Outcome:

- `createCommunityPluginsIndex(app)` reads `app.plugins.manifests`, enabled state, loaded state, and manifest metadata.
- `explorerPlugins` renders community plugins in `pageTools`, toggles external plugins through typed Obsidian wrappers, refuses to disable Vaultman itself, and registers `plugin.bindingNote` for `%pluginId` notes.
- `tabPlugins.svelte` is wired into `pageTools` and `TTabs`.

Verification:

- Focused plugin/snippet/node-binding unit suites passed with 6 files and 30 tests.
- Focused `pageToolsPlugins` plus `pageToolsSnippets` component suites passed with 2 files and 6 tests.
- `pnpm run check`, `pnpm run lint`, `pnpm run build`, and `git diff --check` passed; diff-check only emitted line-ending normalization warnings.

### NN-3 - PageStats Add-ons Note Preview

Status: done 2026-05-09T09:30:00.

Scope:

- Replace the Statistics left FAB stub with an add-ons island.
- Add `Open note` through a public `FuzzySuggestModal<TFile>`.
- Render selected note markdown in-frame with `MarkdownRenderer.render(app, markdown, host, file.path, component)`.
- Add `Show PageStats` to unload the render component and restore stats.

Why after pageTools explorers: this is independent, but it depends on the same "note as first-class in-frame surface" direction and should not block data provider work.

Outcome:

- Replaced the Statistics left FAB stub with `Open note` and `Show PageStats` states.
- Added a public `FuzzySuggestModal<TFile>` note picker.
- Rendered selected note markdown in-frame through Obsidian `MarkdownRenderer.render(...)` with an owned `Component` lifecycle.
- Added component coverage proving renderer invocation and unload behavior.

Verification:

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageStatsNotePreview.test.ts test/component/perfProbeDom.test.ts test/component/viewSvarFileManager.test.ts --fileParallelism=false` passed with 3 files and 9 tests.
- `pnpm run lint`, `pnpm run check`, and `pnpm run build` passed.
- Full performance/test repair record:
  [[docs/work/performance/research/2026-05-09-viewtree-latency-test-repair|ViewTree latency and performance-test repair]].

### NN-4 - Native Obsidian Surface Adapter

Status: done 2026-05-09T16:14:38.

Scope:

- Add Tag Wrangler-style Ctrl/Cmd/Alt/middle click handling for native tag and property tag surfaces.
- Add Folder Notes-style handling for file-explorer folders and breadcrumbs.
- Trigger hover previews with `workspace.trigger("hover-link", ...)`.
- Use capture handlers and prevent native behavior only after Vaultman handles

Continua en [[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index-shard-1|continuacion 1]].