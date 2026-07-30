---
title: BT5-012 — Path visible en Files plano
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T16:30:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-012 — Path visible en Files plano

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Cuando Files usa `nested=off`, ofrecer cell option `Path` como proyección alternativa del label: apagado muestra `file.name`; encendido muestra `file.path`, que ya incluye el filename. No crea una segunda columna textual duplicada. Mantener sort Name y sort Path como criterios independientes, acercando el comportamiento al modelo de Bases de Obsidian.

## Acceptance criteria

- [x] Path cell option solo es visible/aplicable con nested off.
- [x] Path off muestra exactamente `file.name`; Path on muestra exactamente `file.path`.
- [x] Sort Name siempre compara `file.name`, independientemente del label visible.
- [x] Sort Path siempre compara `file.path` y permanece oculto con nested on.
- [x] Duplicados de filename en carpetas distintas son distinguibles visualmente en modo Path.
- [x] Tree/table/cards y hover accesible muestran el valor coherente sin overflow destructivo.
- [x] Saved configs restauran el modo y configs antiguas conservan Name por default.

## Blocked by

[[010-shared-cell-registry-hover-info|BT5-010]].

## Outcome 2026-07-20

**Commit `7c2f5928`.** Gate `pnpm run verify` verde: 121 files / 796 tests, svelte-check 0/0, scorecard 17/17. Test focal `test/unit/flatPathCell.test.ts`.

Hallazgo que reorientó el issue: el modo plano ya producía una etiqueta híbrida `folder/basename`, que no era ni el nombre ni la ruta. Confirmada la decisión 5 del índice BT5: `Path` off = `file.name` exacto, `Path` on = `file.path` exacto, ambas absolutas incluso con la vista rebasada por drill-in.

`path` se declara `requiresCellsOff: ['nested']` en el registry, así que el gate vive en un único sitio (`cellAvailable`) y sirve al menú y a la proyección de render. El array persistido nunca se reescribe: apagar Nested devuelve la elección previa intacta. Los sorts Name/Path ya eran independientes del label y `path` ya se ocultaba con nested on; ambos AC tienen ahora guard propio.

Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].

Pendiente: smoke de runtime; decidir si el label plano en modo Name debe ocultar `.md` (hoy `file.name` lo incluye, el hover `label` no).
