---
title: BT4 shard 01 — Regresiones (001-003)
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt4-beta4-batch/index|BT4 index]]"
created: 2026-07-18T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, regression]
---

# BT4 shard 01 — Regresiones (vm-regression-resolver)

Oráculo = beta.2 `5e5fa1df`. Rango culpable = `03fe92bc..7ba6a3c9`. Protocolo:
caracterizar (test rojo primero) → localizar COMMIT_BUENO/COMMIT_MALO (bisect) →
comparar versiones COMPLETAS → restaurar literal o adaptar (adaptación = aprobación
dev) → commit citando ambos hashes.

## BT4-001 — Toolbar tool-case collapse (D21)

**Beta.2:** frame estrecho → nodos del toolbar del 5º en adelante colapsan en menú
"tool-case". **Beta.3:** los DESAPARECE (sin menú). `logicResponsiveLayout.ts` solo
ganó `shouldShowMinimalSearchInput` (diff limpio) → la ruptura vive en el rework de
`navbarFilters.svelte` (`5414a0f0` toolbar parity o `46243479` tab labels; 794 líneas
cambiadas). Bisect con test/guard sobre el render condensado
(`shouldCondenseFilesToolbar` consumers + menú Tools de 5 nodos, FTC-008).
**DoD:** test rojo en HEAD que exige tool-case menu con width estrecho → verde;
paridad con beta.2 verificable por diff de comportamiento; gates estándar.

## BT4-002 — Tags explorer hang + memory leak (D22) [PRIMERO: bloqueante]

**Síntoma:** abrir tags explorer cuelga + fuga de memoria. **Sospechoso principal**
(verificado en diff): `194a7306` añadió en `explorerTags.ts` L84-87
`iconicService.onChanged(() => this._render())` — candidato a loop render↔changed y/o
acumulación de listeners (¿`onChanged` dispara por resolución de iconos que el propio
`_render` provoca? ¿se registra por render?). explorerProps recibió lo mismo —
verificar si también degrada (dev solo reporta tags). **Fix debe conservar** el
refresh legítimo de iconos SIN loop (equality/memo gate o suscripción única en
onload). **DoD:** test que abre panel con IconicService stub emitiendo `changed` y
prueba (a) renders acotados, (b) listeners no crecen por render; fix con
COMMIT_MALO citado; gates estándar.

## BT4-003 — Rail no se mueve al lane reservado (D23)

**Causa CONOCIDA, sin bisect:** `03fe92bc` (BT3-007) eliminó la regla
`.vaultman-pages-viewport--toc-lane-right .vaultman-floating-toc-wrap.pos-right
{ right: calc(offset + 2px) }` siguiendo la recomendación del handoff del
coordinador — error de diseño del coordinador, no de codex: el lane quedó reservado
pero el rail sigue `right: 2px` sobre el scrollbar. **Fix:** re-introducir el
desplazamiento del wrap hacia el lane con las medidas nuevas (lane 22/26px): con
lane activo, rail right ≈ lane − ancho track (que quede DENTRO del espacio
reservado, fuera del scrollbar; espejo para `pos-left`). NO volver a 36px.
**DoD:** source-guard CSS del shift restaurado + tamaños compactos conservados;
stylelint + build; juicio visual final = dev (HITL).
