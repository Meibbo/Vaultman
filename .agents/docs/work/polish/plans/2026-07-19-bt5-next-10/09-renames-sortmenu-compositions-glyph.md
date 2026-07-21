---
title: "BT5 shard 09: renames, sort-menu cleanup, view compositions, glyph color, 3 issues nuevos"
type: verification
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-20T22:10:00
updated: 2026-07-20T22:10:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/verification, initiative/polish, release/bt5]
---

# Shard 09 — ajustes UX del dev + BT5-025 glyph color

Sesión del 2026-07-20 (noche), `claude-opus-4-8`. Batch de ajustes que pidió el
dev en un mensaje, más BT5-025. Worktree `C:/tmp/vaultman-release-beta2-final2`,
rama `codex/bt5-next-10`, base `546c376d` … HEAD `beb545e3`.

## Commits de producto

| Commit | Qué |
|---|---|
| `e86cd6f4` | sort-menu: ocultar opciones de folder donde no aplican |
| `1b3031b2` | renames + seed de compositions + paleta glyph compartida |
| `beb545e3` | aplicar el glyph color a los glyphs del explorer (BT5-025) |

Gate final: **135 files / 896 tests**, svelte-check 0/0, scorecard 17/17. Build
sincronizado SOLO a `plugin-dev`, SHA-256 `0f5745e7`. **Smoke de runtime NO
ejecutado**; todo por gates.

## Renames

- "View config" → **View Compositions** (`settings.saved_view_config*`,
  `viewmenu.layouts`, `viewmenu.save_layout`, `saved_config_notice`).
- "Layout Settings" → **Layout Configuration** (`settings.style_config`,
  `back_to_layout_settings`). Keys sin cambiar; solo el texto. Guards de IA de
  settings re-apuntados (en + es).

## Sort-menu cleanup (`e86cd6f4`)

Dos quejas del dev: table/cards mostraban opciones de folder pese a ser planos, y
tree con nested=off mostraba "folders first"/"all levels"/"scope" sin sentido.

`byLevelModel` gana un 4º arg `treeCapable`: en vistas planas (table/cards) el
grupo By-level entero desaparece (`treeCapable=false → null`). Dentro de un árbol,
las opciones de folder y los scopes solo aparecen con nested on; con nested off
solo queda el toggle Nested. `nestedActiveFor` en el navbar ahora incluye el
viewmode, así que las vistas planas reportan nested inactivo (y el sort Path queda
disponible ahí). Helper nuevo `isHierarchicalViewMode`.

## Default View Compositions (`1b3031b2`)

Dos compositions seeded y **borrables**: **Basic list** (cada explorer como árbol
plano, cells de identidad, nested off) y **Preview** (árbol completo, todas las
cells, floating index). `logicViewCompositions` las deriva del registry + sort
defaults; seed one-time detrás del flag `viewCompositionsSeeded`, así que borrarlas
persiste. Merge sin duplicar por nombre.

## BT5-025 — glyph color compartido (`1b3031b2` + `beb545e3`)

`logicGlyphColor`: paleta `default | faint | accent | custom | rainbow`. `faint`/
`accent` = vars semánticas de Obsidian; `custom` = color picker nativo con hex
validado + fallback; `rainbow` = paleta pastel de referencia (var del snippet con
fallback hex, sin depender de que el snippet esté activo). Floating Index consume
el resolver y gana faint+custom. Layout Configuration → Explorer gana el mismo
selector + scope `folders | files | both`. Las vars individuales salen de la UI;
un valor legacy migra a `custom` con su hex documentado (one-time en load). El
toggle Rainbow folders sale de la UI; su setting/adapter se conservan como función
diferida. La aplicación real al explorer (`beb545e3`): el glyph color pinta el
`iconColor` del nodo por scope, pero un color Iconic explícito gana (no se pisa una
elección por-nodo); rainbow bucketea folders por orden de subárbol.

## Guards re-apuntados (ninguno borrado)

`interactionModeSource` y `settingsIaSource` (labels renombrados, en+es);
`navbarFiltersSource` (byLevelModel ahora recibe treeCapableFor);
`sortMenuModel` (nested-gating + treeCapable). Total tanda: 5.

## Issues nuevos abiertos (items 6/7/8 del dev)

- [[033-view-compositions-full-layout-capture|BT5-033]] — las compositions deben
  guardar show dock, show toolbar y el resto de opciones de Layout Configuration,
  más `filesIconScope` renombrado a **node icon scope** y movido a Explorer menu.
- [[034-filter-island-vertical-responsiveness|BT5-034]] — el island de filtros no
  se ajusta a la altura del frame; en un split pequeño oculta entradas. Falta la
  responsividad del alto al frame (el scroll por overflow ya existe).
- [[035-condense-tabs-toolbar-option|BT5-035]] — option `Condense tabs` (default
  on): on = tab selector menu actual; off = tabbar del style preset experimental
  (dejando en el menú solo index/statistics/filters/queue/toolbar). Transversal:
  todos los cmenus, incluidos los del toolbar, con su propio order/toggle en Layout
  Configuration → context menus (extender BT5-018).

## Estado de la cola BT5

Pendientes reales tras esta tanda: **BT5-002** (leaf reactivation, HITL visual),
**BT5-003** (remaining tasks pipeline, HITL benchmark), **BT5-004** (boletín,
release HITL), **BT5-018** (pending-hitl, revisión de UI del dev),
**BT5-026** (glyph override por nodo/cell — bloqueado por 018+025, ahora 025 ya
está), **BT5-027** (mover tab, deferred), **BT5-030** (deferred pero validado en
runtime), más los nuevos **BT5-033/034/035**. Nota: los frontmatter `status:` de
010/011/016/017/019/020/029 quedaron en needs-triage pero están completed en la
tabla del índice.

## Pendientes

1. **Smoke de runtime** de todo lo de esta tanda (renames, sort menu, compositions,
   glyph color en Floating Index y Explorer).
2. Triage de BT5-033/034/035 con el dev.
