---
title: BT5-032 — Dos tooltips compiten por el nodo y gana el no configurable
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-20T15:05:00
updated: 2026-07-20T15:05:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, hover]
---

# BT5-032 — Dos tooltips compiten por el nodo y gana el no configurable

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-20; observado en Plugins explorer y en Files explorer.

## Reported behavior

Los nodos tienen dos hovers distintos: el que Vaultman expone y configura, y otro
que no es configurable. Cuando ambos existen se muestra el segundo, que es
justamente el que no debería ganar.

## Diagnóstico ya realizado (source, sin runtime)

Hay dos escritores sobre el MISMO elemento (`row`), en este orden:

1. `viewTree.applyRowTitle()` (`viewTree.ts:524`) llama `setTooltip(row, rowTitle(node))`
   en **cada render de fila**. `rowTitle()` (`viewTree.ts:516`) fabrica un texto
   genérico y **hardcoded en inglés** a partir de lo que el nodo traiga:
   `Last modified: … / Created at: … / Words: …`. No pasa por `filesHoverInfo`, no
   respeta orden ni selección del usuario, y no está traducido.
2. El tooltip configurable se aplica **después**, pero solo en `onRowHover`:
   Files → `_handleFileHover` → `buildFileHoverInfo` (registro BT5-010);
   Plugins/Snippets → `buildAddonHoverInfo`.

El de (2) debería ser el único, pero (1) se reaplica en cada repintado de la fila
(scroll virtual, cambio de estado, reciclado de filas), así que en la práctica el
genérico reaparece y tapa al configurado.

## Acceptance criteria

- [ ] Un nodo tiene exactamente UN origen de tooltip; el configurable es el único que decide el contenido.
- [ ] El texto genérico hardcoded de `rowTitle()` desaparece o queda subordinado al registro de hover, sin strings sin traducir.
- [ ] Un repintado de fila (scroll virtual, reciclado, cambio de estado) no restaura el tooltip no configurable.
- [ ] Un explorer sin hover configurado no muestra un tooltip inventado; ausencia de datos = sin tooltip.
- [ ] Files respeta `filesHoverInfo` (selección y orden, BT5-010) también tras re-render.
- [ ] Plugins/Snippets respetan `buildAddonHoverInfo`.
- [ ] Ningún camino deja el atributo nativo `title` puesto (doble render del navegador).
- [ ] Regresión cubre Files y Plugins con fila reciclada por scroll.

## Blocked by

None — can start immediately. Toca `viewTree`, compartido por todos los explorers:
verificar Props/Tags/Content además de los dos reportados.
