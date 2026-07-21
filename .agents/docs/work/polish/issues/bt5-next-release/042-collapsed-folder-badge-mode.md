---
title: BT5-042 — Toggle de actividad de folder colapsado (dot único vs badges de descendientes)
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-21T02:00:00
updated: 2026-07-21T07:15:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5, badges]
---

# BT5-042 — Toggle de actividad de folder colapsado

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Pedido del
dev el 2026-07-21 tras la corrección del badge bubbling (BT5-038). NO quitar BT5-017.

## What to build

Un option para intercambiar cómo un folder colapsado muestra el estado que oculta:

- **Un dot indicativo** (default): el bubble dot único de BT5-017 — el folder señala
  que sus childs tienen actividad (una operación pendiente o un filtro activo) con un
  solo dot.
- **Badges de descendientes**: los badges propios de los descendientes suben al folder
  colapsado (deduplicados, marcados inherited y no removibles) junto al dot de filtro,
  para leer el estado exacto oculto.

## Outcome 2026-07-21

**Commit `ff083b91`.** Gate verde (909 tests), scorecard 17/17. Test focal
`test/unit/collapsedFolderBadges.test.ts`. Setting `collapsedFolderBadges`
(`dot` default | `badges`). `collectDescendantBadges` agrega los badges de
descendientes por carrier colapsado. Expandir sigue revelando los badges reales; los
copiados solo existen colapsado. Default = comportamiento actual (dot), sin regresión.

Nota: BT5-017 (files bubbleDot) se conserva por instrucción del dev.

## Blocked by

None.
