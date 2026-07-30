---
title: BT5-028 — Highlight de archivo activo en Content Explorer
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T10:02:50
updated: 2026-07-19T19:44:42
created_by: codex-gpt-5
updated_by: codex-gpt5
tags: [agent/issue, initiative/polish, release/bt5, active-file]
---

# BT5-028 — Highlight de archivo activo en Content Explorer

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Dar a Content Explorer el mismo contrato de highlight del archivo activo que Files Explorer. Diagnosticar si Content no recibe el active path, no decora su proyección o no repinta al cambiar de leaf; reutilizar el seam compartido más estrecho en vez de copiar estado derivado por vista.

## Acceptance criteria

- [x] El archivo activo usa el mismo estado/clase semántica en Files y Content.
- [x] El highlight responde a open, cambio de leaf/tab, rename, delete y cierre del archivo.
- [x] Funciona con Content enfocado o no y aparece correctamente al reactivar su leaf.
- [x] No confunde active-file con selección, resultado de búsqueda o auto-reveal.
- [x] Cada view mode de Content soportado conserva contraste y un único highlight.
- [x] RED/GREEN prueba el evento de active file y el rerender sin depender de scroll.

## Blocked by

None — can start immediately. Coordinar la matriz runtime con BT5-002.

## Outcome

Completado en `017d8049`. Content observa `file-open`, rename y delete con cleanup simétrico, deduplica publicaciones y aplica `is-active` desde un path independiente del path de reveal;
por tanto el highlight pasivo no dispara scroll ni se confunde con búsqueda/selección.
`contentActiveFile.test.ts` ejecuta open/rename/delete/null/cleanup y el gate completo pasó con Svelte 0/0 y 615 tests.
