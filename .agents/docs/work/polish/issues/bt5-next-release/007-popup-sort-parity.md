---
title: BT5-007 — Paridad popupSort para By level
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-009-residual-popup
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-007 — Paridad popupSort para By level

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Parte del
residual de BT4-009.

## What to build

Completar en `popupSort` la misma proyección y edición de By level que ya ofrece el
menú nativo: nested, folders first/fixed folders, scope y niveles. Ambas superficies
deben leer/escribir el mismo estado normalizado, sin reimplementar reglas contextuales.

## Acceptance criteria

- [ ] El popup muestra las mismas opciones visibles, orden y estado que el menú nativo.
- [ ] Cambios desde cualquiera de las dos superficies se reflejan inmediatamente en la otra.
- [ ] Saved View configs conservan compatibilidad y restauran el mismo payload.
- [ ] La matriz de combinaciones del spec BT4 By level pasa en ambas superficies.
- [ ] No aparece un segundo resolver de scope/dirección fuera del seam compartido.

## Blocked by

None — can start immediately.
