---
title: BT5-031 — Cambiar icono no tiene efecto inmediato en Files explorer
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-20T15:05:00
updated: 2026-07-20T16:30:00
created_by: claude-fable-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5, icons]
---

# BT5-031 — Cambiar icono no tiene efecto inmediato en Files explorer

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado por el dev el 2026-07-20 tras probar `1.2.0-beta.5`.

## Reported behavior

Cambiar el icono de un nodo se refleja al instante en todos los explorers **menos** en Files, que sigue mostrando el icono anterior hasta que algo más fuerza un render.

## Diagnóstico ya realizado (source, sin runtime)

La causa es asimetría de suscripción al adaptador Iconic:

| Panel | Suscripción | Refresca en vivo |
|---|---|---|
| Props | `iconic.onChanged` (`explorerProps.ts:349`) | sí |
| Tags | `iconic.onChanged` | sí |
| Snippets / Plugins | `iconic.onChanged` (BT5-019) | sí |
| **Files** | **solo `iconic.onLoaded`** (`explorerFiles.ts:505`) | **no** |

`onLoaded` dispara una sola vez cuando el adaptador termina de cargar; `onChanged` es el evento que emite cada cambio posterior (incluida la escritura del propio picker y las ediciones externas de `data.json`). Files nunca lo escucha.

## Acceptance criteria

- [x] Files se suscribe al mismo evento de cambio que el resto de explorers y libera la suscripción en unload.
- [x] Cambiar un icono desde cualquier superficie repinta Files sin reload ni cambio de tab.
- [x] El repintado es coalescido: una ráfaga de cambios produce un solo rebuild, sin timers nuevos.
- [x] Se conserva `onLoaded` para la primera carga; no se duplica el render inicial.
- [x] Regresión cubre: override propio de Vaultman, edición externa de `data.json` y Iconic ausente/desactivado.

## Notes

Al arreglarlo, verificar si el mismo patrón `_scheduleIconicRender` de Files debe coalescer como el `_scheduleIconRebuild` introducido en BT5-019 para los add-ons.

## Blocked by

None — can start immediately.

## Outcome 2026-07-20

**Commit `9cd1e3ac`.** Gate verde: 124 files / 816 tests, svelte-check 0/0, scorecard 17/17. Test focal `test/unit/filesIconLiveRefresh.test.ts`.

Causa confirmada tal como quedó diagnosticada. `explorerFiles` escucha ahora también `iconic.onChanged` —el evento de todos los cambios posteriores, incluida la escritura del propio picker y una edición externa de `data.json` de Iconic— además de conservar `onLoaded` para la primera carga.

Ambas suscripciones reutilizan el coalescer de microtask que ya existía, así que una ráfaga sigue siendo un solo render y no se introduce ningún timer nuevo;
ambos unsubscribe van por `this.register`, así que se liberan en unload. El bloque entero sigue guardado por `if (iconic)`, así que Iconic ausente o desactivado no cambia nada.

Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].

Pendiente: smoke de runtime (cambiar un icono y ver Files repintar sin reload).
