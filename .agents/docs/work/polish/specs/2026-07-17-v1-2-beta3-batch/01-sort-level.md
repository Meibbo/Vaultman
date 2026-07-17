---
title: Shard 01 — Sort level per-scope (diseño BT3-002)
type: spec
status: active
parent: "[[docs/work/polish/specs/2026-07-17-v1-2-beta3-batch/index|beta.3 batch spec]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags:
  - agent/spec
  - initiative/polish
---

# Shard 01 — Sort level per-scope

## Diagnóstico base (verificado en código, 2026-07-17)

Hoy existe UN solo `sortBy`/`direction` por explorer (`ExplorerSortState`,
`typeUI.ts:50-59`) + bool `childLevel` que REDIRIGE ese único sort a un nivel.
`_applySort` (`explorerProps.ts:981-998`, `explorerTags.ts:272-289`) ordena SOLO el
nivel activo; el otro cae a orden de árbol crudo. Cambiar `childLevel` = mover +
re-aplicar el sort → re-barajeo del explorer entero. beta.2 (`c7c7da26`) solo renombró
el label (`sort_props`/`sort_values`) prometiendo per-level sort que el estado no da.
No hay implementación previa que restaurar: el estado per-scope se construye nuevo.
Files ignora `childLevel` y usa `parentsFirst` aparte (`explorerFiles.ts:111,524-544`).

## Modelo nuevo

### Estado

```ts
// typeUI.ts — reemplaza el single sortBy/direction
interface ScopeSort { sortBy: string; direction: ExplorerSortDirection }
interface ExplorerSortState {
	sorts: Partial<Record<SortScopeKey, ScopeSort>>; // default por tab si falta
	activeScope: SortScopeKey;      // qué scope edita/muestra el menú
	drillNodeId?: string | null;    // solo tags/files, scope 'drill'
	parentsFirst?: boolean;         // solo files (modifier, no scope)
	nodeTypeFilter: string | null;
	nodeTypeFilters?: string[];
}
type SortScopeKey = 'all' | 'drill' | 'properties' | 'values';
```

Scopes por tab: props `properties|values` · tags `all|drill` · files `all|drill`.

### Semántica

- **All** (tags/files): su sort aplica a TODOS los niveles del árbol.
- **Properties / Values** (props): nivel 1 y nivel 2 ordenados SIEMPRE simultáneamente,
  cada uno con su propio sort.
- **Drill** (tags/files): sort propio SOLO para los hijos del nodo `drillNodeId`; el
  resto del árbol sigue con el sort de `All`. Gesto = mismo patrón que el drill del
  index (FTC-006): pick-mode long-press captura `data-id` (reuso `longPressGesture.ts`);
  reset → vuelve a `All`.
- **Invariante no-reshuffle**: elegir opción del submenú SOLO cambia `activeScope`
  (y `drillNodeId` si aplica). CERO re-sort implícito. Re-sort ocurre únicamente al
  cambiar el sort del scope activo, y re-ordena SOLO ese scope.
- **Parents first** (files): toggle modifier. ON = folders hoisted (hoy). OFF =
  **fix nuevo**: folders compiten intercalados con files por el comparator activo
  (`file-file-folder-file`) — hoy OFF sigue agrupando. Trace del fix:
  `FilesLogic.buildFileTree`/`sortTree` + `logicSort.ts`. Togglearlo re-proyecta el
  árbol (es un cambio real de orden pedido por el usuario, no cuenta como reshuffle
  prohibido).
- **Persistencia**: estado per-scope completo (incl. `drillNodeId`) persiste y viaja
  en `SavedViewConfig.sortState` (`typeSettings.ts:13-18`). `drillNodeId` inexistente
  al cargar → fallback `activeScope='all'`.

### UI

Submenú **"Sort level"** en ambas superficies de sort:

- `openNativeSortMenu()` (`navbarFilters.svelte:849-941`): reemplaza el item toggle
  actual (L884-903) por submenú con radio-check por scope. Files antepone
  `Parents first` (checkable) + divider (D3).
- `popupSort.svelte`: reemplaza `toggleChildLevel`/`vertTopActive` (L205-208, L240-258)
  por la misma estructura (grupo radio + parents-first en files).
- Checkmarks de sort-by y flecha de dirección leen el sort del **scope activo**
  (`navbarFilters.svelte:855-868`; `popupSort.svelte:152-157,173-183,298-316`).
- i18n: keys nuevos `sort.level.*` (`All`, `Scope drill mode`, `Properties`, `Values`);
  retiran `sort.vertcol.sort_props`/`sort_values`. `sort.parents_first` se conserva.

### Motor

`_applySort` (props/tags) pasa de gate excluyente a aplicar el sort de cada scope a su
nivel SIEMPRE. Files integra drill en su pipeline (`buildFileTree` recibe sorts por
scope + drill target). `setSortBy(...)` cambia de firma: recibe `(scope, sort)` o el
estado completo normalizado — decidir en implementación, manteniendo providers
delgados.

### Migración

Layout guardado legacy `{sortBy, direction, childLevel, nodeTypeFilter}` →
`{sorts: {<scopeDefault>: {sortBy,direction}}, activeScope: <scopeDefault>}` donde
`scopeDefault` = `properties` (props) / `all` (tags/files). `childLevel` se descarta
(documentado: su semántica vieja no es representable y era el bug). `parentsFirst`
legacy se copia tal cual. Load nunca lanza: shape desconocido → defaults.

### Tests (RED/GREEN focal)

- `_applySort` ordena ambos niveles con sorts distintos (props y tags).
- Cambiar `activeScope` no altera el orden proyectado (invariante).
- parents-first OFF intercala folders (nuevo comparator path).
- Drill: sort de hijos del nodo target ≠ sort All; reset restaura.
- Migración legacy→v2 (ambos valores de `childLevel`) + `drillNodeId` huérfano.
- Round-trip `SavedViewConfig.sortState` v2.
