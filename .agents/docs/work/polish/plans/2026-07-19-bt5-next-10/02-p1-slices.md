---
title: "BT5 next-10 shard 02: slices P1 (006, 007, 008, 028, 009)"
type: plan
status: active
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-19T15:03:21
updated: 2026-07-19T15:03:21
created_by: claude-fable-5
updated_by: claude-fable-5
tags: [agent/plan, initiative/polish, release/bt5]
---

# Shard 02 — slices P1

## BT5-006 — Collapse/expand contextual a nested

Hoy: `supportsExpansion = activeTab in {files,props,tags}` (navbarFilters:515);
botón directo (1730-1746) o entrada en `openToolsMenu` (1396-1411, junto a Auto-reveal); `nested` vive como pseudo-cell en `visibleCellsByTab` (1139-1143).

Cambio:
- Nuevo helper puro `expansionActionAvailable(tab, visibleCells: readonly string[])` en `src/logic/logicTreeExpansion.ts`: `(tab==='files'||'props'||'tags') && visibleCells.includes('nested')`.
- navbar: `supportsExpansion` deriva del helper con `visibleCellsByTab[activeTab]` (reactivo → cambio de nested actualiza al instante). El botón directo Y la entrada del Tools menu usan el mismo derived; `openToolsMenu` añade el item de expansión solo si disponible (Auto-reveal se conserva siempre en files).
- El mecanismo condensed/overflow (compactFilesTools) NO se toca (D4/BT5-021).

Tests (`test/unit/expansionAvailability.test.ts` + guard en sortUiSource si útil):
helper matrix (tabs × nested on/off, addons siempre false) · source guard: navbar depende del helper y el Tools menu gatea la entrada · cambio runtime: derived usa visibleCellsByTab (guard de reactividad por source).

## BT5-007 — Paridad popupSort para By level

Hoy: menú nativo `addByLevelItems` (navbar:1170-1232, orden D29: Nested → Folders first → Fixed folders → sep → Scope drill/all|properties/values) + filtro `isSortOptionVisible` (1292-1301). popupSort.svelte: SORT_OPTIONS/DRAWER_OPTIONS duplicados, sin nested, sin fixedFolders, sin filtro de visibilidad, no re-sincroniza si `initialSortState` cambia externamente con el popup abierto.

Cambio:
- Nuevo `src/logic/logicSortMenu.ts` (puro, sin UI): `SORT_MENU_OPTIONS` por tab (única fuente; navbar y popup lo importan) · `NODE_TYPE_MENU_OPTIONS` (props/tags) · `sortScopeOptions(tab)` · `byLevelModel(tab, state, nestedActive)` → `{ nested:{checked}, parentsFirst?:{checked}, fixedFolders?:{visible,checked}, scopes:[{scope,icon,labelKey,checked}] }` (misma regla: fixedFolders solo si parentsFirst; solo files) · `visibleSortOptions(tab,state,nestedActive)` filtrando con `isSortOptionVisible`.
- navbar consume el módulo (borra sus copias); popupSort consume el módulo, añade toggle Nested (via callback nuevo `onNestedToggle`) + Fixed folders al drawer de niveles respetando el orden D29, y aplica `visibleSortOptions`.
- popup re-sincroniza: `$effect` sobre `initialSortState` (no solo activeTab) para reflejar cambios externos mientras está abierto; sin resolver propio (los cambios siguen fluyendo por onSortChange/onScopeChange/onFilterChange existentes; nested via `onNestedToggle` → navbar `toggleNestedFor`).

Tests (`test/unit/sortMenuModel.test.ts` + ampliar `sortUiSource.test.ts`):
byLevelModel matrix (files/props/tags × nested × parentsFirst×fixedFolders × scopes;
paridad con la matriz del spec BT4 By level) · visibleSortOptions oculta `path` con nested on y `sub` en props/values · source guards: navbar y popup importan logicSortMenu y no declaran SORT_OPTIONS locales · popup incluye nested/fixedFolders y $effect de resync.

## BT5-008 — Tags toolbar refleja scope externo

Hoy: `explorerTags.applyExternalSortScope` (444-453) muta sortState + render sin notificar; navbar solo cablea `setSortStateChangeHandler` para files (1431-1437, handler 811-827 con doble guard sameSortState anti ping-pong).

