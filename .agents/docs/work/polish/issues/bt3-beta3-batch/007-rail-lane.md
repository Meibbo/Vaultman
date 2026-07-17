---
title: BT3-007 — Rail lane = ancho track
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-007 — Rail lane = ancho track [micro CSS]

**Bug (D17).** El setting `tocReservedLane` reserva
`--vaultman-toc-reserved-lane-size: 36px` desktop / `42px` mobile
(`styles.css:6194-6198`, consumido como `padding-inline` en los viewports
L6214-6237) — casi triple del track real del index:
`.vaultman-floating-toc-item` = **18px** de ancho (L6268-6287). Roba espacio a los
nodos del explorer.

**Fix.** Bajar la var al ancho efectivo del track: 18px (+ margen mínimo si el wrap
lo necesita: `.vaultman-floating-toc-wrap` right 2px→14px con lane, L6234-6242 —
verificar que el track no pise el scrollbar con el valor nuevo; candidato 20-22px
total, mobile proporcional). Solo CSS; cero JS.

**DoD (AFK):**
- Var actualizada + stylelint verde + build.
- Guard en test de fuente CSS si existe patrón (si no, N/A).

**HITL dev:** juicio visual del gap final (valor exacto px lo ajusta el dev si quiere).
