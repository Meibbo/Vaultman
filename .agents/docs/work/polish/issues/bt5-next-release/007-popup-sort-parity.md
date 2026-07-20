---
title: BT5-007 — Paridad popupSort para By level
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-009-residual-popup
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T19:44:42
created_by: codex-gpt-5
updated_by: codex-gpt5
tags: [agent/issue, initiative/polish, release/bt5]
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

- [x] El popup muestra las mismas opciones visibles, orden y estado que el menú nativo.
- [x] Cambios desde cualquiera de las dos superficies se reflejan inmediatamente en la otra.
- [x] Saved View configs conservan compatibilidad y restauran el mismo payload.
- [x] La matriz de combinaciones del spec BT4 By level pasa en ambas superficies.
- [x] No aparece un segundo resolver de scope/dirección fuera del seam compartido.

## Blocked by

None — can start immediately.

## Outcome

Completado en `f1dbe2f5`. `logicSortMenu.ts` es el seam compartido para opciones, visibilidad,
tipos de nodo y el modelo ordenado de By level; navbar y popup consumen la misma proyección.
El popup incorpora nested/folders first/fixed folders/scope sin duplicar resolvers y se
resincroniza con cambios externos. Cubierto por `sortMenuModel.test.ts`, guards de ambas
superficies y el gate completo de 615 tests.
