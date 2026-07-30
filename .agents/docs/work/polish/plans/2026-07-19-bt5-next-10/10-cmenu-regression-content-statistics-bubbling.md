---
title: "BT5 shard 10: regresión de cmenus, content link, statistics, badge bubbling + backlog"
type: verification
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-21T00:30:00
updated: 2026-07-21T00:30:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/verification, initiative/polish, release/bt5]
---

# Shard 10 — regresión de cmenus + content + statistics + badge bubbling

Sesión del 2026-07-20/21, `claude-opus-4-8`. Batch de correcciones que reportó el dev. Worktree `C:/tmp/vaultman-release-beta2-final2`, rama `codex/bt5-next-10`, base `beb545e3` … HEAD `6e64f28b`.

## Commits de producto

| Commit | Qué |
|---|---|
| `0f9fba74` | BT5-036: cmenus por kind (regresión props/tags) + content link |
| `871a837e` | BT5-037: statistics toolbar igual a los demás + card Opened today |
| `6e64f28b` | BT5-038: dot en padre colapsado en vez de heredar la decoración de filtro |

Gate final: **136 files / 904 tests**, svelte-check 0/0, scorecard 17/17. Build sincronizado SOLO a `plugin-dev`, SHA-256 `de58c874`. **Smoke de runtime NO ejecutado**; todo por gates.

## BT5-036 — regresión de cmenus + content link (`0f9fba74`)

BT5-018 proyectaba **todos** los tipos de nodo por el layout de Files, así que props/tags (acciones fuera del catálogo de Files) perdían su menú entero.
`openPanelMenu` deriva ahora el kind del nodeType (`panelMenuKindForNodeType`) y proyecta por el layout/catálogo propio de ese kind;
el probe nativo queda Files-only. Cada kind (files/props/tags/content/snippets/ plugins) tiene su sección configurable en Layout Configuration → context menus, con layout persistido en `contextMenuLayouts` (files sigue en `filesContextMenuLayout`).
**Props/tags recuperan Rename/Delete/Change type.**

Content "with active filters": era un botón repetido en **cada** nodo. Ahora es texto-link (sin chrome de botón) una sola vez en el header del preview, tras el conteo de matches/files, con `stopPropagation` para no togglear el nodo.

Falta (issue [[036-node-menu-actions-and-config|BT5-036]]): registrar las acciones que aún no existen (content rename/delete, snippet rename/delete, plugin uninstall/ see-details) y enrutar snippets/plugins/content por el service. Las destructivas requieren confirmación + smoke.

## BT5-037 — statistics toolbar + card (`871a837e`)

El toolbar de statistics usaba labels/icons propios (nav.files/lucide-folder-tree, nav.filters, lucide-bar-chart-2) distintos a los demás explorers. Ahora sus tabs espejan el toolbar real (mismos `filter.tab.*` labels + icons) para las 4 superficies de datos a las que puede navegar. Card nueva **Opened today**: cuenta files abiertos desde medianoche local, leído directo del store de last-opened (BT5-013); es métrica de uso, ignora los scope pills, refresca en file-open.
`countOpenedSince`/`startOfDay` puros y testeados.

## BT5-038 — badge bubbling del filtro (`6e64f28b`)

**Dos correcciones del dev.** Un padre colapsado que solo **oculta** un filtro activo recibía la decoración completa (`is-active-filter`) como si él mismo fuera filtro. Solo props/tags llevan el cell_highlight (sus value/tag nodes pueden ser filtros) y solo ellos pasan `activeFilterIds`, así que **files no se toca** — su bubbling de operation badges queda igual. La presentación se separa:
`resolveActiveFilterPresentation` devuelve `{exact, bubbled}`; los exact conservan `is-active-filter`, el ancestro colapsado recibe un dot accent en el badge zone (tree) o un dot al final de la columna name (table). El dot va en la row signature (repaint de filas recicladas) y la vista sigue i18n-agnóstica (props/tags dan la label).

Nota del dev: cuestiona si files necesita bubbleDot (BT5-017) — "no se me ocurre el por qué, con operation badges bastaba". No se removió BT5-017 (no fue directiva explícita); anotado para que el dev decida.

## Backlog nuevo abierto (features grandes del dev, no implementadas)

- [[036-node-menu-actions-and-config|BT5-036]] — in-progress: faltan content/ snippets/plugins node actions (rename/delete, uninstall/see-details).
- [[039-toolbar-node-reorder-and-fixed-count|BT5-039]] — nodos del toolbar como lista reordenable + overflow real (wrap/auto-condense/viewhost fijo) + rename "Condense file tools" → "Fixed amount of nodes" con input numérico + nueva sección de toolbar (Tab labels + Toolbar overflow + Fixed amount + reorder).
- [[040-folder-aggregate-cells|BT5-040]] — folders muestran cells agregados (suma recursiva de sus childs: words/props/tasks/fechas).
- [[041-cell-badge-configurable-and-sort|BT5-041]] — cell_badge como cell configurable, separado en table, + sort por badges bidimensional.

## Por qué se checkpointeó

El batch restante son 4+ features grandes y visuales, y el badge bubbling requirió dos correcciones del dev. Implementarlas todas a ciegas (sin smoke) tendría alta tasa de corrección. Se cerró lo verificable (regresión + content + statistics + bubbling) y el resto queda como issues scopeados para que el dev priorice.

## Pendientes

1. **Smoke de runtime** de esta tanda.
2. Priorizar BT5-036 (resto)/039/040/041 con el dev.
3. Decidir si files conserva bubbleDot (BT5-017).
