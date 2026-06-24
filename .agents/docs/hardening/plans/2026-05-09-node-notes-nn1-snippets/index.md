---
title: Node notes NN-1 snippets explorer implementation plan
type: implementation-plan
status: done
parent: "[[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|node-notes-next-priority]]"
created: 2026-05-09T06:24:21
updated: 2026-05-09T06:54:22
tags:
  - agent/plan
  - vaultman/node-binding
  - vaultman/page-tools
  - vaultman/snippets
created_by: codex
updated_by: codex
---

# Node Notes NN-1 Snippets Explorer Implementation Plan

Goal: add a `pageTools` snippets explorer that lists CSS snippets, exposes
enabled/disabled state as a row-side toggle, and routes binding notes through
the `$snippetname` alias contract established in NN-0.

Status: done 2026-05-09T06:54:22.

Architecture: keep the data boundary in `createCSSSnippetsIndex(app)`, provider
behavior in `explorerSnippets`, and Svelte shell wiring in `tabSnippets.svelte`
plus `pageTools.svelte`. Use `typeObsidian.ts` wrappers for Obsidian internal
`customCss`; fallback to `.obsidian/snippets/*.css` through the vault adapter.

Tech stack: TypeScript, Svelte 5 runes, existing `PanelExplorer`, Vitest unit
and component suites.

## Outcome

- `createCSSSnippetsIndex(app)` now reads Obsidian `customCss.snippets`, carries
  `enabledSnippets` state, and falls back to listing `.obsidian/snippets/*.css`
  through the vault adapter.
- `explorerSnippets` renders snippet rows in `PanelExplorer`, exposes an
  enabled/disabled quick-action toggle, and registers `snippet.bindingNote`
  using the NN-0 `$snippetname` alias contract.
- `pageTools` now has a `snippets` tab backed by `tabSnippets.svelte`.
- `PanelExplorer` now supports an optional provider `subscribe()` hook, allowing
  provider-owned indexes such as snippets to refresh visible rows after their
  source index changes.
- Component coverage verifies that toggling a snippet updates the visible row
  from `off` to `on` after `cssSnippetsIndex.refresh()`.

## File Map

- Modify `src/index/indexSnippets.ts`: build `SnippetNode[]` from
  `app.customCss.snippets`, with adapter fallback over the snippets folder.
- Modify `test/helpers/obsidian-mocks.ts`: add adapter `list` support for
  snippets fallback tests.
- Create `test/unit/services/serviceSnippetsIndex.test.ts`: red/green coverage
  for customCss source, enabled state, sorting, and filesystem fallback.
- Create `src/providers/explorerSnippets.ts`: provider over
  `plugin.cssSnippetsIndex`, search/sort, toggle badge, and binding-note
  context action.
- Create `src/components/containers/explorerSnippets.ts`: compatibility export.
- Modify `src/types/typeCtxMenu.ts`: add `snippet` panel node type.
- Modify `src/types/typeExplorer.ts` and
  `src/components/containers/panelExplorer.svelte`: add optional provider
  subscriptions for index-driven panel refreshes.
- Create `test/unit/components/explorerSnippets.test.ts`: red/green provider
  behavior, toggle refresh, and binding-note action.
- Create `src/components/pages/tabSnippets.svelte`: Svelte tab wrapper that
  mounts `PanelExplorer`.
- Modify `src/types/typeTab.ts`: add `snippets` to `TTabs`.
- Modify `src/components/pages/pageTools.svelte`: render `tabSnippets` for the
  `snippets` tab.
- Create `test/component/pageToolsSnippets.test.ts`: red/green tab visibility
  and mount behavior.
- Modify `src/main.ts`: pass `this.app` into `createCSSSnippetsIndex(this.app)`.
- Modify `src/index/i18n/en.ts` and `src/index/i18n/es.ts`: add labels for the
  snippets tab if needed by current UI/tests.

## Tasks

1. Red tests for `createCSSSnippetsIndex(app)`:
   - CustomCss source returns sorted nodes with `enabled` from
     `enabledSnippets`.
   - Fallback lists `${vault.configDir}/snippets/*.css`, strips `.css`, and
     marks nodes enabled from `enabledSnippets` when available.

2. Green `createCSSSnippetsIndex(app)`:
   - Prefer `getCustomCss(app)?.snippets` when non-empty.
   - Fallback to `app.vault.adapter.list(folder)` using
     `customCss.getSnippetsFolder?.()` or `${configDir}/snippets`.
   - Return `id: name`, `name`, `enabled`.

3. Red tests for `explorerSnippets`:
   - `getTree()` maps index nodes to `TreeNode` rows with icons and
     enabled/disabled count labels.
   - The quick-action badge toggles through `setCssSnippetEnabled`, then
     refreshes `cssSnippetsIndex`.
   - Context action `snippet.bindingNote` calls
     `nodeBindingService.bindOrCreate({ kind: 'snippet', label: name })`.

4. Green `explorerSnippets`:
   - Subscribe to `plugin.cssSnippetsIndex` for invalidation.
   - Implement `setSearchTerm`, `setSortBy`, no-op primary click, panel context
     menu, and `getNodeType() -> 'snippet'`.

5. Red component coverage for `pageTools` snippets tab:
   - `TTabs` contains `snippets`.
   - Clicking the snippets tab displays `.vm-snippets-tab-content` and renders
     snippet rows through `PanelExplorer`.

6. Green Svelte wiring:
   - Add `tabSnippets.svelte` following `tabTags.svelte` patterns.
   - Add `snippets` tab route in `pageTools.svelte`.
   - Keep row/toggle logic in the provider, not the component.

7. Verification:
   - Run Svelte autofixer on `tabSnippets.svelte` and modified Svelte files.
   - Run focused unit/component tests.
   - Run `pnpm run check`, `pnpm run lint`, `pnpm run build`, and scoped
     `git diff --check`.

## Verification Result

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceSnippetsIndex.test.ts test/unit/components/explorerSnippets.test.ts test/unit/services/serviceNodeBinding.test.ts test/unit/types/typeObsidian.test.ts`
  passed with 4 files and 22 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageToolsSnippets.test.ts --fileParallelism=false`
  passed with 1 file and 3 tests.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run build` passed and synced Vite+ build artifacts.
- `git diff --check` exited 0; Git only reported line-ending normalization
  warnings for modified files.
