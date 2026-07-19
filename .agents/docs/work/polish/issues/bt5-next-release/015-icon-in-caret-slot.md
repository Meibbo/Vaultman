---
title: BT5-015 — Icon cell en slot del caret
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-026
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-015 — Icon cell en slot del caret

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-026.

## What to build

Añadir una opción de presentación para colocar Icon en el slot reservado al caret cuando
el nodo no necesita expansión, recuperando espacio horizontal sin confundir un icono con
un control expandible. Los nodos expandibles conservan caret y affordance correctos.

## Acceptance criteria

- [ ] La opción está registrada y default off; configura cada layout/surface según el patrón vigente.
- [ ] Nodo leaf muestra Icon en el slot; nodo expandible conserva caret y el icono en su posición válida.
- [ ] Hit target, keyboard navigation y aria no presentan el icono decorativo como botón de expansión.
- [ ] Toggle runtime no desplaza filas virtualizadas ni rompe medición.
- [ ] Tree/list/table/cards reciben comportamiento explícito o quedan declarados no aplicables.

## Blocked by

[[010-shared-cell-registry-hover-info|BT5-010]].
