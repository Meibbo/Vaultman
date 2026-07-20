---
title: "BT5 next-10 shard 03: registro de cells (010) y consumers (011/012/013)"
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

# Shard 03 — registry y consumers

## BT5-010 — Registro compartido de cells + hover-info

Hoy: mapas dispersos en navbarFilters (DEFAULT_VISIBLE_CELLS 209 · CELL_LABELS 216 ·
CELL_ICONS 257) + duplicados en popupView; hover-info = `FILES_HOVER_INFO_FIELDS`
(typeSettings:34) con orden canónico fijo, sin Label, sin DnD (VaultmanSettings:615+
solo toggles); tooltip en explorerFiles:1966-2009.

Nuevo `src/logic/logicCellRegistry.ts` (datos puros + funciones puras; cero imports de
app/plugin — anti god-object):

```ts
interface ExplorerCellDef {
  id: string; labelKey: string; icon: string;
  explorers: readonly ExplorerTabId[];
  fixedPosition: number;              // orden canónico de render
  defaultOn: readonly ExplorerTabId[];
  sortId?: string;                    // vínculo declarativo a sort option
  hoverField?: HoverFieldId;          // participación en hover-info
  requiresNestedOff?: boolean;        // BT5-012 'path'
  identity?: boolean;                 // icon/name/text (guard existente)
  pseudo?: boolean;                   // 'nested': persiste en visibleCells, fuera de menús cell/hover
}
```

Entradas = unión actual: props {icon,text,count,type,nested} · tags {icon,text,count,
nested} · files {icon,name,count,ext,words,tasks,mtime,ctime,nested} · snippets
{icon,text,state,installed,updated} · plugins {icon,text,state,config,installed,
updated}. Posiciones fixed = orden DOM actual de viewTree (toggle·icon·label·type/ext·
badges·mtime·ctime·words·tasks·count) — con modo fixed el DOM no cambia.

Funciones: `cellsForExplorer(tab)` · `defaultVisibleCells(tab)` (incluye 'nested'
donde hoy) · `cellDef(id)` · `hoverEntries()` = `[{id:'label'}] + cells files con
hoverField + hover-only legacy {path→cell path (012), characters}` ·
`mergeHoverOrder(saved: readonly string[])` → ids válidos en orden guardado + faltantes
default en posición canónica (merge determinista; ids desconocidos se descartan al
leer sin romper) · alias legacy `modified→mtime`, `created→ctime` en la lectura.

Consumo:
- navbar reemplaza sus tres mapas por lookups del registry (orderedCellIds → registry;
  el guard identity usa `identity`).
- Hover-info: `filesHoverInfo: string[]` ahora acepta 'label' + ids de cell (los
  valores legacy siguen válidos vía alias). explorerFiles._filesHoverFields →
  `mergeHoverOrder`; `buildFileHoverInfo` gana la línea Label (basename) manteniendo
  su firma por data/labels. Default sin 'label' (render actual intacto).
- VaultmanSettings página files-hover: lista ordenada con drag handles HTML5
  (dragstart/dragover/drop reordenan y persisten por ids) + toggle por entrada +
  toggle Label.
- Saved View configs: `visibleCells` intactos (mismos ids) — sin migración.

Tests (`test/unit/cellRegistry.test.ts` + ampliar hover existentes): un cell nuevo
registrado una vez aparece en cellsForExplorer/defaults/menu order/hover (usar un def
inyectable o fixture) · merge estable: guardado parcial + cell nuevo → posición
canónica determinista · ids desconocidos no rompen y se descartan · alias legacy ·
label toggle en build del tooltip · source guards: navbar sin CELL_LABELS local;
settings renderiza orden/drag.

## BT5-011 — Cells por activación + menús por posición (gated 010)

Estado: `visibleCellsByTab` YA acumula en orden de activación (toggleVisibleCell usa
Set con insertion order; reactivar = append al final). Los renderers ignoran ese
orden (posiciones DOM fijas).

Cambio:
- Setting `orderCellsByActivation: boolean` (default false) en typeSettings +
  DEFAULT_SETTINGS + toggle en Settings/Explorer.
- Registry: `resolveCellRenderOrder(tab, visibleCells, byActivation)` → activation:
  ids válidos del array (sin pseudo) en su orden; fixed: por fixedPosition.
  `cellMenuOrder(tab, visibleCells, byActivation)` → activos primero (orden render) +
  inactivos por fixedPosition. `sortMenuOrder(tab, ...)` → sort options ordenadas por
  posición resuelta del cell vinculado (sortId); sorts sin cell usan
  `SORT_ONLY_POSITIONS` explícito (sub, name-sin-cell en addons, etc.).
