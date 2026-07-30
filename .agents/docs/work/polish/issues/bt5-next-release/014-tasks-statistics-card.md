---
title: BT5-014 — Card Tasks en Statistics
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-032
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T19:20:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-014 — Card Tasks en Statistics

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-032.

## What to build

Añadir a Statistics una card Remaining tasks que consuma el cache reparado y respete los tres scopes existentes de la página. No volver a leer archivos ni mantener un contador paralelo; la card es una proyección agregada del servicio compartido.

## Acceptance criteria

- [x] La card aparece con copy/icono coherentes y valor total para cada uno de los tres scopes.
- [x] Cambiar scope recalcula desde snapshots/cache sin rescans síncronos.
- [x] Hydration/backfill actualiza el valor progresivamente y distingue loading de cero real.
- [x] Modificar, crear, mover o borrar un file actualiza la agregación.
- [x] Tests cubren scopes, datos parciales, cero y actualizaciones incrementales.

## Blocked by

[[003-remaining-tasks-availability-pipeline|BT5-003]].

## Outcome 2026-07-20 (tarde)

**Commit `8efd427e`.** Gate verde (final 880 tests), scorecard 17/17. Test focal `test/unit/statisticsTasksCard.test.ts`. `computeSnapshot` suma el conteo de tareas cacheado por archivo a un total `tasks` del snapshot; la card lo proyecta, respeta los tres scopes sin rescan, hidrata progresivamente y se invalida por el pipeline.
Snapshots viejos default-ean `tasks` a 0. Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/08-bt5-014-021-022-023-024|shard 08]].

Pendiente: smoke de runtime.
