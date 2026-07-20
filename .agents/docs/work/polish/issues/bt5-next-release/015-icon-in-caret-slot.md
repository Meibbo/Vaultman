---
title: BT5-015 — Icon cell en slot del caret
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-026
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T16:30:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-015 — Icon cell en slot del caret

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-026.

## What to build

Añadir una opción de presentación para colocar Icon en el slot reservado al caret cuando
el nodo no necesita expansión, recuperando espacio horizontal sin confundir un icono con
un control expandible. Los nodos expandibles conservan caret y affordance correctos.

## Acceptance criteria

- [x] La opción está registrada y default off; configura cada layout/surface según el patrón vigente.
- [x] Nodo leaf muestra Icon en el slot; nodo expandible conserva caret y el icono en su posición válida.
- [x] Hit target, keyboard navigation y aria no presentan el icono decorativo como botón de expansión.
- [x] Toggle runtime no desplaza filas virtualizadas ni rompe medición.
- [x] Tree/list/table/cards reciben comportamiento explícito o quedan declarados no aplicables.

## Blocked by

[[010-shared-cell-registry-hover-info|BT5-010]].

## Outcome 2026-07-20

**Commit `d396c3f0`.** Gate verde: 123 files / 812 tests, svelte-check 0/0,
scorecard 17/17. Test focal `test/unit/iconInCaretSlot.test.ts`.

Un nodo que reserva la columna del caret sin nada que expandir
(`showCaret && !hasChildren`) dibujaba un placeholder atenuado más un icono
aparte: gastaba la columna dos veces. Con la opción activa (setting nuevo, default
off) el icono ocupa el slot y el icono suelto se suprime, así que nunca se emite
dos veces.

Los nodos expandibles no se tocan: conservan caret, listener y `aria-expanded`.
El slot con icono mantiene el modificador `--empty`, así que sigue
`pointer-events: none` y `aria-hidden` y nunca se lee como control de expansión.
La opción entra en `rowSignature`, así que un toggle en runtime repinta las filas
recicladas; la altura de fila no cambia, así que la medición de la virtualización
queda intacta. Llega a las cinco superficies de árbol; table y cards no dibujan
caret y quedan declaradas no aplicables.

Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].

Pendiente: smoke de runtime.
