---
title: Detachable layout workspace tabs implementation
type: implementation-plan
status: draft
parent: "[[docs/work/polish/specs/2026-05-11-detachable-layout-workspace-tabs/index|detachable layout workspace tabs]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T00:00:00
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

