---
title: BT5-033 — View Compositions capturan todo el estado del Layout
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-20T22:05:00
updated: 2026-07-20T22:05:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, compositions]
---

# BT5-033 — View Compositions capturan todo el estado del Layout

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-20 tras el rename a View Compositions y el seeding de defaults.

## What to build

Hoy una View Composition (`SavedLayout`) guarda solo, por tab: `viewMode`,
`visibleCells`, `sortState`, `interactionMode`, más `floatingToc`. Le faltan **el
resto de parámetros y opciones que viven bajo Layout Configuration**, que son
globales del frame y deberían formar parte de la composición:

- `showDock` (mostrar el dock inferior).
- `showToolbar` (mostrar el toolbar; hoy `toolbarShown`/`showToolbar` es global).
- Y en general el resto de opciones de Layout Configuration que afectan el
  aspecto: `minimalStyle`, `orderCellsByActivation`, `sortLevelInline`,
  `toolbarOverflowStrategy`, `createActionsPlacement`, `iconInCaretSlot`,
  glyph color (`explorerGlyphColor`/scope/custom), etc. — auditar Layout
  Configuration y decidir cuáles son "estado de composición" vs. preferencia
  global permanente.
- **`filesIconScope`**, que además debe **renombrarse a `node icon scope`** y
  **moverse dentro de Layout Configuration → Explorer menu** (hoy vive suelto).

## Acceptance criteria

- [ ] `SavedLayout` gana un bloque de settings de frame (al menos showDock,
      showToolbar) capturado al guardar y restaurado al cargar.
- [ ] Se audita Layout Configuration y se clasifica cada opción como
      composition-scoped o global-permanent, documentando el criterio.
- [ ] `filesIconScope` se renombra a node icon scope en la UI y se ubica dentro
      de Layout Configuration → Explorer menu; la key persiste con migración.
- [ ] Cargar una composición aplica y revierte esos settings sin dejar estado
      cruzado entre composiciones.
- [ ] Configs viejas (sin el bloque nuevo) cargan con un default seguro.
- [ ] Tests cubren save/load del bloque nuevo, migración de la key y ausencia de
      fugas entre composiciones.

## Notes

Depende de decidir el límite composition vs. global; conviene grill con el dev
antes de fijar la lista. El seeding de defaults (Basic list / Preview) ya existe
y deberá regenerarse para incluir el bloque nuevo.

## Blocked by

None — can start immediately.
