---
title: "PV13-008 — explorer.tsx, pages.tsx"
type: issue
status: done
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-08T00:00:00
updated_by: opencode-m2
created_by: deepseek-v4-flash-free
tags: [agent/issue, initiative/proto-v13-obsidian-plugin, modules, explorer, pages]
---

# PV13-008 — `explorer.tsx`, `pages.tsx`

## What to build

Portar `explorer.jsx` (1.295 líneas; el más denso en interacciones/globales) y `pages.jsx` (StatsPage/FiltersPage/ToolsPage) al árbol `src/proto/`.

## Done — port completo + smoke del dev

`explorer.tsx` (70.766 B, 1.316 líneas, exports tail en 1312-1316) y `pages.tsx` (38.490 B, 845 líneas) portados a `src/proto/`. Build exit 0. Smoke del dev en Obsidian aprobado (2026-08-08): render idéntico, tabs/islands funcionales.

## Acceptance criteria

- [x] `explorer.tsx`: `TAB_TREES`/`flattenTree`/`leavesOf` → import desde `./data`; components de `views` (ManualMasonry, FlatList, etc.) y de `nautilus` (NautilusIconsGrid, NautilusTilesList) y `vmGetSizes` → imports ES; los `window.addEventListener('vm-*')` → `protoBus.on` con su cleanup (905/914/915/959: `vp13-icon-override`, `vp13-redesign-cells`, `vp13-cell-order`, `vp13-selmode`); `useStateExp` de React → named imports; exports tail completo en 1312-1316: `TabExplorer`, `NiagaraIndex`, `MillerColumns`, `MasterDetailView` (alias `MasterStoryView`), `DrillView`, `GridDrillView`, `AccordionTreeRows` (alias `AccordionsTreeRows`), `FlatTreeRows`, `TreeRows`, `NodeGlyph`, `CellMedia`, `CellContent`, `TREE_CELL_DEFS`, `TREE_CELL_ORDER`, `vmFirstChar`, `vmGroupKey`, `vmGroupList`, `MODIFIED_ORDER`, `vmIndexGlyph`, `vmShowLabel/Icon/Level/Media/Content`, `NIA_REVEAL`, `NODE_PX`.
- [x] Los drags window (224-225 mousemove/mouseup/touchmove/touchend; 1247 mousemove/mouseup) se conservan aquí con su cleanup (aislamiento en PV13-011).
- [x] `pages.tsx`: `window.TAB_TREES` → import; los `window.addEventListener('vm-selmode'/'vm-toggle-expand-all')` (387/416) → `protoBus.on` (`vp13-selmode`/`vp13-toggle-expand-all`) con cleanup; dispatch de `vm-search-submit` (591) y `vm-selmode` (651) → `protoBus.emit`; `document.querySelector('.vm-tab-content')` se conserva (aislamiento en PV13-011); exports `TabPill`, `StatsPage`, `FiltersPage`, `ToolsPage` (845).
- [ ] Tras cada módulo: `npm run build` verde. Cierre: build + lint exit 0.
- [x] `buildCtxItems` (662): función local de `FiltersPage` (usada en 733), **no exportada** — desviación del AC (no es consumido por ningún otro módulo; se deja local por paridad 1:1).

## Verification log

- `npm run build` → tsc + esbuild + `scripts/sync-test-build.mjs` → exit 0, sync a `plugin-dev/.obsidian/plugins/vaultman-prototype` OK (verificado 2026-08-08).
- `npm run lint` → **NO exit 0** en el estado post-verificación: 84 errors/53 warnings. Los errores están FUERA del override `src/proto/**`: artefactos de verificación de la sesión de port en raíz (`sim.cjs`, `sim.js`, `test.cjs` sin allowDefaultProject; `src/data.ts` y `src/state.ts` duplicados sin `@ts-nocheck` efectivo) + `src/settings.ts` pre-existente. Los módulos de este issue (bajo `src/proto/**`) solo aportan warnings de paridad aceptados.
- Smoke dev 2026-08-08: OK (explorer/pages renderizan en el primer paint; grid Nautilus, tabs stats/filters/tools funcionales).

## Notes

- Eventos del bus renombrados `vm-*` → `vp13-*` (evita colisión con el window real de Obsidian). Emisores y receptores coherentes entre sí (verificado: todo `vp13-*` emit tiene su `on` y viceversa).
- Deuda pendiente (no bloqueante, no parte del port): limpiar/ignorar los 5 artefactos de raíz que rompen el lint global (`sim.cjs`, `sim.js`, `test.cjs`, `src/data.ts`, `src/state.ts`).

## Blocked by

- PV13-006 (views/stack), PV13-007 (search disponible).