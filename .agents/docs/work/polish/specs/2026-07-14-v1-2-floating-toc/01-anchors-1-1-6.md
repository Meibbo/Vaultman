---
title: Spec shard 01 — anclajes de implementación en 1.1.6
type: spec-shard
status: active
parent: "[[docs/work/polish/specs/2026-07-14-v1-2-floating-toc/index|Spec v1.2 Floating TOC]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags:
  - agent/spec
  - initiative/polish
  - floating-toc
---

# 01 — Anclajes 1.1.6 (verificados vía `git show 1.1.6:<path>`, 2026-07-13)

Base = tag `1.1.6` (= origin/main). Los números de línea son de ESE tag, no de sandbox.

## Frame / montaje del overlay

- Cadena de montaje: `src/VaultmanFrame.ts:32-40` (`onOpen` → mount Svelte en `contentEl.vaultman-frame`) → `src/VaultmanFrame.svelte` → `.vaultman-pages-viewport`
  > `.vaultman-page-container` > `.vaultman-page[data-page]` > `FiltersPage`.
- **Contenedor de posicionamiento del rail: `.vaultman-pages-viewport`** — `styles.css:2146-2152`: `flex:1; overflow:hidden; position:relative` (comentario literal: "needed so bottom-nav can position: absolute inside it").
- Patrón overlay a copiar: `.vaultman-bottom-nav` (`styles.css:2250-2263`, `position:absolute; z-index:10; pointer-events:none` con hijos re-activando `auto`) y `.vaultman-queue-island-wrap`/`.vaultman-filters-island-wrap` (`styles.css:5620-5628`, `bottom: calc(var(--vaultman-nav-height,64px)+8px); z-index:40`).
- z-index vigentes: backdrop 5 · dock 10 · navbar sticky 10 · islands 40. Rail → ~12 (sobre contenido, bajo islands).
- `pointer-events`: SOLO el wrapper franja = `none`; los botones = `auto` (uso simultáneo con la navegación garantizado; la franja vacía deja pasar clicks).

## Menú view-mode (FTC-003)

- Botón: `navbarFilters.svelte:983-1004` (`filter.viewmode_btn`) → `openViewModePopup` (`:352-359`) → bifurca por `minimalStyle`.
- Camino minimal (menú nativo): `openNativeViewMenu` `navbarFilters.svelte:585-634` — orden actual: loop view-modes (598-609) · separator (611) · celdas visibles (612-620) · separator (622) · add-mode (623-632). **Inserción de la sección nueva: ANTES de L598** (items + `addSeparator()`), patrón `setChecked/onClick`.
- Camino no-minimal (popup Svelte): `src/components/layout/popupView.svelte`, render en `navbarFilters.svelte:1119-1137` — sección nueva = fila `.vaultman-viewmode-row` extra.
- Defs declarativas: `src/logic/logicExplorerViewModes.ts:16-41` (`VIEW_MODE_DEFS`) + `viewModesForDataSurface()` (43-72).

## Toolbar (FTC-003)

- "Toolbar" = `src/components/layout/navbarFilters.svelte` raíz `.vaultman-navbar-filters` (:908-911; sticky top z-10, `styles.css:2336-2344`). Hoy **siempre visible, sin setting** → toggle nuevo (precedente de shape: `showDock`, `VaultmanFrame.svelte:79-82`
  + `{#if showDock}`).
- Render condicional actual en `pageFilters.svelte`: bloque `{#if filtersActiveTab !== 'content' || minimalStyle}`.

## Datos del rail (FTC-001)

- `TreeNode` (`src/types/typeTree.ts:23-40`): `{id, label, icon?, count?, children?, depth, meta}`. L1 = array raíz pasado a `render({nodes})` en `_render()` de cada panel:
  `explorerFiles.ts:766-805` · `explorerProps.ts:742` · `explorerTags.ts:440`. **No hay accessor** → añadir `getTopLevelNodes(): {id,label}[]` por panel.
- ids/labels: files id=path,label=nombre · props id=propName · tags id=tagPath.
- Tab activo: `filtersActiveTab: 'files'|'props'|'tags'|'content'` (estado en `VaultmanFrame.svelte`, switch en `pageFilters.svelte`). `content` sin árbol → rail gated a files/props/tags.

