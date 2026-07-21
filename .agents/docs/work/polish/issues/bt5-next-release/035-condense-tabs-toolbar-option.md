---
title: BT5-035 — Toolbar option "Condense tabs" + cmenus granulares por menú
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-20T22:05:00
updated: 2026-07-20T22:05:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, toolbar, context-menu]
---

# BT5-035 — Toolbar option "Condense tabs" + cmenus granulares por menú

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-20. Se apoya en el patrón de config de cmenus de
[[018-files-context-menu-config|BT5-018]].

## What to build

Añadir una opción del toolbar **`Condense tabs`**, default **on**:

- **On** (default): el selector de tabs es el **tab selector menu** que ya existe
  y funciona correctamente en el toolbar de minimal.
- **Off**: el selector de tabs se convierte en el **tabbar del style preset
  experimental**. En ese modo, el menú deja de contener los tabs (que pasan al
  tabbar) y conserva por ahora solo las escenas que **no son tabs** pero que
  técnicamente siguen siendo scenes: **index · statistics · filters · queue ·
  toolbar**.

Además, requisito transversal: **todos los context menus, incluidos los del
toolbar, deben tener sus propios menús de order/toggle dentro de Layout
Configuration → context menus**, para granularidad — no solo el de Files nodes de
BT5-018. Cada cmenu del producto debe poder configurarse (orden + show/hide de sus
entradas) desde la misma sección.

## Acceptance criteria

- [ ] `Condense tabs` es un setting persistente del toolbar, default on, con
      migración compatible.
- [ ] On: comportamiento actual del tab selector menu, sin regresión en minimal.
- [ ] Off: aparece el tabbar del style preset experimental; los tabs salen del
      menú y el menú retiene solo index/statistics/filters/queue/toolbar.
- [ ] El cambio on/off es runtime, sin recargar, y respeta la estrategia de
      overflow del toolbar (BT5-021).
- [ ] Cada context menu del producto (nodes de Files, toolbar, y los demás) tiene
      su propia sub-page de order/toggle dentro de Layout Configuration → context
      menus, reusando el modelo de BT5-018.
- [ ] La config de cada cmenu persiste por id estable y hace merge contra el
      catálogo runtime como en BT5-018.
- [ ] Tests cubren ambos modos de Condense tabs, el traslado de tabs↔tabbar y la
      config independiente de al menos dos cmenus distintos.

## Notes

Grande y con superficie visual: dividir en slices (Condense tabs primero; la
generalización de cmenus config después, extendiendo el modelo de BT5-018). El
tabbar experimental ya existe como style preset — reusarlo, no reimplementarlo.
HITL: el dev valida el reparto tabs vs. scenes y el aspecto del tabbar.

## Blocked by

Se apoya en BT5-018 (modelo de config de cmenus) y BT5-021 (overflow del toolbar).
