---
title: "BT5 shard 12: BT5-036 content slice + native-confirm blocker (snippet/plugin)"
type: verification
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-21T09:15:00
updated: 2026-07-21T09:15:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/verification, initiative/polish, release/bt5, context-menu]
---

# Shard 12 — BT5-036 content slice + native-confirm blocker

Sesión del 2026-07-21, `claude-opus-4-8`. Continuación del batch AFK post-beta.6
(uno-a-uno + smoke, decisión del dev). Worktree `C:/tmp/vaultman-release-beta2-final2`,
rama `codex/bt5-next-10`, base `b4b625f7` → HEAD **`e0945039`**.

## Commit de producto

| Commit | Qué |
|---|---|
| `e0945039` | BT5-036 slice content: Rename/Delete configurable en nodos de content search |

Gate: **141 files / 919 tests**, svelte-check 0/0, eslint/prettier/stylelint/build
verdes, scorecard 17/17. **Smoked en `plugin-dev`.**

## Qué se hizo (content)

Los nodos de content search son files reales, así que su panel menu ahora ofrece
Rename y Delete:

- `src/logic/logicContentContextMenu.ts` (nuevo): `registerContentActions(plugin)`
  registra `content.rename` y `content.delete` (nodeType `content`, surface `panel`)
  vía los **prompts nativos de Obsidian** — `fileManager.promptForFileRename` y
  `promptForFileDeletion`. El delete usa el **modal de confirmación nativo** (respeta
  el setting core "Confirm file deletion") en vez de un dialog propio. `contentMenuNode`
  arma un TreeNode mínimo con el file en `meta`.
- `main.ts`: `registerContentActions(this)` una vez tras crear el ContextMenuService,
  así el kind `content` queda poblado y **configurable** en Layout Configuration →
  context menus como los demás.
- `tabContent.svelte`: `oncontextmenu` en el header del file + prop
  `onContentContextMenu`.
- `pageFilters.svelte`: `openContentContextMenu` enruta por
  `openPanelMenu({nodeType:'content', node, surface:'panel', file})`.
- Test `contentContextMenu.test.ts`: registro, routing por prompts nativos, no-op sin
  file, y source-guards del wiring.

**Smoke `plugin-dev`:** tras reload, `panelActionCatalog('content')` =
`[content.rename, content.delete]`; un nodo content real resuelve ambas acciones con
labels correctos (`Rename "…"` / `Delete "…"`); `promptForFileRename` y
`promptForFileDeletion` presentes.

## ⚠ BLOCKER — snippet delete / plugin uninstall sin modal nativo

Sondeo por el bridge (`obsidian eval`):
- `app.plugins.uninstallPlugin(id)` — arity 1, **no confirma**. No existe
  `showDetails`/`openDetails`; la community-plugins tab solo expone `render`/
  `renderInstalledPlugin` (render en la tab, no un modal por-plugin).
- Snippets = `.obsidian/snippets/*.css` (config dir) → **no son TFiles**, así que
  `promptForFileDeletion` no aplica.

Conclusión: **Obsidian no ofrece modal de confirmación nativo** para estos dos casos.
El dev instruyó "usa el modal nativo, no inventes uno". Como no existe, snippet-delete,
plugin-uninstall (y "see details") quedan **bloqueados esperando decisión del dev**.
Opciones registradas en el issue: (A, recomendada) abrir la superficie nativa de
settings donde el user ejecuta el destroy; (B) destructivo con solo Notice, sin
confirm; (C) permitir reusar un `Modal` genérico (= "inventar", excluido).

## Estado del tren

Código AFK restante: **035, 039, 041**. **036 resto = BLOCKED** (arriba).
**033-core = grill-gated**. HITL: 018/026/027 + gates release 002/003/004.
Preflight v1.2.0 stable sin publicar.
