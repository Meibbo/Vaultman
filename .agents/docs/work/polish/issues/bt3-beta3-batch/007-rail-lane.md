---
title: BT3-007 — Rail lane = ancho track
type: issue
status: completed
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T11:21:20
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish]
---

# BT3-007 — Rail lane = ancho track [micro CSS]

**Bug (D17).** El setting `tocReservedLane` reserva `--vaultman-toc-reserved-lane-size: 36px` desktop / `42px` mobile (`styles.css:6194-6198`, consumido como `padding-inline` en los viewports L6214-6237) — casi triple del track real del index:
`.vaultman-floating-toc-item` = **18px** de ancho (L6268-6287). Roba espacio a los nodos del explorer.

**Fix.** Bajar la var al ancho efectivo del track: 18px (+ margen mínimo si el wrap lo necesita: `.vaultman-floating-toc-wrap` right 2px→14px con lane, L6234-6242 — verificar que el track no pise el scrollbar con el valor nuevo; candidato 20-22px total, mobile proporcional). Solo CSS; cero JS.

**DoD (AFK):**
- Var actualizada + stylelint verde + build.
- Guard en test de fuente CSS si existe patrón (si no, N/A).

**HITL dev:** juicio visual del gap final (valor exacto px lo ajusta el dev si quiere).

## Implementation closeout (2026-07-17)

- Code-only commit compartido con BT3-001: `03fe92bc`.
- Lane desktop `36px→22px`; mobile `42px→26px`.
- Eliminados el offset muerto `--vaultman-toc-scrollbar-offset` y la regla especial que movía el rail derecho a `14px`; el wrap vuelve al `right: 2px` común sobre scrollbar.
- Source-guard RED/GREEN exige ambos tamaños y ausencia del shift/variable muertos.
- Gates integrados: focal 3 files / 43 tests; full unit 92/473; check 0/0; ESLint, Stylelint, build y diff-check verdes.

### Adversarial pass C2

Simetría verificada contra CSS real: right y left usan 2px; 22px cubre track desktop de 18px + gap, 26px cubre track/actions mobile de 24px + gap. No cubre scrollbars custom de terceros más anchos ni determina el feel visual final; ese juicio permanece HITL. La calidad perdida frente al status quo es margen vacío, intencionalmente reclamado para las cells; no se cambia hit target, Niagara ni posición horizontal.