- Renderers consumen el resolver: viewTree refactor del bloque de cells (563-810) a
  mapa id→render-fn ejecutado en orden resuelto (con fixed ≡ secuencia actual → DOM
  byte-idéntico, snapshots verdes) · viewNodeTable/viewGrid (tabla files) ordenan
  columnas · viewFilesGrid cards · explorerSnippets/Plugins ordenan `node.cells`.
- Menús (navbar openNativeViewMenu + popupView pills + sort menus nativo/popup)
  proyectan cellMenuOrder/sortMenuOrder.
- Config: `SavedViewConfig.visibleCells` ya es la secuencia → migración = ninguna;
  opciones invisibles contextualmente (p.ej. path nested-on) no dejan hueco (el
  resolver filtra disponibilidad sin tocar el array persistido).

Tests (`test/unit/cellOrderResolver.test.ts`): fixture del issue — files con ['icon']
y activaciones count→words→name ⇒ render [icon,count,words,name]; off ⇒ orden fixed
sin perder el array; reactivación mueve al final · menú: activos primero + inactivos
fixed · sort order por cell + sort-only positions · guards: renderers usan el
resolver (source) · snapshot tree sin cambios con setting off.

## BT5-012 — Path visible en Files plano (gated 010)

Estado: flat labels = basename (`logicsFiles.buildFlatFileNodes` L222-223); sort
`path` ya existe y se oculta con nested on (`isSortOptionVisible` D33); sort Name
compara `file.name` (logicSort).

Cambio:
- Registry: cell `{id:'path', explorers:['files'], requiresNestedOff:true,
  sortId:'path', hoverField:'path', fixedPosition: junto a name}`. Menú cell lo
  muestra solo con nested off (disponibilidad declarativa consumida por
  cellMenuOrder/openNativeViewMenu/popupView).
- Proyección de label (no columna nueva): explorerFiles pasa
  `labelMode: visibleCells.has('path') && !nested ? 'path' : 'name'` a
  `buildFlatFileNodes` (label = `file.path`); files grid (labels en :1144) y table
  aplican la misma proyección; hover conserva el campo path.
- Sorts intactos: Name→file.name · Path→file.path (ya en logicSort/compareFileTree).
- Configs viejas sin 'path' → Name por default; config con 'path' + nested on →
  proyección inactiva (nested manda).

Tests (`test/unit/flatPathCell.test.ts`): buildFlatFileNodes labelMode name/path ·
registry: path invisible nested on / visible off · duplicados de basename
distinguibles en modo path (labels distintos) · guards: grid/table proyectan.

## BT5-013 — Last opened persistente (gated 010)

Nuevo `src/services/serviceLastOpened.ts` (Component):
- Estado `Map<path, epochMs>`; hidratación en onload desde
  `app.loadLocalStorage('vaultman-last-opened')` (JSON {path:ts}; local al vault, sin
  archivos sync-ables); si el API no está tipado, cast por interfaz local.
- `workspace.on('file-open', f)` → `touch(f.path)` (TFile de cualquier extensión);
  hover/preview no dispara file-open (test con stub). Persistencia debounced 2000ms
  (`saveLocalStorage`), flush en onunload. Un timestamp por path (sin historial).
- `vault.on('rename')` → migrate (file + prefijo carpeta, util de 009);
  `vault.on('delete')` → purge. `getLastOpenedAt(path): number | null`.
- Wire en main.ts (addChild) + expose en plugin.

Cell + sort vía registry (prueba de "registrar una vez"):
- `{id:'opened', labelKey:'viewmode.pill.opened', icon:'lucide-history',
  explorers:['files'], sortId:'opened', fixedPosition: tras ctime, defaultOn: []}` +
  i18n en/es + `DEFAULT_EXPLORER_SORT_DIR['opened']='desc'` + SORT_MENU_OPTIONS files
  `{id:'opened', labelKey:'sort.by.opened'}`.
- explorerFiles decora `openedText` (formato `toLocaleDateString`, consistente con
  mtime/ctime) + render-fn 'opened' en viewTree/table/grid; `_compareFileTreeNodes` y
  `ExplorerFileSortOptions.lastOpenedForFile` → null=0 (desc ⇒ nunca-abiertos al
  final; tie-break path existente).

Tests (`test/unit/lastOpenedService.test.ts` + sort): touch actualiza y coalesce
persist (fake timers: N opens → 1 write) · hydrate round-trip · rename file/carpeta ·
delete purga · null explícito para nunca abiertos · no-md TFile cuenta · sort desc
reciente primero + null/ties deterministas · registry: cell default off presente en
files · flush en unload.

Guard anti-stall: el smoke final de escritura (shard 01 gate) se corre DESPUÉS de 013
para verificar que file-open/persist no reintroduce long tasks.
