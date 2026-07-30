---
title: BT5-016 — Grid a Cards y box de altura natural
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-029
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-016 — Grid a Cards y box de altura natural

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-029.

## What to build

Renombrar el engine/view mode de usuario `Grid` a `Cards` y hacer que una card sin cells activos colapse a la altura de su contenido en lugar de reservar el box informativo vacío.
Mantener compatibilidad de valores persistidos `grid` mediante normalización/migración.

## Acceptance criteria

- [ ] Copy visible, settings, menus y documentación usan Cards.
- [ ] Configs legacy con `grid` cargan como Cards sin pérdida de layout.
- [ ] Sin cells activos, la card no reserva altura de metadata vacía.
- [ ] Al activar cells, la altura y wrapping crecen de forma estable.
- [ ] Virtualización/medición no produce solapamiento, blank frames ni saltos acumulativos.
- [ ] Tests cubren migración, zero-cells y varios cells/wrapping.

## Blocked by

None — can start immediately.
