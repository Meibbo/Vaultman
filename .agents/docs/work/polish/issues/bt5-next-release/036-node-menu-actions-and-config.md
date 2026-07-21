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
- [x] Content nodes ofrecen Rename/Delete vía prompts nativos, configurables.
- [ ] Snippets nodes ofrecen Rename/Delete — **BLOCKED** (sin modal nativo, ver abajo).
- [ ] Plugins nodes ofrecen Uninstall y See details — **BLOCKED** (sin modal nativo).
- [x] Ninguna acción destructiva se ejecuta sin confirmación (content = confirm core).
- [x] Tests cubren registro, routing por kind y la config de content (`contentContextMenu.test.ts`).

## Progreso 2026-07-21 (slice content)

**Content rename/delete LISTO — commit `e0945039`.**
`src/logic/logicContentContextMenu.ts` registra
`content.rename` y `content.delete` (nodeType `content`, surface `panel`) vía los
**prompts nativos de Obsidian** (`fileManager.promptForFileRename` /
`promptForFileDeletion`) — el delete respeta el setting core "Confirm file deletion",
que es el modal nativo que pediste reusar. `registerContentActions(this)` se llama
una vez en `main.ts`; `tabContent.svelte` gana `oncontextmenu` en el header del file
→ `pageFilters.svelte` `openContentContextMenu` → `openPanelMenu({nodeType:'content'})`.
El menú de content queda configurable en su sección. Smoke `plugin-dev`: nodo content
resuelve `content.rename`/`content.delete` con labels correctos, prompts nativos
presentes. Test `contentContextMenu.test.ts`.

## ⚠ BLOCKER — snippet delete / plugin uninstall NO tienen modal nativo

Sondeo en `plugin-dev`: **Obsidian NO ofrece un modal de confirmación nativo** para
desinstalar un plugin (`plugins.uninstallPlugin(id)` no confirma; no existe
`showDetails`/`openDetails`) ni para borrar un snippet (los `.css` viven en
`.obsidian/snippets`, config dir, no son TFiles → `promptForFileDeletion` no aplica).
Tu instrucción fue "usa el modal nativo que ya ofrece Obsidian, no inventes uno".
Como para estos dos casos **no existe uno nativo**, quedan **bloqueados esperando tu
decisión**:
- **Opción A (recomendada, native-faithful):** la acción abre la superficie nativa de
  Obsidian donde el usuario ejecuta el destroy él mismo — Community plugins tab
  (uninstall) / carpeta de snippets. Sin modal por-item propio.
- **Opción B:** aceptar la acción destructiva con solo un `Notice`, sin confirm (no
  recomendado).
- **Opción C:** permitir reusar un `Modal` genérico de Obsidian (técnicamente es
  "inventar" uno; lo excluiste).

El resto de snippet/plugin (rename de snippet, "see details" de plugin) también carece
de superficie nativa limpia; se difiere junto al blocker para no churnear.

## Notes

Content rename/delete = prompts nativos (elegido sobre el queue por tu regla del modal
nativo). Además el dev quiere los cmenus del **toolbar** con su propia sección de
order/toggle — ver [[035-condense-tabs-toolbar-option|BT5-035]].

## Blocked by

None — la parte de regresión ya está cerrada; el resto es incremental.
