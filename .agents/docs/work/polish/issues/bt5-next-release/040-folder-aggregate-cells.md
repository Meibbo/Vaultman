---
title: BT5-040 — Folders muestran cells agregados (suma recursiva de sus childs)
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-21T00:25:00
updated: 2026-07-21T00:25:00
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

Aplica a cells sumables (words, props/count, tasks) y potencialmente a fechas
(ej. la más reciente de sus childs) — definir por cell qué agregación tiene sentido
(suma vs. max/min) en triage.

## Acceptance criteria

- [ ] Option persistente en settings/explorer, default off.
- [ ] Con el option on, un folder muestra el cell agregado de sus descendientes
      para los cells sumables activos (words, props, tasks).
- [ ] La agregación es recursiva y estable: el total de un folder incluye los
      totales de sus subfolders, sin doble conteo.
- [ ] Cada cell define su agregación (suma para conteos; fechas = max/min a
      confirmar en triage).
- [ ] Se recalcula al crear/mover/borrar/editar un file dentro del subárbol, sin
      rescans síncronos (reusa el cache de statistics donde aplique).
- [ ] Tree/table/cards reciben comportamiento explícito o quedan declarados N/A.
- [ ] Tests cubren suma recursiva, subfolders anidados, cero y actualización
      incremental.

## Notes

Reutilizar el statisticsCache (words/tasks/props ya cacheados por file) para el
agregado por folder. La suma recursiva se computa sobre el árbol construido.

## Blocked by

None — can start immediately.
