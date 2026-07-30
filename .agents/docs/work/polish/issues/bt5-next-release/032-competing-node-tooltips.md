---
title: BT5-032 — Dos tooltips compiten por el nodo y gana el no configurable
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
tags: [agent/issue, initiative/polish, release/bt5, hover]
---

# BT5-032 — Dos tooltips compiten por el nodo y gana el no configurable

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado por el dev el 2026-07-20; observado en Plugins explorer y en Files explorer.

## Reported behavior

Los nodos tienen dos hovers distintos: el que Vaultman expone y configura, y otro que no es configurable. Cuando ambos existen se muestra el segundo, que es justamente el que no debería ganar.

## Diagnóstico ya realizado (source, sin runtime)

Hay dos escritores sobre el MISMO elemento (`row`), en este orden:

1. `viewTree.applyRowTitle()` (`viewTree.ts:524`) llama `setTooltip(row, rowTitle(node))` en **cada render de fila**. `rowTitle()` (`viewTree.ts:516`) fabrica un texto genérico y **hardcoded en inglés** a partir de lo que el nodo traiga:
   `Last modified: … / Created at: … / Words: …`. No pasa por `filesHoverInfo`, no respeta orden ni selección del usuario, y no está traducido.
2. El tooltip configurable se aplica **después**, pero solo en `onRowHover`:
   Files → `_handleFileHover` → `buildFileHoverInfo` (registro BT5-010);
   Plugins/Snippets → `buildAddonHoverInfo`.

El de (2) debería ser el único, pero (1) se reaplica en cada repintado de la fila (scroll virtual, cambio de estado, reciclado de filas), así que en la práctica el genérico reaparece y tapa al configurado.

## Acceptance criteria

- [x] Un nodo tiene exactamente UN origen de tooltip; el configurable es el único que decide el contenido.
- [x] El texto genérico hardcoded de `rowTitle()` desaparece o queda subordinado al registro de hover, sin strings sin traducir.
- [x] Un repintado de fila (scroll virtual, reciclado, cambio de estado) no restaura el tooltip no configurable.
- [x] Un explorer sin hover configurado no muestra un tooltip inventado; ausencia de datos = sin tooltip.
- [x] Files respeta `filesHoverInfo` (selección y orden, BT5-010) también tras re-render.
- [x] Plugins/Snippets respetan `buildAddonHoverInfo`.
- [x] Ningún camino deja el atributo nativo `title` puesto (doble render del navegador).
- [x] Regresión cubre Files y Plugins con fila reciclada por scroll.

## Blocked by

None — can start immediately. Toca `viewTree`, compartido por todos los explorers:
verificar Props/Tags/Content además de los dos reportados.

## Outcome 2026-07-20

**Commit `577789c2`.** Gate verde: 125 files / 822 tests, svelte-check 0/0, scorecard 17/17. Test focal `test/unit/singleRowTooltip.test.ts`.

La vista ya no redacta tooltips. `rowTitle()` y su texto hardcoded en inglés desaparecen; `clearRowTooltip` solo garantiza pizarra limpia: quita el atributo nativo `title` (que duplica el render) y borra el texto que quedara en una fila reciclada. El contenido pasa a ser enteramente del builder de hover del panel —`filesHoverInfo` en Files, `buildAddonHoverInfo` en Plugins y Snippets—, así que selección y orden se respetan también tras un repintado.

Una fila repintada mientras el puntero está encima recupera su tooltip configurado en el acto (`_hoveredRowId`), así que el reciclado por scroll nunca deja una fila sin tooltip hasta que el ratón salga y vuelva.

**Cambio visible declarado:** Props, Tags y Content no registran builder de hover, así que ahora no muestran ningún tooltip en vez de uno inventado y sin traducir.
Es el AC "ausencia de datos = sin tooltip". Si el dev quiere hover ahí, el paso siguiente es darles builder configurable propio, no reponer el genérico.

Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].

Pendiente: smoke de runtime en Files y Plugins con fila reciclada por scroll.
