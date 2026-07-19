---
title: BT5-024 — Comandos Obsidian como acciones de toolbar
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

# BT5-024 — Comandos Obsidian como acciones de toolbar

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir en Settings/Toolbar una lista ordenada de comandos de Obsidian que se proyecta
como action nodes del toolbar. Reusar el resolver seguro de BT5-023 y metadata del command
registry; soportar add/remove/reorder sin importar la arquitectura ActionNode 2.0.

## Acceptance criteria

- [ ] El dev/usuario puede buscar, añadir, quitar y reordenar command ids; default lista vacía.
- [ ] Añadir un comando es una acción explícita y Settings advierte que el toolbar lo ejecutará inmediatamente al activarlo.
- [ ] Cada acción muestra label/icon disponibles del registry y ejecuta el command id correcto.
- [ ] Duplicados se previenen o normalizan de forma explícita y testada.
- [ ] Comandos retirados permanecen como entrada reparable/disabled con warning, no desaparecen silenciosamente.
- [ ] Condensed menu y horizontal scroll tratan estas acciones como cualquier nodo del toolbar.
- [ ] Keyboard, tooltip y aria exponen el nombre del comando.
- [ ] Persistencia hace merge seguro entre desktop/mobile y plugins habilitados/deshabilitados.
- [ ] No se soportan parámetros, macros ni auto-run; solo invocación manual del command id registrado.
- [ ] Tests cubren orden, ejecución, missing command, overflow y teardown.

## Blocked by

[[023-create-file-command-binding|BT5-023]].
