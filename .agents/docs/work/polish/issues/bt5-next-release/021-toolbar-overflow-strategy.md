---
title: "BT5-021 — Overflow toolbar: condensed o scroll horizontal"
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T19:20:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-021 — Overflow toolbar: condensed o scroll horizontal

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir en Settings/Toolbar una estrategia de overflow:
`Condensed menu` —comportamiento actual responsive— o `Horizontal scroll`. En scroll, todos los action nodes aplicables permanecen en la barra en una sola línea desplazable;
en condensed, el threshold y el force-menu actuales siguen trasladando acciones al Tools menu. Esto es independiente de que BT5-006 retire una acción contextual inútil.

## Acceptance criteria

- [x] El setting es un enum persistente, default Condensed menu, con migración del booleano actual.
- [x] Condensed conserva auto-condense por width y la preferencia manual vigente.
- [x] Horizontal scroll desactiva el traslado a Tools por width, evita wrap y mantiene todos los nodos accesibles.
- [x] Wheel/trackpad/touch y keyboard pueden recorrer la barra; focus hace scroll-into-view.
- [x] Una pista visual accesible —scrollbar o fade/edge equivalente— indica que existen acciones fuera del viewport.
- [x] No se pierde el primer/último action node ni se superpone el searchbox.
- [x] Añadir/quitar nodos o cambiar nested recalcula overflow sin resize loop.
- [x] Tests cubren ambos modos, widths estrechos, cambio runtime y migración.

El trade-off aceptado es que scroll conserva cada nodo en su lugar pero reduce la descubribilidad frente a un único Tools menu; por eso la pista de overflow es parte del feature, no polish opcional.

## Blocked by

None — can start immediately.

## Outcome 2026-07-20 (tarde)

**Commit `57739ac5`.** Gate verde, scorecard 17/17. Test focal `test/unit/toolbarOverflowStrategy.test.ts`. Enum `toolbarOverflowStrategy` (default condensed). Scroll apaga auto-condense y el traslado a Tools, pone la barra en una sola línea con scroll horizontal, fade de overflow en el borde y `scroll-margin` para focus. Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/08-bt5-014-021-022-023-024|shard 08]].

Pendiente: smoke de la UX de scroll; relocalización a Tools en condensed (diferido, no aplica a scroll).
