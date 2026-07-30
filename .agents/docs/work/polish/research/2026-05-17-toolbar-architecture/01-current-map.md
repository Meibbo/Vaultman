---
title: Toolbar current map
type: research
status: draft
parent: "[[docs/work/polish/research/2026-05-17-toolbar-architecture/index|toolbar architecture]]"
created: 2026-05-17T11:49:10
updated: 2026-05-17T11:49:10
tags:
  - agent/research
  - initiative/polish
  - toolbar
  - architecture
created_by: codex
updated_by: codex
---

# Toolbar Current Map

## Qué abarca el Toolbar actual

| Area | Dónde vive | Qué hace hoy |
| --- | --- | --- |
| Search/FnR island | `Toolbar.svelte` + `FnRIslandService` | Query por tab, modo search/rename/replace/add, flags, errores, help, history, rename handoff. |
| View menu | `Toolbar.svelte` + `overlayViewMenu.svelte` | Cambia `viewMode`, `addMode`, field pills, view modes soportados. |
| Sort menu | `Toolbar.svelte` + `overlaySortMenu.svelte` | Cambia `sortBy`, `sortDir`, `sortTarget`, scope, hidden files, selected-only, manual DnD. |
| Node expansion | `Toolbar.svelte` + `pageFilters.svelte` | Muestra expand/collapse solo si el tab activo reporta `canToggle`. |
| Crear | `Toolbar.svelte` + `explorerAddOps` + `pageFilters.svelte` | Construye un `PendingChange` según el explorer activo y lo manda al queue. |
| Frame islands | `frameVaultman.svelte` + `frameOverlays.svelte` | Queue y active-filters son islands del frame, no primitives del toolbar. |
| Active filters mini toolbar | `explorerActiveFilters.svelte` | Squircles para import/export, add group y clear. No comparte registry con `Toolbar.svelte`. |
| Grid navigation | `GridNavigationToolbar.svelte` | Navegación de grid dentro de `PanelExplorer`, separada del toolbar principal. |
| Theme preset toolbar | `typeThemePreset.ts` + `themePresetsBuiltin.ts` | Declara `core` / `full` / custom ids, pero no gobierna render todavía. |

## Call sites y dependencias observadas

- `pageFilters.svelte` importa `Toolbar` y lo monta directamente con `bind:this={toolbarApi}`.
- `pageFilters.svelte` traduce `filtersActiveTab === 'outline'` a `toolbarActiveTab === 'content'`, lo que confirma que el toolbar no sabe representar todos los tabs de Filters.
- `Toolbar.svelte` define internamente `type FiltersTab = 'props' | 'files' | 'tags' | 'content'`.
- `Toolbar.svelte` importa `explorerFiles`, `explorerProps`, `explorerTags`, `FnRIslandService`, `explorerAddOps`, `serviceOperationScope` y `serviceNodeFieldVisibility`; no recibe una capability interface agnóstica.
- `frameVaultman.svelte` renderiza `FiltersPage`, `OperationsPage` y `StatisticsPage`, pero solo `FiltersPage` recibe toda la familia de estado que requiere el toolbar.
- `pageTools.svelte` usa `NavbarTabs` y renderiza tabs internos; no expone primitives de toolbar.
- `explorerActiveFilters.svelte` implementa una toolbar propia de squircles para import/export, add group y clear.
- `ThemePreset.toolbar.buttons` existe en tipos y presets built-in, pero no hay consumo runtime del campo en `Toolbar.svelte` ni en `frameVaultman.svelte`.

## Por qué está conectado solo a Filters page

1. **La interface del módulo revela el acoplamiento.** `Toolbar.svelte` acepta `activeTab` como `props/files/tags/content`; no acepta un `surfaceId` genérico ni capabilities por página.
2. **El estado que necesita no existe fuera de Filters page.** Search por tab, `filtersSearchCategory`, `filtersFnRState`, explorer providers, `nodeExpansionSummary`, field visibility y operation scope son estado de `pageFilters.svelte`.
3. **Los comandos globales se enchufan desde Filters page.** `pageFilters` registra `plugin.openViewMenuHook`, `plugin.openSortMenuHook` y `plugin.openContentSearchHook`; el frame no tiene un registry de comandos de toolbar.
4. **Otras páginas ya resolvieron sus controles localmente.** `pageTools` usa `NavbarTabs`; active filters usa una squircle row; grid usa `GridNavigationToolbar`. Esas superficies no tienen una interface común que el toolbar pueda consumir.
5. **El preset no participa.** `toolbar.buttons` existe en los presets, pero no hay un resolver que traduzca `core`, `full` o `string[]` a primitives reales.

En términos de arquitectura, el módulo es poco profundo: su interface es casi tan compleja como su implementación. La señal es que moverlo a otra página obliga a conocer demasiados detalles internos de Filters.

## Riesgo de seguir agregando condicionales

Si se añade `activePage === 'tools'`, `activePage === 'statistics'` o `activeTab === 'outline'` directamente dentro de `Toolbar.svelte`, la interface crece en paralelo con cada nueva superficie. Eso degrada locality porque los cambios de PageTools, Grid, active filters o theme presets terminarían editando el mismo archivo aunque sus reglas pertenezcan a dominios distintos.

La prueba de eliminación también marca el problema: si se elimina `Toolbar.svelte`, la complejidad no desaparece; reaparece repartida entre Filters search, Sort menu, View menu, FnR, add ops, field visibility y command hooks. Eso indica que el module actual sí encapsula comportamiento, pero su interface no tiene suficiente profundidad para reutilizarlo fuera de Filters.