Cambio (espejo exacto del seam files):
- explorerTags: campo `onSortStateChange?`, método `setSortStateChangeHandler(h)`, `_notifySortStateChanged()` llamado al final de `applyExternalSortScope` (y de cualquier mutación interna de scope no originada por setSortState — hoy solo esa).
- navbar: `handleExternalTagsSortState` (mismo cuerpo que files con 'tags') + wiring en el mismo `$effect` con cleanup.
- Carga de View config sigue el camino navbar→applySortState (sin cambio); el guard `sameSortState` en setter+handler evita save/render loop.

Tests (`test/unit/tagsScopeSync.test.ts`): applyExternalSortScope notifica el estado normalizado una sola vez y no re-notifica si no cambió · navbar source guard: handler tags cableado con cleanup · ping-pong: handler con estado igual no re-aplica (guard presente) · files intacto (guard source existente no cambia).

## BT5-028 — Highlight de archivo activo en Content Explorer

Hoy: `tabContent.svelte:231` ya pinta `class:is-active` pero contra `activeContentRevealPath`, que SOLO cambia con la acción manual de reveal (pageFilters:572-589). Files: `workspace.on('file-open')` → activeRevealPath → `is-active` en row (explorerFiles:481,1734-1736,1903-1916).

Cambio:
- pageFilters: nuevo estado `activeContentFilePath` (highlight, independiente del reveal): onMount registra `workspace.on('file-open')` → set path (getActiveFile al montar como valor inicial) y `vault.on('rename')` → recomputa desde getActiveFile;
  cleanup con offref. tabContent recibe `activeContentFilePath` y liga `is-active` a él; el reveal (scroll/expand) conserva `activeContentRevealPath`/revision.
- Cubre: open, cambio leaf/tab (file-open), rename (listener), delete/cierre (file-open null), Content oculto (estado vive en pageFilters; Svelte repinta al mostrar), sin view modes extra (Content no expone view modes).

Tests (`test/unit/contentActiveFile.test.ts`, RED primero): source guards — pageFilters registra file-open+rename con offref y pasa `activeContentFilePath`;
tabContent liga is-active al nuevo estado y NO al reveal path · unit del reducer (file-open TFile/null → path/null).

## BT5-009 — Exclusión de files como filtro por nodo

Hoy: `file.exclude` ctx (explorerFiles:164-181) → `settings.excludedFilePaths` → filtrado en RENDER (`_filesForDisplay:886-895`); settings "Show again" (523+);
Content no ve la exclusión; exclude-folder en cambio es rule del pipeline.

Cambio (pipeline, storage persistente se conserva → migración BT4-015 = nula):
- FilterService: `setExcludedPathsProvider(fn)` (main.ts inyecta `() => plugin.settings.excludedFilePaths`) + en `applyFilters` descarta paths excluidos ANTES del árbol (filteredFiles y filteredVaultFiles) + `isExcluded(path)`.
  API `refreshExclusions()` = applyFilters + trigger 'changed'.
- plugin (main.ts): `excludeFilePath(path)` / `restoreExcludedFilePath(path)` → settings + saveSettings + `filterService.refreshExclusions()`. Ctx action y Settings "Show again" llaman estas APIs (todas las superficies refrescan vía 'changed').
- explorerFiles: `_filesForDisplay` deja de leer `excludedFilePaths` (solo nodeTypeFilters). Content hereda vía `getFilesIgnoringContentSearch` (pipeline).
- Ctx en superficies que representan files: verificar que table/grid/cards de Files enrutamos node ctx 'file' (mismas actions); tabContent: añadir `oncontextmenu` por fila de resultado que abre el menú de nodo file del contextMenuService (misma acción exclude; investigar API exacta al implementar — si el service no expone helper, menú nativo mínimo con la misma action run).
- Rename/delete: util `src/utils/pathKeyMigration.ts` — `migratePath(map|list, old, new)` con prefijo de carpeta y `purgePath(prefix-aware)`; main.ts registra vault rename/delete para migrar/purgar `excludedFilePaths` (+ lo reutiliza 013).

Tests (`test/unit/fileExclusionFilter.test.ts`): applyFilters excluye exacto (no substring) en ambos sets · isExcluded · refreshExclusions dispara changed (spy) · rename file y rename carpeta (prefijo) migran; delete purga · source guards:
`_filesForDisplay` ya no consulta settings de exclusión; ctx usa la API nueva;
Settings usa restore API.
