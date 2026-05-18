---
title: Source entrypoint lifecycle
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

# Source Entrypoint Lifecycle

## `src/pluginEntry.ts`

`pluginEntry.ts` is the Vite library entry from `vite.config.ts`. It has three
jobs:

```ts
import 'virtual:uno.css';
import './main.scss';

export { default } from './main';
```

This means runtime loading starts by including generated UnoCSS, loading the
SCSS tree, then exporting the default plugin class from `src/main.ts`.

## `src/main.ts`

`main.ts` exports `VaultmanPlugin extends Plugin` and then exports it as
default. It is the runtime container for the plugin:

| Runtime area | Evidence in `main.ts` | Connection |
| --- | --- | --- |
| Settings | imports `VaultmanSettings`, `DEFAULT_SETTINGS`, `VaultmanSettingsTab`; defines `loadSettings()` and `saveSettings()` | Bridges persistent plugin data to `typeSettings`, layout normalization, theme settings, and Settings UI. |
| Core services | constructs `FilterService`, `OperationQueueService`, `ThemeService`, `IconicService`, `ContextMenuService`, `ExplorerDataPlaneService`, etc. | Makes service instances available to frame/components through the plugin object. |
| Index services | creates files, tags, props, content, operations, active filters, snippets, plugins, templates indexes. | Builds data providers used by explorers and frame surfaces. |
| Obsidian events | registers metadata/vault `changed`, `create`, `delete`, `rename`, `resolved` callbacks. | Refreshes indexes and search/filter metadata when vault data changes. |
| UI view | registers `TYPE_FRAME_VM` as `VaultmanFrame`. | Opens the main Vaultman frame through Obsidian workspace leaves. |
| Detached tabs | loops `ALL_TAB_IDS`, registers `VaultmanTabLeafView` for each `viewTypeFor(tabId)`. | Allows independent leaf views for detachable tabs. |
| Commands | preserves legacy `apply-queue`; calls `registerVaultmanCommands`. | Connects Obsidian commands to frame hooks, queue, FnR, and active panel APIs. |
| Performance | creates `PerfMeter` marks and installs `createPerfProbe` globally. | Enables live scroll/performance smoke tooling. |
| Lifecycle cleanup | `onunload()` disposes theme, perf probe, ops log, and filter service. | Prevents long-lived runtime state from surviving plugin unload. |

## Onload Flow

```mermaid
flowchart TD
  onload["VaultmanPlugin.onload"] --> opsLog["OpsLogService.bind"]
  onload --> loadSettings["loadSettings"]
  loadSettings --> theme["ThemeService.hydrate"]
  theme --> indexes["create + refresh indexes"]
  indexes --> events["register metadata/vault refresh events"]
  events --> services["construct runtime services"]
  services --> childServices["addChild services"]
  childServices --> perfProbe["install perf probe"]
  perfProbe --> frameView["register vm-frame view"]
  frameView --> tabLeaves["register detachable tab view-types"]
  tabLeaves --> leafDetach["LeafDetachService.load/restore"]
  leafDetach --> commands["legacy command + registerVaultmanCommands"]
  commands --> settingsTab["addSettingTab"]
  settingsTab --> layoutReady["workspace.onLayoutReady"]
```

## View Open Flow

```mermaid
sequenceDiagram
  participant User
  participant Plugin as VaultmanPlugin
  participant Workspace as Obsidian workspace
  participant Frame as VaultmanFrame
  participant UI as frameVaultman.svelte

  User->>Plugin: ribbon/command/toggleView
  Plugin->>Workspace: get or create leaf
  Plugin->>Workspace: setViewState(TYPE_FRAME_VM)
  Workspace->>Frame: instantiate ItemView
  Frame->>UI: mount Svelte frame with plugin prop
```

## Settings Flow

`loadSettings()` deep-copies `DEFAULT_SETTINGS`, overlays saved data, resolves
layout settings through `resolveLayoutSettings()`, normalizes elastic UI
settings, and runs a one-time tab-label migration.

`saveSettings()` writes active theme preset/custom preset state back into
`settings.elasticUi` before `saveData()`. This means `ThemeService` is not only
visual state; it is part of persisted settings.
