---
title: BT4 shard 02 — Bugs beta.3 (004-008)
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt4-beta4-batch/index|BT4 index]]"
created: 2026-07-18T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT4 shard 02 — Bugs beta.3

## BT4-004 — Addon index reveal al top + unificar seam (D24)

En snippets/plugins, presionar un action_node del floating index coloca el primer nodo coincidencia AL MEDIO del frame; el contrato (resto de explorers) = primer match como PRIMER nodo visible (align top/start). Causa probable: reveal propio de `logicAddonExplorer.ts`/paneles addon con alineación center en vez de reusar el seam `revealNode` (FTC-002). **Fix:** los paneles addon implementan el MISMO puerto `revealNode` con la misma alineación que tree (`scrollToId` align start) — cero implementación divergente (queja explícita del dev: todos los explorers son/deberían ser el mismo contrato). **DoD:** unit del align en addon panels + guard de que usan el seam compartido; gates estándar.

## BT4-005 — Niagara tap vs scrub (D25 + §UX del spec)

Tap rápido hoy deforma el rail. Diseño intent-based (spec §UX): scrub solo con press ≥ ~450ms O movimiento vertical > ~8px con pointer abajo; tap corto = jump sin deformación; cancel resetea. Umbrales = constantes nombradas (ajustables HITL).
**DoD:** unit del state-machine de gesto (tap corto → no scrub; hold → scrub;
move-intent → scrub); gates estándar.

## BT4-006 — Plugin toggle cell stale (D26)

Activar un plugin desde Settings core no refresca el cell del explorer (sigue "desactivado"). **Fix:** suscripción a cambios de estado de plugins (`app.plugins` events si existen; si no, refresh en visibilidad/focus del panel + tras operaciones propias — verificar API real, no memoria). **DoD:** unit con stub que emite cambio externo → nodo re-renderiza estado; sin polling agresivo (nada de intervals ciegos); gates estándar.

## BT4-007 — Orden cells plugins (D27)

`config` cell aparece DESPUÉS del `toggle`; debe ir ANTES. `toggle` SIEMPRE en el extremo derecho por defecto (reorder por usuario = futura versión, fuera de scope).
**DoD:** orden en render + guard; gates estándar.

## BT4-008 — Content search: solo .md + sin freeze (D28)

Dos defectos: (a) el content search analiza archivos más allá de `.md` (atrapado buscando texto en `.mp4`) → lentitud absurda; (b) escribir en el search input congela la UI (trabajo síncrono por keystroke). **Fix:** allowlist de extensiones (constante extensible; beta.4 = solo `.md`) en la fuente de candidatos + debounce del input + evaluación async/chunked (yield) para no bloquear el main thread.
**DoD:** unit del filtro de candidatos (mp4/bin excluidos) + test de debounce/chunk (fake timers); gates estándar. Perf numérica = watch-item del dev, no gate.