## Scroll / jump (FTC-002)

- Tree: `UnifiedTreeView.scrollToId(id, block='center')` — `viewTree.ts:163-181`; filas no renderizadas → `_scrollTopForIndex` (:422-448) + `_pendingScroll` (:455-471 flush).
- Table/grid: `scrollToPath(path)` (`viewFilesGrid.ts:78` · `viewGrid.ts:663`) — elegir método según viewMode del tab.
- Precedente completo de reveal: `explorerFiles.ts:563-582` `autoRevealActiveFile()` (expand ancestros → `_render()` → rAF → scroll).
- Geometría: `_rowHeight=28` / `_mobileCoreRowHeight=37` (`viewTree.ts:402-413`, gate `is-phone` + drawer selector) · `_overscan=24`. NO existe `serviceExplorerScrollGeometry` en 1.1.6 (eso es sandbox).

## Settings + persistencia (FTC-001/003/004)

- Tab: `src/VaultmanSettings.ts` (`display()`); headings vía `new Setting(containerEl).setName(translate(k)).setHeading()` — precedentes:
  `settings.context_menu` :221 · `settings.templates` :259 · `queue.template.templates` :288 (= sección "Action presets"). Secciones nuevas: "Floating TOC" + "Saved view config" tras Action presets.
- Persistencia: `typeSettings.ts` (`VaultmanSettings` :9 + `DEFAULT_SETTINGS` :110) · `main.ts:374-390 loadSettings` (spread-merge sobre `data.json`) · `:393-396 saveSettings` (`saveData` + notify). Colecciones persistidas hoy: `filterTemplates` (`modalSaveTemplate.ts:67`) y `queueTemplates` (`queueTemplateMenu.ts:458`).
- `minimalStyle: boolean` (default **true**; `VaultmanSettings.ts:100-113`) — bifurca menú nativo/popup, clases (`clickable-icon nav-action-button` vs `vaultman-nav-fab`, `navbarFilters.svelte:293-295`), dock, tabs, search. NO existe `vm-theme-native` en 1.1.6. Vestigial: `settings.viewMode` sin usos (no confundir).

## Estado de vista actual (FTC-004 — hoy TODO volátil)

- Fuente UI: `navbarFilters.svelte` `$state` — `viewModeByTab` :273-277 · `visibleCellsByTab` :278-282 (defaults :146-150) · `sortStateByTab` :283-287 (defaults :125-145); aplicados vía `$effect` :833-853 + handlers :547-578. Tipos `ExplorerViewMode`/`ExplorerSortState` en `typeUI.ts:47-56`.
- Espejos por panel: `explorerFiles.ts:52-66` (`viewMode/sortBy/sortDir/nodeTypeFilter/ parentsFirst/visibleCells`; setters :414/:421/:444) · `explorerProps.ts:74-81` · `explorerTags.ts` equivalente.
- **Nada persiste** y `onSettingsChange → pageRenderKey++` (`VaultmanFrame.svelte`) REMONTA `FiltersPage` reseteando los `$state`. FTC-004 = clave `viewConfigByTab` persistida + init de los `$state` desde settings (:273/278/283) en vez de defaults.
  ⚠️ cuidar loop: guardar config → saveSettings → notify → remount; usar no-op guard si el snapshot no cambió (precedente setters no-op SDF-014).

## Mobile (todas las slices)

- Selector CSS: `.is-phone .workspace-drawer .workspace-leaf-content[data-type="vaultman-frame"] …` (precedentes `styles.css:2898-2905/2913/3009/3015`). Row height condicional 37/28.
- Lane emulada: plugin `advanced-debug-mode` v1.9.8 (mnaoumov) en `Desktop/plugin-dev/.obsidian/plugins/` (`isDesktopOnly:false`) + API directa `this.app.emulateMobile(true)` vía obsidian-cli (agentes). Cobertura real SOLO por BRAT device (Capacitor/touch/safe-areas/perf) — [[docs/architecture/policies/release|policy]].
