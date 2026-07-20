---
title: BT5-008 — Tags toolbar refleja scope externo
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-009-residual-tags-scope
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T19:44:42
created_by: codex-gpt-5
updated_by: codex-gpt5
tags: [agent/issue, initiative/polish, release/bt5]
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

- [x] Un cambio externo de scope actualiza label, selección y opciones contextuales de Tags.
- [x] Cambiar scope desde el toolbar sigue actualizando el estado compartido.
- [x] No hay ping-pong ni save/render loop entre ambas direcciones.
- [x] Carga de View config y sync index↔sort quedan cubiertos por tests.
- [x] Files conserva su comportamiento actual como control de paridad.

## Blocked by

None — can start immediately.

## Outcome

Completado en `f1dbe2f5`. Tags publica cambios externos efectivos mediante el mismo seam
guardado que Files. El handshake distingue primera conexión —panel lazy recibe el estado
autoritativo del navbar— de reconexión —un navbar remontado recupera el estado persistente
del panel—, cerrando tanto View config antes del primer mount como Tags→Content→Tags sin
ping-pong. `tagsScopeSync.test.ts` cubre ambos sentidos y el gate completo pasó 615 tests.
