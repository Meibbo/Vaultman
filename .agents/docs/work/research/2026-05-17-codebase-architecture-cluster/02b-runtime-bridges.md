---
title: Runtime bridges
type: research
status: draft
parent: "[[docs/work/research/2026-05-17-codebase-architecture-cluster/02-src-runtime-spine|source-runtime-spine]]"
created: 2026-05-17T13:45:00
updated: 2026-05-17T13:45:00
tags:
  - agent/research
  - architecture
  - codebase
created_by: codex
updated_by: codex
---

# Runtime Bridges

## Bridge Inventory

| Bridge | Role | Runtime connection |
| --- | --- | --- |
| `src/types/typeFrame.ts` | Obsidian `ItemView` wrapper for the main Vaultman frame. | Registers `TYPE_FRAME_VM = 'vm-frame'`; mounts `frameVaultman.svelte` with `{ plugin }`; unmounts on close. |
| `src/components/frame/frameVaultman.svelte` | Main Svelte frame shell. | Receives the plugin object and coordinates page order, nav, overlays, frame tabs, filters search state, queue/diff hooks, and layout surfaces. |
| `src/types/typeTabLeaf.ts` | Obsidian `ItemView` wrapper for detachable tab leaves. | Uses `viewTypeFor(tabId)`; mounts `DetachedTabHost.svelte` with `{ plugin, tabId }`. |
| `src/components/frame/DetachedTabHost.svelte` | Host for detached tabs. | Maps canonical `TabId` back to tab/page content and reuses Filters search state where needed. |
| `src/registry/tabRegistry.ts` | Canonical tab identity registry. | Defines `TabId`, `ALL_TAB_IDS`, `DETACHABLE`, `viewTypeFor`, `tabIdFromInner`, and `innerFromTabId`. |
| `src/services/serviceCommands.ts` | Command registration bridge. | Exports command ids and `registerVaultmanCommands()`, wiring Obsidian commands to queue, frame hooks, FnR service, panel APIs, and perf marks. |
| `src/settingsVM.ts` | Settings tab wrapper. | Mounts `SettingsUI.svelte` into Obsidian settings using the plugin object. |
| `src/types/typeSettings.ts` | Settings schema and defaults. | Defines `VaultmanSettings`, `iVaultmanPlugin`, and `DEFAULT_SETTINGS`; imports layout defaults, mouse config, operation scope, elastic UI defaults. |
| `src/types/typeContracts.ts` | Cross-layer interfaces. | Defines index node shapes, service contracts, overlay contracts, router contracts, and explorer interface. |
| `src/services/serviceLayout.ts` | Layout model and drop actions. | Defines layout settings, resolves raw settings, and applies detach/attach/reorder drop actions. |
| `src/services/serviceTheme.svelte.ts` | Theme preset runtime state. | Hydrates active preset/custom presets and is persisted by `saveSettings()`. |
| `src/dev/perfProbe.ts` | Runtime performance probe. | Installs global `__vaultmanPerfProbe` used by scroll smoke scripts and live diagnostics. |

## UI Bridge Flow

```mermaid
flowchart LR
  main["main.ts"] --> typeFrame["typeFrame.ts\nVaultmanFrame"]
  typeFrame --> frameUi["frameVaultman.svelte"]
  frameUi --> framePages["framePages / overlays / viewport / nav reorder"]
  frameUi --> pageFilters["FiltersPage + Toolbar"]
  frameUi --> pageTools["Tools page"]
  frameUi --> queue["Queue/Diff surfaces"]

  main --> typeTabLeaf["typeTabLeaf.ts\nVaultmanTabLeafView"]
  typeTabLeaf --> detachedHost["DetachedTabHost.svelte"]
  detachedHost --> tabRegistry["tabRegistry.ts"]
```

`main.ts` never mounts `frameVaultman.svelte` directly. It registers an
Obsidian view class. The view class owns Svelte mount/unmount. This keeps
Obsidian workspace lifecycle separate from Svelte component lifecycle.

## Command Bridge Flow

```mermaid
flowchart TD
  main["main.ts"] --> commands["registerVaultmanCommands"]
  commands --> queue["queueService"]
  commands --> view["activateView / toggleView"]
  commands --> leaf["getVaultmanLeaf"]
  commands --> fnr["activeFnRIslandService"]
  commands --> panel["activePanelExplorerApi"]
  commands --> hooks["frame hooks\nfilters/queue/view/sort/diff"]
  frame["frameVaultman.svelte"] --> hooks
  toolbar["Toolbar.svelte via FiltersPage"] --> hooks
```

The command bridge is deliberately callback-based. `main.ts` owns command
registration, but frame/toolbar components populate hooks so commands can
operate on the currently mounted UI without hard subscriptions.

## Settings And Theme Bridge

```mermaid
flowchart LR
  defaults["DEFAULT_SETTINGS"] --> load["loadSettings"]
  saved["plugin loadData"] --> load
  load --> layout["resolveLayoutSettings"]
  load --> elastic["normalizeElasticUiSettings"]
  load --> theme["ThemeService.hydrate"]
  theme --> save["saveSettings"]
  save --> data["plugin saveData"]
  settingsTab["VaultmanSettingsTab"] --> settingsUi["SettingsUI.svelte"]
  settingsUi --> save
```

Settings have three bridge points: static defaults, runtime normalization, and
Svelte settings UI. Theme state also participates in persistence, so style
maps should treat theme as runtime state rather than only SCSS.

## Contracts Bridge

`typeContracts.ts` is the cross-layer vocabulary that keeps providers,
services, explorers, overlays, and operations from using component-specific
types directly. It defines:

- node interfaces for files, tags, props, content, queue changes, active
  filters, snippets, plugins, templates, and Bases import targets;
- index interfaces such as `IFilesIndex`, `ITagsIndex`, `IPropsIndex`,
  `IContentIndex`, `IOperationsIndex`, and `IActiveFiltersIndex`;
- service interfaces for filters, queue, decorations, routing, overlays, and
  explorers.

Later maps for providers/services should attach to these interfaces first,
then to concrete implementations.
