---
title: BT5-017 — Badge bubbling visible solo colapsado
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-035
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-017 — Badge bubbling visible solo colapsado

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-035.

## What to build

Cuando un descendiente oculto por colapso contiene un badge/cell activo, proyectar en el
parent un círculo pequeño del color activo. El indicador existe solo mientras el parent
está colapsado; al expandirlo desaparece porque el origen vuelve a ser visible.

## Acceptance criteria

- [ ] Parent colapsado con descendiente activo muestra el círculo con el color semántico correcto.
- [ ] Parent expandido no muestra el indicador duplicado.
- [ ] Sin descendientes activos no se reserva espacio ni se crea DOM decorativo vacío.
- [ ] Cambios de filtro, cell, color y expansión actualizan la proyección sin full-tree scan por frame.
- [ ] Varios descendientes siguen una regla de color/prioridad determinista y testada.
- [ ] El círculo tiene descripción accesible sin convertirse en action node accidental.

## Blocked by

None — can start immediately.
