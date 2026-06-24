---
title: Node notes NN-2 plugins explorer implementation plan
type: implementation-plan
status: done
parent: "[[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|node-notes-next-priority]]"
created: 2026-05-09T07:52:02
updated: 2026-05-09T08:11:56
tags:
  - agent/plan
  - vaultman/node-binding
  - vaultman/page-tools
  - vaultman/plugins
created_by: codex
updated_by: codex
---

# Node Notes NN-2 Plugins Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven-development for
> each product-code step. This plan is executed inline because the user already
> requested the next cut.

Goal: add a `pageTools` plugins explorer that lists community plugins, exposes
enabled/disabled state through a guarded toggle, and routes binding notes
through the `%pluginId` alias contract established in NN-0.

Status: done 2026-05-09T08:11:56.

Architecture: keep plugin state discovery in `createCommunityPluginsIndex(app)`,
Obsidian private API calls in `typeObsidian.ts`, provider behavior in
`explorerPlugins`, and Svelte shell wiring in `tabPlugins.svelte` plus
`pageTools.svelte`. The provider must fail closed for Vaultman itself: it can
display the row, but it must not disable the running plugin.

Tech stack: TypeScript, Svelte 5 runes, existing `PanelExplorer`, Vitest unit
and component suites.

## Outcome

- `createCommunityPluginsIndex(app)` now reads community plugin manifests,
  enabled state, loaded runtime state, and optional manifest metadata.
- `setCommunityPluginEnabled(app, id, enabled)` centralizes the Obsidian private
  enable/disable calls and fails closed when the relevant method is absent.
- `explorerPlugins` renders community plugin rows in `pageTools`, toggles
  enabled state for non-Vaultman plugins, refuses to disable the running
  Vaultman plugin, and registers `plugin.bindingNote`.
- `tabPlugins.svelte` is wired into `pageTools` and `TTabs`.
- Plugin binding notes pass `{ kind: 'plugin', label: name, pluginId }`, so the
  binding-note token remains `%pluginId`.

## File Map

- Modify `src/types/typeContracts.ts`: add `PluginNode` and
  `ICommunityPluginsIndex`.
- Modify `src/types/typeNode.ts`: add `PluginMeta`.
- Modify `src/types/typeCtxMenu.ts`: add `plugin` panel node type.
- Modify `src/types/typeObsidian.ts`: add `setCommunityPluginEnabled(app, id,
  enabled)` wrapper.
- Create `src/index/indexPlugins.ts`: build `PluginNode[]` from
  `app.plugins.manifests`, `enabledPlugins`, and loaded runtime plugin state.
- Modify `src/main.ts`: add `pluginsIndex` service and refresh it on boot.
- Create `src/providers/explorerPlugins.ts`: provider over
  `plugin.pluginsIndex`, search/sort, guarded toggle badge, and binding-note
  context action.
- Create `src/components/containers/explorerPlugins.ts`: compatibility export.
- Create `src/components/pages/tabPlugins.svelte`: Svelte tab wrapper that
  mounts `PanelExplorer`.
- Modify `src/types/typeTab.ts`: add `plugins` to `TTabs`.
- Modify `src/components/pages/pageTools.svelte`: render `tabPlugins` for the
  `plugins` tab.
- Modify `src/index/i18n/en.ts` and `src/index/i18n/es.ts`: add tab labels.
- Create `test/unit/services/servicePluginsIndex.test.ts`.
- Extend `test/unit/types/typeObsidian.test.ts`.
- Create `test/unit/components/explorerPlugins.test.ts`.
- Create `test/component/pageToolsPlugins.test.ts`.

## Tasks

1. Red plugin index tests:
   - Build sorted plugin nodes from `app.plugins.manifests`.
   - Carry `enabled` from `enabledPlugins`.
   - Carry `loaded` from `app.plugins.plugins[id]._loaded`.
   - Preserve optional manifest metadata: `version`, `author`, `description`,
     and `isDesktopOnly`.

2. Green plugin index:
   - Add `PluginNode` / `ICommunityPluginsIndex`.
   - Add `createCommunityPluginsIndex(app)` using `getCommunityPlugins(app)`.
   - Sort by display name, then stable `pluginId`.

3. Red Obsidian wrapper tests:
   - Enabling calls `enablePluginAndSave(id)` when present.
   - Disabling calls `disablePluginAndSave(id)` when present.
   - Missing private toggle surface returns `false`.

4. Green Obsidian wrapper:
   - Implement `setCommunityPluginEnabled(app, id, enabled)`.
   - Prefer `enablePluginAndSave` for enabling; fall back to `enablePlugin`.
   - Use `disablePluginAndSave` for disabling.

5. Red provider tests:
   - `explorerPlugins.getTree()` maps nodes to rows with plugin icon,
     enabled/off state, and plugin metadata.
   - Toggle badge calls `setCommunityPluginEnabled(plugin.app, pluginId, next)`
     and refreshes `pluginsIndex`.
   - Vaultman self row exposes a non-actionable guarded badge and never calls
     the toggle wrapper.
   - `plugin.bindingNote` calls `nodeBindingService.bindOrCreate({ kind:
     'plugin', label: name, pluginId })`.

6. Green provider:
   - Subscribe to `pluginsIndex` and expose provider `subscribe()` like
     `explorerSnippets`.
   - Implement search, sort, panel context menu, `getNodeType() -> 'plugin'`,
     guarded toggle, and binding-note action.

7. Red component tests:
   - `TTabs` contains `plugins`.
   - Clicking the plugins tab displays `.vm-plugins-tab-content` and renders
     plugin rows.
   - Clicking an external plugin toggle updates the visible row after
     `pluginsIndex.refresh()`.

8. Green Svelte wiring:
   - Add `tabPlugins.svelte` following `tabSnippets.svelte`.
   - Add `plugins` tab route in `pageTools.svelte`.
   - Add i18n tab labels.

9. Verification:
   - Run Svelte autofixer on `tabPlugins.svelte` and modified Svelte files.
   - Run focused unit/component tests.
   - Run `pnpm run check`, `pnpm run lint`, `pnpm run build`, and
     `git diff --check`.

## Verification Result

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/servicePluginsIndex.test.ts test/unit/services/serviceSnippetsIndex.test.ts test/unit/types/typeObsidian.test.ts test/unit/components/explorerPlugins.test.ts test/unit/components/explorerSnippets.test.ts test/unit/services/serviceNodeBinding.test.ts`
  passed with 6 files and 30 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageToolsPlugins.test.ts test/component/pageToolsSnippets.test.ts --fileParallelism=false`
  passed with 2 files and 6 tests.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run build` passed and synced Vite+ build artifacts.
- `git diff --check` exited 0; Git only reported line-ending normalization
  warnings for modified files.
