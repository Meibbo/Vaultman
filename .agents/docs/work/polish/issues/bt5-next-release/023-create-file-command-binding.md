---
title: BT5-023 — Create File enlazable a comando Obsidian
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-023 — Create File enlazable a comando Obsidian

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Permitir que el action node Create File ejecute `Vaultman default` o un comando elegido
del registry de Obsidian. La elección se resuelve por command id al invocar y aplica tanto
en searchbox como toolbar; no copiar callbacks ni labels internos del comando.

## Acceptance criteria

- [ ] Settings ofrece selector buscable `Vaultman default | Obsidian command` y guarda command id estable.
- [ ] Invocar Create File ejecuta exactamente el binding seleccionado desde cualquier placement.
- [ ] Comando ausente/deshabilitado muestra estado reparable y usa fallback seguro explícito; nunca falla silenciosamente.
- [ ] Cambios en el registry de comandos se reflejan al reabrir settings/invocar sin cache stale.
- [ ] Reset vuelve al action built-in de Vaultman.
- [ ] Tests cubren default, command válido, command retirado y ambos placements.

## Blocked by

None — can start immediately. Su resolver será reutilizado por BT5-024.
