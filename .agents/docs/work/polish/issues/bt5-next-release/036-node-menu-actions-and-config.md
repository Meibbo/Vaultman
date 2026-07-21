---
title: BT5-036 — Acciones y config de cmenus por nodo (props/tags OK, faltan content/snippets/plugins)
type: issue
status: in-progress
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-21T00:25:00
updated: 2026-07-21T00:25:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, context-menu]
---

# BT5-036 — Acciones y config de cmenus por nodo

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-20/21. Regresión de [[018-files-context-menu-config|BT5-018]].

## Contexto — regresión ya arreglada

BT5-018 hacía que `openPanelMenu` proyectara **todos** los tipos de nodo por el
layout de Files, así que props/tags (y cualquier nodo cuyas acciones no estén en
el catálogo de Files) perdían su menú entero. **Arreglado en `0f9fba74`**:
`openPanelMenu` deriva el kind del nodeType (`panelMenuKindForNodeType`) y proyecta
por el layout/catálogo propio de ese kind; el probe nativo queda Files-only. Cada
kind (files/props/tags/content/snippets/plugins) tiene ya su propia sección
configurable bajo Layout Configuration → context menus, con su layout persistido en
`contextMenuLayouts`. **Props y tags vuelven a mostrar Rename/Delete/Change type.**

## Lo que falta (pedido del dev)

Registrar y enrutar por el service las acciones que aún faltan, para que aparezcan
y sean configurables desde su sección:

- **Content** (nodos de content search, nodeType `content`): Delete y Rename.
  Son files; reutilizar el pipeline de operaciones (queue) como file.rename/delete.
  Requiere cablear un contextmenu en los nodos de `tabContent.svelte` que llame a
  `openPanelMenu` con un ctx de kind content.
- **Snippets** (nodeType `snippet`): Rename y Delete del `.css`. Hoy usan un `Menu`
  inline propio (`openMenu`); enrutar por el service y añadir las acciones.
  **Destructivo (delete de archivo): requiere confirmación y smoke.**
- **Plugins** (nodeType `plugin`): Uninstall y See details (lo que hace Settings al
  pulsar el nombre del plugin). Hoy `Menu` inline; enrutar por el service.
  **Uninstall es destructivo: confirmación + smoke.**

## Acceptance criteria

- [x] props/tags/files enrutan por su propio kind (regresión cerrada, `0f9fba74`).
- [x] cada kind tiene su sección configurable en Layout Configuration → context menus.
- [ ] Content nodes ofrecen Rename/Delete vía el pipeline de operaciones, configurables.
- [ ] Snippets nodes ofrecen Rename/Delete (con confirmación de delete), configurables.
- [ ] Plugins nodes ofrecen Uninstall (con confirmación) y See details, configurables.
- [ ] Ninguna acción destructiva se ejecuta sin confirmación; smoke en runtime.
- [ ] Tests cubren registro, routing por kind y la config de cada nueva acción.

## Notes

Las acciones destructivas (snippet delete, plugin uninstall) se difieren dentro de
este issue por riesgo: escribirlas a ciegas sin smoke es peligroso. Content
rename/delete es más seguro (pasa por el queue). Además el dev quiere los cmenus
del **toolbar** con su propia sección de order/toggle — ver
[[035-condense-tabs-toolbar-option|BT5-035]].

## Blocked by

None — la parte de regresión ya está cerrada; el resto es incremental.
