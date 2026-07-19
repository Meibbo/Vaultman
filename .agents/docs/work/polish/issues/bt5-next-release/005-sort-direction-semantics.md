---
title: BT5-005 — Semántica global de sort arrows y defaults
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-036
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T12:43:51
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-005 — Semántica global de sort arrows y defaults

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra
BT4-036 y absorbe D4 del reporte 2026-07-19.

## What to build

Auditar cada sort option como tupla `comparador + dirección inicial + icono mostrado`.
La flecha representa el flujo físico de la lista: ascendente con valores menores/A arriba
y mayores/Z abajo apunta hacia abajo; descendente apunta hacia arriba. Remaining tasks
debe activarse primero descendente y alternar después a ascendente.

## Acceptance criteria

- [x] Existe inventario testado de todos los sort options y sus defaults intencionales.
- [x] El icono coincide con el orden real producido, incluida cada superficie de sort.
- [x] Name asc ordena por `file.name`; Path asc ordena por `file.path`.
- [x] Remaining tasks: primer click desc, segundo asc, con iconos coherentes.
- [x] Persistencia/restauración de sort no invierte dirección ni icono.
- [x] Los casos scoped/By level usan la misma semántica y no una convención paralela.

## Blocked by

None — can start immediately.

## Outcome

Completado en `c60e3bc7`. `nextExplorerSortDirection`, `sortDirectionGlyph` y
`sortDirectionIcon` centralizan defaults/toggle/presentación para popup, menú nativo,
Table y Content. Remaining Tasks entra `desc` y alterna a `asc`; Name compara
`file.name`, Path compara `file.path`. El adaptador de Table también transporta
`getTaskCount`, evitando el fallback previo a Name.
