---
title: BT5-008 — Tags toolbar refleja scope externo
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-009-residual-tags-scope
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-008 — Tags toolbar refleja scope externo

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Parte del
residual de BT4-009.

## What to build

Hacer que el toolbar de Tags proyecte cambios de scope originados fuera de él —por
ejemplo sync desde floating index o carga de View config— con la misma paridad ya
existente en Files. El estado autoritativo debe ser único y el toolbar solo una vista.

## Acceptance criteria

- [ ] Un cambio externo de scope actualiza label, selección y opciones contextuales de Tags.
- [ ] Cambiar scope desde el toolbar sigue actualizando el estado compartido.
- [ ] No hay ping-pong ni save/render loop entre ambas direcciones.
- [ ] Carga de View config y sync index↔sort quedan cubiertos por tests.
- [ ] Files conserva su comportamiento actual como control de paridad.

## Blocked by

None — can start immediately.
