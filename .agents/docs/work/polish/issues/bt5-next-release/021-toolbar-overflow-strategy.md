---
title: "BT5-021 — Overflow toolbar: condensed o scroll horizontal"
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-021 — Overflow toolbar: condensed o scroll horizontal

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir en Settings/Toolbar una estrategia de overflow:
`Condensed menu` —comportamiento actual responsive— o `Horizontal scroll`. En scroll,
todos los action nodes aplicables permanecen en la barra en una sola línea desplazable;
en condensed, el threshold y el force-menu actuales siguen trasladando acciones al Tools
menu. Esto es independiente de que BT5-006 retire una acción contextual inútil.

## Acceptance criteria

- [ ] El setting es un enum persistente, default Condensed menu, con migración del booleano actual.
- [ ] Condensed conserva auto-condense por width y la preferencia manual vigente.
- [ ] Horizontal scroll desactiva el traslado a Tools por width, evita wrap y mantiene todos los nodos accesibles.
- [ ] Wheel/trackpad/touch y keyboard pueden recorrer la barra; focus hace scroll-into-view.
- [ ] Una pista visual accesible —scrollbar o fade/edge equivalente— indica que existen acciones fuera del viewport.
- [ ] No se pierde el primer/último action node ni se superpone el searchbox.
- [ ] Añadir/quitar nodos o cambiar nested recalcula overflow sin resize loop.
- [ ] Tests cubren ambos modos, widths estrechos, cambio runtime y migración.

El trade-off aceptado es que scroll conserva cada nodo en su lugar pero reduce la
descubribilidad frente a un único Tools menu; por eso la pista de overflow es parte del
feature, no polish opcional.

## Blocked by

None — can start immediately.
