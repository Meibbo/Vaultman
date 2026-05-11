---
title: Detachable layout workspace tabs implementation
type: implementation-plan
status: draft
parent: "[[docs/work/polish/specs/2026-05-11-detachable-layout-workspace-tabs/index|detachable layout workspace tabs]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T22:36:00
tags:
  - agent/plan
  - initiative/polish
  - workspace/layout
  - dock
  - dnd
created_by: codex
updated_by: codex
---

# Detachable Layout Workspace Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Vaultman detachable tabs behave as real workspace leaves, managed from `pageTools` Layout and coordinated through `serviceLayout` plus `serviceDnd`.

**Architecture:** Keep `serviceLeafDetach` as the low-level persisted leaf executor. Add layout-level action resolution to `serviceLayout`, add layout operations to `serviceDnd`, move detachable controls into `pageTools`, and replace `VaultmanTabLeafView` placeholder content with a focused detached tab host.

**Tech Stack:** Svelte 5 runes, Obsidian `WorkspaceLeaf`/`ItemView`, `@dnd-kit/svelte` adapter, Vitest unit/component tests, existing Vaultman layout and explorer services.

---

## Shards

- [[docs/work/polish/plans/2026-05-11-detachable-layout-workspace-tabs/01-foundation-and-page-tools|01 - Foundation and PageTools]]
- [[docs/work/polish/plans/2026-05-11-detachable-layout-workspace-tabs/02-detached-host-frame-dnd-verification|02 - Detached Host, Frame DnD, Verification]]

## File Structure

- Modify `src/services/serviceLayout.ts`: add pure detachable layout action resolution and a small controller facade.
- Modify `src/services/serviceDnd.ts`: extend semantic operations for layout tab movement.
- Modify `src/services/serviceLeafDetach.ts`: add subscription notifications so frame/pageTools can react to attach/detach state.
- Modify `src/main.ts`: pass `plugin` into `VaultmanTabLeafView`, route spawn/reveal helpers through existing host callbacks.
- Modify `src/types/typeTabLeaf.ts`: mount a real Svelte detached host and clean it up.
- Create `src/components/frame/DetachedTabHost.svelte`: focused shell for detached `page-tools`, filter explorer tabs, content, and queue.
- Create `src/components/pages/pageToolsLayout.svelte`: Layout tab content with curator plus detachable controls.
- Modify `src/components/pages/pageTools.svelte`: render `PageToolsLayout` in the `layout` tab.
- Modify `src/components/settings/SettingsUI.svelte`: remove the detachable leaf toggle from Settings.
- Modify `src/components/layout/navbarDock.svelte` and `src/components/layout/navbarTabs.svelte`: expose externally-mounted tab state and reveal-only selection.
- Modify `src/components/frame/frameVaultman.svelte`: compute detached tabs, pass external state to nav surfaces, reveal detached leaves on selection, and call layout actions for DnD outcomes.

## Execution Notes

- Use TDD. Every production change in the shards starts with a focused failing test.
- Preserve unrelated dirty worktree changes.
- Do not commit unless the user explicitly asks.
- Prefer public Obsidian workspace APIs. DOM interception is out of first-slice scope.
- Run Svelte autofixer for edited `.svelte` files before final verification.

## 2026-05-11 Live Smoke And Data-Type Fix

- Live Obsidian smoke ran against vault `C:\Users\vic_A\Desktop\vaultman` with
  Vaultman reloaded as `1.0.0-rc.2`.
- The active vault plugin folder `.obsidian/plugins/vaultman` did not receive
  artifacts from `scripts/sync-test-build.mjs`, so the smoke copied
  `main.js`, `manifest.json`, and `styles.css` there after `pnpm run build`.
- Smoke covered `page-tools` detach from `pageTools > Layout`, reveal from the
  frame `Operations` tab, attach back, Obsidian reload, and persisted restore.
- Runtime result after reload: one `vm-frame` leaf, one
  `vaultman-tab-page-tools` leaf, one detached host, one frame external
  placeholder, no duplicate in-frame content, and no captured Obsidian errors or
  console errors.
- The smoke exposed a DOM metadata regression: detached tab leaf containers
  rendered as `data-type="vaultman-tab-undefined"` even though the workspace
  leaf type was `vaultman-tab-page-tools`.
- Fix: `VaultmanTabLeafView.onOpen()` now resets `containerEl[data-type]` to
  `this.getViewType()` once `tabId` is available.
- Regression test:
  `test/component/detachedTabHost.test.ts` now covers the Obsidian
  constructor-time `getViewType()` pattern via the `ItemView` mock.
- Verification:
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/detachedTabHost.test.ts --fileParallelism=false`:
    red first on `vaultman-tab-undefined`, then pass 3/3 after the fix.
  - Detachable unit suite: 4 files, 30 tests pass.
  - Detachable component suite: 7 files, 28 tests pass.
  - `pnpm run check`: pass, `svelte-check found 0 errors and 0 warnings`.
  - `pnpm run build`: pass.
- Cleanup: the final live runtime was restored to attached state for
  `page-tools`; no detached `page-tools` leaves remained open.
