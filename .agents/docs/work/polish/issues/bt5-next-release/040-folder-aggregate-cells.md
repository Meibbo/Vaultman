---
title: BT5-040 — Folders muestran cells agregados (suma recursiva de sus childs)
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-21T00:25:00
updated: 2026-07-21T08:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, cells]
---

# BT5-040 — Folders muestran cells agregados (suma recursiva)

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-21.

## What to build

Un option en Layout Configuration → Explorer que, al activarlo, hace que los
**folders del Files explorer** muestren cells (además de badges), como un **total
de la suma de un cell/count de sus childs** — words, props, tasks, etc. La suma es
**recursiva**: si un folder contiene un subfolder cuyo cell (ej. tasks) es a su vez
la suma de sus childs, ese total del subfolder es otro sumando del total del folder
padre (L1).

Aplica a cells sumables (words, props/count, tasks) — solo cells sumables (conteos).

## Acceptance criteria

- [ ] Option persistente en settings/explorer, default off.
- [ ] Con el option on, un folder muestra el cell agregado de sus descendientes
      para los cells sumables activos (words, props, tasks).
- [ ] La agregación es recursiva y estable: el total de un folder incluye los
      totales de sus subfolders, sin doble conteo.
- [ ] Se recalcula al crear/mover/borrar/editar un file dentro del subárbol, sin
      rescans síncronos (reusa el cache de statistics donde aplique).
- [ ] Tree/table/cards reciben comportamiento explícito o quedan declarados N/A.
- [ ] Tests cubren suma recursiva, subfolders anidados, cero y actualización
      incremental.

## Notes

Reutilizar el statisticsCache (words/tasks/props ya cacheados por file) para el
agregado por folder. La suma recursiva se computa sobre el árbol construido.

## Outcome 2026-07-21

**Commit `b4b625f7`.** Setting opt-in (default off): los folders del Files tree
muestran la suma recursiva de los cells contables de sus files — properties, words y
remaining tasks — incluyendo los totales de sus subfolders (contados una sola vez).
Pase post-order puro que reusa el statisticsCache para words/tasks (ningún file se
re-lee). **Fechas excluidas** (sin valor acumulativo con sentido): se recortó ese
criterio del scope original. Default off → folders sin cambio hasta activar. Detalle:
[[docs/work/polish/plans/2026-07-19-bt5-next-10/11-post-beta6-bubbledot-island-iconscope-folder-totals|shard 11]].

## Blocked by

None — done.
