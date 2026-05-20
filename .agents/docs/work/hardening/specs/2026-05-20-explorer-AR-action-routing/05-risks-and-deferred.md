---
title: A.R Risks, Non-goals, Forward-compat seams, Deferred
type: spec-shard
status: draft
parent: "[[index|A.R Action Routing]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T00:00:00
---

# Risks, Non-goals, Forward-compat, Deferred

## Riesgos + mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambiar la semántica de mouse (primary=`filter`) al unificar | Regresión de comportamiento visible | A.R rutea por `resolveNodeMouseActions` sin cambiar defaults; test bloquea filter-primary |
| Extracción de keyboard del god-object rompe casos sutiles (folder-drill, inline-expand) | Pérdida de features existentes | serviceKeyboardNav es **extracción** con tests de paridad contra `handleRowKeydown` actual antes de borrar el llamador |
| 0-A C12 flicker-fix toca markup de views/ViewHost después de spec'ear | Rebase de A.R | Gate-0 (abajo); spec escrito vs contrato commiteado C1-C11; impl no arranca hasta 0-A cierre |
| M files pre-existentes del usuario en viewTree.svelte + ViewNodeList.svelte | Conflicto / commit accidental | NO commitear los ~10 M files; A.R layerea limpio o coordina; Gate-0 lo verifica |
| ViewHost sigue siendo god-seam (278 LoC) | Deuda | A.R reduce su superficie de contrato (borra Contract B); decomposition completa = V.D, no A.R |
| Type-ahead nuevo introduce captura de teclas que choca con hotkeys | Conflicto de input | type-ahead solo a-z/0-9 sin modifiers; Ctrl/Cmd/Alt nunca entran al buffer; reset por timeout |
| Geometría planar (grid/cards) mal calculada en virtualización | Nav 2D errática | `PlanarGeometry.columnsAt` derivado del layout real; tests de parity por geometría |

## Locked non-goals (recordatorio, ver [[index]] §Locked non-goals)

NodeRow primitive (N.R) · View Decomposition (V.D) · viewTree sticky-parents fix (sibling) ·
0-A.S scroll triple-write (sibling) · virtualization · cambios a `serviceDnd`.

## Gate 0-A

A.R **consume** el View Feature Contract de 0-A, ya commiteado:
- `ExplorerViewFeatureContract` (serviceExplorerViewContract.ts:54-60)
- `ExplorerViewFeatureFlags` (7-15), `SHARED_FEATURES` (62-70)
- `NodeElementMask` (typeViewHost.ts:15-22)
- `ExplorerRowInput` con `id`/`callbackId` (serviceExplorerRowInput.ts:21-40)

0-A **NO está cerrado**: C12 (flicker fix) + C13 (verification gates) tienen todos los checkboxes
unchecked; no hay commits post `cd2d8fc` para C12/C13. **Decisión (user 2026-05-20)**: escribir el
spec ahora, gatear la implementación. El plan de A.R (writing-plans) arranca con **Gate-0**: asserta
0-A C12/C13 cerrado + `pnpm verify` verde antes de tocar código de A.R.

## Forward-compat seams (reservado, NO construido en v1.2.0)

El intent seam (`resolveActionIntent`, [[02-contract-shapes]] §2) declara uniones que A.R no resuelve
aún, para que las modalidades/topologías futuras se enchufen sin reabrir el contrato:

- **hover + modifier** (tooltip de acción / icon-swap) → home: K.B (modifier/macro provider) +
  Theme Builder (10, icon-swap). Reservado: `gesture:'hover'`.
- **FAB / botones con acciones por modifier** → home: Control Island (6/12). Reservado:
  `surface:'button'|'fab'`.
- **touch swipe → acción primaria/secundaria** → home: Touch/Pointer pass (post-1.2). Reservado:
  `gesture:'swipe-left'|'swipe-right'|'longpress'`, `pointerType:'touch'|'pen'`.
- **scoped/nested views por nivel jerárquico** → ver abajo. Reservado: `orderedIds` plano +
  (futuro) per-level renderer map; keyboard/selección ya operan sobre `orderedIds` plano, agnósticas
  del renderer por fila.

## Items diferidos (specs separados)

### DnD repair

Conceptualmente DnD es action-routing, pero es **locked non-goal de A.R** ("services untouched per
0-A constraints"). El bug reportado (manual-sort que "se implementó pero no funcionó") vive en
`serviceDnd` + `applyManualNodeReorder` (orquestado por el futuro `ManualDndOrchestrator` de P.D).
A.R **compone** con `onManualDrop` (panelExplorer:1291, `handleManualNodeDrop`) sin romperlo, y deja
el `gesture:'drag'` reservado en el seam. **Acción**: levantar un repair spec aparte (DnD workspace
drop + manual-sort) — diagnóstico con `systematic-debugging`, fuera de A.R.

### Scoped / nested views por nivel

Idea: que el usuario elija que, ej., los nodes de 2º nivel se rendericen como cards/grid mientras el
root mantiene tree sticky-row. Es **topología de view, no routing**. Viable encima de A.R+N.R+V.D
porque la projection ya es lista plana ordenada de `ExplorerRowInput` con `depth` + `parentId` +
`childrenIds`; un per-level renderer map decide qué componente renderea cada fila, y keyboard/selección
operan sobre el `orderedIds` plano (de ahí que A.R quede forward-compatible). **Acción**: nuevo
sub-system downstream (post N.R + V.D), su propio ciclo spec/plan. NO en v1.2.0 (meterlo forzaría
N.R+V.D adelante y A.R dejaría de ser un slice contenido).

### Otros

- Grid Nautilus rewrite (icons + Adwaita) = v1.5.0 (umbrella). A.R preserva el render inline-expand
  existente del grid, no lo reescribe.
- viewTable / viewCards Bases parity = v2.0.0 (B.P).

## Reconciliación pendiente

No bloquea A.R, pero queda anotado para no perderse:

1. **ID canónico**: `A.R` es working ID. El roadmap (`roadmap-overview.md`) usa `1-12 + N + O`. La
   asignación de números canónicos para los 11 nuevos sub-systems (N.R, A.R, V.D, P.D, T.G, 0-A.S,
   K.B, API, I.E, B.P, C.D) es una tarea de update de `roadmap-overview.md` (pendiente, listada en el
   shard 06 del umbrella).
2. **Roadmap overview**: actualizar `roadmap-overview.md` con los nuevos sub-systems y sus first-release
   después del catch-up shift.
3. **status.md / handoff.md**: actualizar a "A.R spec + plan escritos; next = Gate-0 / implementation"
   al cerrar esta importación.
