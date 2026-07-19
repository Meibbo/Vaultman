---
title: BT5-018 — Context menu Files configurable
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
source_ids:
  - BT4-013
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-018 — Context menu Files configurable

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra la
parte files-cmenu de BT4-013; hover-info DnD vive en BT5-010.

## What to build

Crear en Layout Settings una sub-page que configure el context menu de nodos Files:
show/hide por acción, orden DnD y dividers agregables. Persistir ids estables y hacer
merge contra el catálogo runtime para que acciones nuevas aparezcan sin romper configs.

## Acceptance criteria

- [ ] La sub-page presenta todas las acciones disponibles con visibilidad, DnD y dividers.
- [ ] El context menu real respeta exactamente la proyección guardada.
- [ ] Acciones nuevas se insertan con regla determinista; ids retirados no rompen carga.
- [ ] No se permiten dividers líderes, finales o duplicados vacíos tras normalizar.
- [ ] Reset restaura el orden default aprobado por el dev.
- [ ] Configs migran por id, no por label traducido ni índice posicional.
- [ ] Tests cubren merge futuro, DnD, dividers, show/hide y render final.

## Blocked by

None — can start immediately. HITL: aprobar el orden default antes de fijar fixtures.
