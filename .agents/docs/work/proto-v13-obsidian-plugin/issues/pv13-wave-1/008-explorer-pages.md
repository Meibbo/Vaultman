---
title: "PV13-008 — explorer.tsx, pages.tsx"
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
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, modules, explorer, pages]
---

# PV13-008 — `explorer.tsx`, `pages.tsx`

## What to build

Portar `explorer.jsx` (1.295 líneas; el más denso en interacciones/globales) y `pages.jsx` (StatsPage/FiltersPage/ToolsPage) al árbol `src/proto/`.

## Acceptance criteria

- [ ] `explorer.tsx`: `TAB_TREES`/`flattenTree`/`leavesOf` → import desde `./data`; components de `views` (ManualMasonry, FlatList, etc.) y de `nautilus` (NautilusIconsGrid, NautilusTilesList) y `vmGetSizes` → imports ES; los `window.addEventListener('vm-*')` (888/897/898/942 vm-icon-override, vm-redesign-cells, vm-cell-order, vm-focused-parent, vm-selmode) → `protoBus.on` con su cleanup; `useStateExp` de React → named imports; exports (TabExplorer, MillerColumns, MasterStoryView, DrillView, GridDrillView, AccordionsTreeRows, FlatTreeRows, TreeRows, NodeGlyph, CellMedia, CellContent, TREE_CELL_DEFS, TREE_CELL_ORDER, vmFirstChar, vmGroupKey, vmGroupList, MODIFIED_ORDER, vmIndexGlyph, vmShowLabel/Icon/Level/Media/Content, NIA_REVEAL, NODE_PX).
- [ ] Los drags window (204/207, 1228/1230) se conservan aquí (aislamiento en PV13-011).
- [ ] `pages.tsx`: `window.TAB_TREES` (392) → import; los `window.addEventListener('vm-selmode'/'vm-toggle-expand-all')` (374/403) → `protoBus.on`; dispatch de `vm-search-submit` (619) y `vm-selmode` (638) → `protoBus.emit`; `document.querySelector('.vm-tab-content')` (609) se conserva (aislamiento en PV13-011); exports `TabPill`, `StatsPage`, `FiltersPage`, `ToolsPage`, `buildCtxItems`.
- [ ] Tras cada módulo: `npm run build` verde. Cierre: build + lint exit 0.

## Blocked by

- PV13-006 (views/stack), PV13-007 (search disponible).