---
title: BT5-006 — Collapse/expand contextual a nested
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T19:44:42
created_by: codex-gpt-5
updated_by: codex-gpt5
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-006 — Collapse/expand contextual a nested

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Mostrar Collapse/expand all solo cuando el explorer activo soporta expansión y su
configuración `nested` está encendida. Con `nested=off`, retirar únicamente ese action
node tanto del toolbar directo como del Tools menu; no apagar ni puentear la capacidad
de condensación/overflow del toolbar.

## Acceptance criteria

- [x] Files, Props y Tags muestran la acción únicamente con nested activo.
- [x] Con nested off no existe ni el botón directo ni la entrada equivalente en Tools.
- [x] Cambiar nested actualiza la acción inmediatamente, sin estado stale.
- [x] El resto de acciones sigue condensándose o desplazándose según BT5-021.
- [x] Un toolbar estrecho conserva acceso a todos los action nodes restantes.
- [x] Tests cubren toolbar expandido, condensed menu y cambio runtime de nested.

## Blocked by

None — can start immediately; debe integrar con BT5-021 sin depender de su orden.

## Outcome

Completado en `f1dbe2f5`. `expansionActionAvailable` deriva la disponibilidad desde tab y
`visibleCells`; el botón directo y la entrada Tools desaparecen con `nested=off`, mientras
Auto-reveal y el mecanismo de overflow permanecen disponibles. Cubierto por
`expansionAvailability.test.ts`, guards de navbar y el gate completo de 615 tests.
