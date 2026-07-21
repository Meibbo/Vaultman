---
title: BT5-039 — Reorder de nodos del toolbar, overflow real y "Fixed amount of nodes"
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-21T00:25:00
updated: 2026-07-21T00:25:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, toolbar]
---

# BT5-039 — Reorder de nodos del toolbar, overflow real y "Fixed amount of nodes"

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-21. Extiende [[021-toolbar-overflow-strategy|BT5-021]] y
[[035-condense-tabs-toolbar-option|BT5-035]].

## What to build

1. **Nodos candidatos a reorder / overflow del toolbar.** Hoy el overflow del
   toolbar (BT5-021) trata como movibles solo `auto-reveal` y `expand/collapse`,
   **hardcodeados**. Hay que modelar el conjunto real de action nodes del toolbar
   como una lista reordenable (igual que las otras listas de reorder del producto)
   y que la estrategia de overflow opere sobre esa lista:
   - Cuándo hacer wrap (comportamiento por defecto actual).
   - Auto-condense por width.
   - Viewhost fijo con scroll horizontal para navegar el toolbar.
2. **Renombrar el option "Condense file tools" → "Fixed amount of nodes"** con un
   **input numérico** (cuántos nodos se mantienen fijos en la barra antes de
   condensar/desbordar).
3. **Nueva sección de toolbar.** Mover ahí los options **"Tab labels"** y
   **"Toolbar overflow"** junto al nuevo "Fixed amount of nodes", y añadir la
   lista reordenable de nodos del toolbar (mismo patrón DnD que los otros
   reorder).

## Acceptance criteria

- [ ] Los action nodes del toolbar son una lista reordenable persistida, no un set
      hardcodeado; la estrategia de overflow opera sobre ella.
- [ ] Wrap por defecto, auto-condense por width y viewhost fijo con scroll son las
      opciones de overflow, coherentes con BT5-021.
- [ ] "Condense file tools" pasa a "Fixed amount of nodes" con input numérico y
      migración del setting previo.
- [ ] Existe una sección de toolbar en settings con Tab labels + Toolbar overflow +
      Fixed amount of nodes + la lista reordenable de nodos.
- [ ] Reordenar/condensar no rompe searchbox, primer/último nodo ni provoca resize
      loop.
- [ ] Tests cubren reorder, los tres modos de overflow, la migración y el clamp
      numérico.

## Notes

Grande y visual; dividir en slices. El scroll horizontal ya existe como base
(BT5-021); falta el modelo reordenable y el "fixed amount". Requiere smoke.

## Blocked by

Se apoya en BT5-021 (overflow) y comparte superficie con BT5-035 (condense tabs).
