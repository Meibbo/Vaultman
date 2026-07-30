---
title: "BT5 shard 11: post-beta.6 — bubbledot toggle, island clamp, node icon scope, folder totals"
type: verification
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-21T08:00:00
updated: 2026-07-21T08:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/verification, initiative/polish, release/bt5]
---

# Shard 11 — post-beta.6 batch (bubbledot toggle · island clamp · node icon scope · folder totals)

Sesión del 2026-07-21, `claude-opus-4-8`. Trabajo AFK después de publicar `1.2.0-beta.6` (`fefdde48`). Worktree `C:/tmp/vaultman-release-beta2-final2`, rama `codex/bt5-next-10`, base `fefdde48` … HEAD `b4b625f7`. Worktree limpio.

## Commits de producto (todos posteriores a beta.6)

| Commit | Qué |
|---|---|
| `ff083b91` | BT5-042: toggle folder colapsado dot ↔ badges de descendientes |
| `2bdea929` | BT5-034: islands inferiores se clampan al alto del frame |
| `3353cd88` | BT5-033 (primer slice): rename Files icon scope → Node icon scope + mover a Layout Config → Explorer |
| `b4b625f7` | BT5-040: folders muestran el total recursivo de cells contables |

Gate registrado: **909 tests, scorecard 17/17** en `ff083b91` (test focal `collapsedFolderBadges.test.ts`). Verify re-corrido sobre HEAD `b4b625f7` — resultado en §Verificación. **Smoke de runtime NO ejecutado**; todo por gates.

## BT5-042 — toggle actividad de folder colapsado (`ff083b91`)

Pedido del dev en el handoff: NO quitar BT5-017; añadir option para intercambiar entre (A) un solo dot indicativo de que los childs tienen estado (filtro u operación pendiente) y (B) los badges de descendientes subidos al padre colapsado junto al dot de filtro. Setting `collapsedFolderBadges` (`dot` default | `badges`).
`collectDescendantBadges` agrega los badges de descendientes por carrier colapsado, deduplicados, marcados inherited y no removibles. Expandir revela los badges reales;
los copiados solo existen colapsado. Default = dot = comportamiento actual, sin regresión. BT5-017 conservado.

## BT5-034 — island de filtros clampa al frame (`2bdea929`)

Los islands de active-filters y queue capaban su alto en 60vh/70vh de la **ventana**.
En un split vertical corto la ventana es alta pero el frame de Vaultman es bajo, así que el island rebasaba el borde del frame y sus entradas de abajo quedaban inalcanzables aunque la lista ya scrollea. El frame publica su alto medido como `--vaultman-frame-height` desde el ResizeObserver existente; ambos islands clampan su max-height a ese alto (menos el offset de la bottom-bar), con el valor de viewport como fallback. La lista interna conserva su propio scroll → toda entrada alcanzable por corto que sea el split.

## BT5-033 (primer slice) — node icon scope (`3353cd88`)

El control "Files icon scope" se renombró a **Node icon scope** y se movió de la sección Add-ons a **Layout Configuration → Explorer**, junto al resto de opciones de nodo. La key y sus valores no cambian → configs viejas siguen funcionando.

**El grueso de BT5-033 sigue abierto** (por eso el issue queda `in-progress`, no `completed`): que las View Compositions capturen showDock, showToolbar y el resto de opciones de Layout Configuration. Esa parte **requiere grill con el dev** para fijar el límite composition-scoped vs. global-permanent antes de codear (lo dice el propio issue). No se toca AFK.

## BT5-040 — totales recursivos de cells en folders (`b4b625f7`)

Setting opt-in: los folders del Files tree muestran la suma recursiva de los cells contables de sus files — properties, words y remaining tasks — incluyendo los totales de sus subfolders (el total de un folder L1 = sus propios files + el total de cada subfolder, contado una sola vez). Es un pase post-order puro que reusa el statisticsCache para words y tasks → ningún file se re-lee. Fechas **excluidas** (sin valor acumulativo con sentido; se recortó ese criterio del scope original tras revisar el issue). Default off → folders sin cambio hasta activar el option.

## Verificación

- HEAD `b4b625f7`, worktree limpio.
- Verify sobre HEAD: ver §resultado del gate en el session-log 2026-07-21 (esta misma sesión relanzó `pnpm run verify` en el worktree tras el commit de 040, que no tenía gate registrado propio).

## Estado del tren tras este batch

Resueltos (código) más allá de beta.6: **042, 034, 040, 033-slice-1**. Backlog de código AFK restante: **036 (resto), 035, 039, 041** + **033-core (grill-gated)**.
HITL del dev: **018, 026, 027** + gates de release **002/003/004**. Preflight de v1.2.0 stable **sin publicar** por orden del dev.
