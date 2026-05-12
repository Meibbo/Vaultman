---
title: Product runtime foundations
type: research
status: active
parent: "[[docs/work/hardening/research/2026-05-12-library-usage-inventory/index|Library usage inventory]]"
created: 2026-05-12T00:00:00
updated: 2026-05-12T00:00:00
tags:
  - agent/work
  - initiative/hardening
  - research/dependencies
  - codebase/runtime
created_by: codex
updated_by: codex
---

# Product Runtime Foundations

This shard covers foundational platform dependencies: `obsidian` and `svelte`.
Feature-specific product libraries are covered in
[[docs/work/hardening/research/2026-05-12-library-usage-inventory/01a-product-feature-libraries|01a - Product feature libraries]].

## `obsidian`

Purpose: host API for the Obsidian plugin runtime. Vaultman uses it for plugin
lifecycle, vault/file abstractions, workspace integration, settings tabs,
notices, modals, DOM helpers, markdown rendering, and type contracts such as
`TFile`, `TFolder`, and `TAbstractFile`.

Primary users:

- Plugin entry and settings:
  - `src/main.ts`
  - `src/settingsVM.ts`
- Explorer and workspace UI:
  - `src/components/views/viewTree.svelte`
  - `src/components/views/viewGrid.svelte`
  - `src/components/views/viewList.svelte`
  - `src/components/views/ViewNodeCards.svelte`
  - `src/components/views/ViewNodeGrid.svelte`
  - `src/components/views/ViewNodeTable.svelte`
  - `src/components/views/ViewSvarFileManager.svelte`
  - `src/components/layout/frameVaultman.svelte`
  - `src/components/layout/panelExplorer.svelte`
- Pages, tabs, and overlays:
  - `src/components/pages/pageFilters.svelte`
  - `src/components/pages/pageStats.svelte`
  - `src/components/tabs/tabAbout.svelte`
  - `src/components/tabs/tabSettings.svelte`
  - `src/components/overlays/vmDialog.svelte`
  - `src/components/overlays/vmPopover.svelte`
- Providers, services, and adapters:
  - `src/providers/*`
  - `src/services/serviceVault.ts`
  - `src/services/serviceVfs.ts`
  - `src/services/serviceVfsAdapter.ts`
  - `src/services/serviceSearch.ts`
  - `src/services/serviceViews.svelte.ts`
  - `src/services/serviceQueue.svelte.ts`
  - `src/services/serviceBasesInterop.ts`
  - `src/services/serviceFileSystemOps.ts`
  - `src/services/serviceContextMenu.ts`
- Modals, helpers, and types:
  - `src/modals/*`
  - `src/utils/*`
  - `src/types/*`

Interpretation: this is a foundational dependency. It should be treated as the
external platform contract, not as a removable UI library.

## `svelte`

Purpose: component framework and runtime/compiler contract for Vaultman's UI.
The project uses Svelte components plus Svelte 5-style `.svelte.ts` service
modules for reactive state.

Primary users:

- All Svelte components under `src/components/**/*.svelte`.
- Reactive service modules including:
  - `src/services/serviceQueue.svelte.ts`
  - `src/services/serviceSelection.svelte.ts`
  - `src/services/serviceViews.svelte.ts`
- Component tests under `test/component/**/*.test.ts`.

Interpretation: Svelte is both the UI authoring model and part of the build
pipeline. Component source depends on it even when a file has no explicit
`import 'svelte'` line, because `.svelte` files are compiled by the Svelte
compiler.
