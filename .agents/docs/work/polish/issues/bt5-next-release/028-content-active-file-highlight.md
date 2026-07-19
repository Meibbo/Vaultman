---
title: BT5-028 — Highlight de archivo activo en Content Explorer
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T10:02:50
updated: 2026-07-19T10:02:50
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, active-file]
---

# BT5-028 — Highlight de archivo activo en Content Explorer

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Dar a Content Explorer el mismo contrato de highlight del archivo activo que Files
Explorer. Diagnosticar si Content no recibe el active path, no decora su proyección o no
repinta al cambiar de leaf; reutilizar el seam compartido más estrecho en vez de copiar
estado derivado por vista.

## Acceptance criteria

- [ ] El archivo activo usa el mismo estado/clase semántica en Files y Content.
- [ ] El highlight responde a open, cambio de leaf/tab, rename, delete y cierre del archivo.
- [ ] Funciona con Content enfocado o no y aparece correctamente al reactivar su leaf.
- [ ] No confunde active-file con selección, resultado de búsqueda o auto-reveal.
- [ ] Cada view mode de Content soportado conserva contraste y un único highlight.
- [ ] RED/GREEN prueba el evento de active file y el rerender sin depender de scroll.

## Blocked by

None — can start immediately. Coordinar la matriz runtime con BT5-002.
