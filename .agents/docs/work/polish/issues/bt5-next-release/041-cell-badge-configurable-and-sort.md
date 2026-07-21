---
title: BT5-041 — cell_badge como cell configurable, separado en table, y sort por badges
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
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, cells, sort]
---

# BT5-041 — cell_badge configurable + sort por badges

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-20/21.

## What to build

1. **cell_badge como option_cell del view mode.** Hoy la zona de badges
   (operations badges + bubble dots + el dot de filtro de BT5-038) se renderiza
   siempre. Convertirla en un cell configurable del view menu (como los demás
   cells), y **separarlo del cell en table mode** (columna propia de badges,
   distinta de la columna de cell).
2. **Sort por cell_badges.** Añadir un sort option por badges que sea
   **bidimensional**: ordena por (a) número de badges del nodo y (b) qué badges
   tiene (tipo/prioridad). Definir el orden canónico de tipos de badge y el
   desempate en triage.

## Acceptance criteria

- [ ] El badge zone es un cell registrado (option_cell) que se puede activar/
      desactivar desde el view menu como los demás cells.
- [ ] En table mode el badge tiene su propia columna, separada de la columna cell.
- [ ] Sort por badges ordena por número de badges y por tipo/prioridad de badge
      (bidimensional), con desempate determinista (ej. Name).
- [ ] Default off / posición canónica confirmada en triage; saved configs migran.
- [ ] Tree/table/cards reciben comportamiento explícito.
- [ ] Tests cubren el cell toggle, la separación en table y el sort bidimensional
      (número + tipo).

## Notes

Se apoya en el registro de cells (`logicCellRegistry`) de BT5-010 y en el badge
bubbling de BT5-017/038. El sort bidimensional necesita un modelo claro del orden
de tipos de badge (operations/conflict/queue/filter-dot).

## Blocked by

None — can start immediately.
