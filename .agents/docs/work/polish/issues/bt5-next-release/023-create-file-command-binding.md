---
title: BT5-023 — Create File enlazable a comando Obsidian
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T19:20:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-023 — Create File enlazable a comando Obsidian

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Permitir que el action node Create File ejecute `Vaultman default` o un comando elegido
del registry de Obsidian. La elección se resuelve por command id al invocar y aplica tanto
en searchbox como toolbar; no copiar callbacks ni labels internos del comando.

## Acceptance criteria

- [x] Settings ofrece selector buscable `Vaultman default | Obsidian command` y guarda command id estable.
- [x] Invocar Create File ejecuta exactamente el binding seleccionado desde cualquier placement.
- [x] Comando ausente/deshabilitado muestra estado reparable y usa fallback seguro explícito; nunca falla silenciosamente.
- [x] Cambios en el registry de comandos se reflejan al reabrir settings/invocar sin cache stale.
- [x] Reset vuelve al action built-in de Vaultman.
- [x] Tests cubren default, command válido, command retirado y ambos placements.

## Blocked by

None — can start immediately. Su resolver será reutilizado por BT5-024.

## Outcome 2026-07-20 (tarde)

**Commit `3973ed29`.** Gate verde. Test focal `test/unit/commandActions.test.ts`.
Resolver puro `logicCommandActions` + accessor defensivo `utils/obsidianCommands`.
Create File puede ejecutar un comando elegido, resuelto por id al invocar; ausente/
deshabilitado avisa y cae al built-in. Selector buscable (FuzzySuggestModal) con
Vaultman default primero; reset vuelve al built-in. Aplica desde cualquier
placement. Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/08-bt5-014-021-022-023-024|shard 08]].

Pendiente: smoke de runtime.
