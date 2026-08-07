---
title: "PV13-006 — views.tsx, stack-island.tsx, control-island.tsx"
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-07T00:00:00
updated_by: deepseek-v4-flash-free
created_by: deepseek-v4-flash-free
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, modules, views, islands]
---

# PV13-006 — `views.tsx`, `stack-island.tsx`, `control-island.tsx`

## What to build

Portar los tres módulos de render/islands al árbol `src/proto/` siguiendo el grafo de imports del plan: `views.tsx` (renderers de vista), `stack-island.tsx` (el mayor, 1703 líneas: IslandsV4, SettingsPanelV4, engines) y `control-island.tsx` (ControlFab/Island, THEMES, ACCENT_PRESETS).

## Acceptance criteria

- [ ] `views.tsx`: exports `vmGetSizes`, `ManualMasonry`, `FlatList`, `WidgetsGrid`, `DataTable`, `DataChart`, `RecordForm`, `GraphCanvas`, `MindmapCanvas`, `JsonCanvas`, `MasonryGrid`, `W` (wrapper wheel), `CanvasViewport`, `ViewNodeIcon`. Los listeners `wheel`/`scroll` de la fuente (líneas 71/161/164/254/257) se mantienen sobre elementos propios (NO globales).
- [ ] `stack-island.tsx`: imports ES de `data` (OPERATORS) y `views` (vmGetSizes); `const { useState: useStateV4, ... } = React` → named imports con alias; exports de la tabla del index (StackIsland, StackRow, StackGroup, FiltersIslandV4, QueueIslandV4, ViewIslandV4, SortIslandV4, SettingsPanelV4, AZIndexOverlay, newRowId, newGroupId, VM_ENGINES, vmEngineOf, DEFAULT_VIEW, DEFAULT_SORT, vmRenderKey, ACTION_META, ACTION_KINDS, FL_MIN_W, FL_MINI_W, NODE_PX).
- [ ] `control-island.tsx`: exports `ControlFab`, `ControlIsland`, `THEMES`, `ACCENT_PRESETS`, `resolveAccent`; `SettingsPanelV4` lazy desde `./stack-island`; `Icon` desde `./icons`; el `onClick` con `window.dispatchEvent('vm-surface-action')` (línea 110) se migra a `protoBus.emit('vm-surface-action', …)`.
- [ ] Los drags de `window` (stack 53/57, 78/84, 104/109) se conservan durante este issue (aislamiento final en PV13-011), documentados.
- [ ] Tras cada módulo: `npm run build` verde. Cierre: build + lint exit 0.

## Blocked by

- PV13-005 (icons/nautilus).