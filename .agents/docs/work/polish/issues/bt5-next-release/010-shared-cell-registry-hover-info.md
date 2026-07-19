---
title: BT5-010 — Registro compartido de cells y hover-info
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-025
  - BT4-013-hover-order
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-010 — Registro compartido de cells y hover-info

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra
BT4-025 y absorbe el orden DnD de hover-info que estaba acoplado a BT4-013.

## What to build

Crear un catálogo 1.2 único para los cells presentes y futuros: id estable, label/icon,
explorers/view modes compatibles, posición fixed, default visibility, renderer/valor de
hover y sort asociado cuando exista. View mode y hover-info consumen el catálogo; hover-info
permite show/hide de Label y todos los cells, además de orden DnD persistente.

## Acceptance criteria

- [ ] Un cell nuevo se registra una vez y aparece en las superficies compatibles sin editar mapas dispersos.
- [ ] El catálogo expresa posición fixed y vínculo opcional a sort sin ejecutar lógica de UI.
- [ ] Hover-info permite toggle de Label y de cada cell actual/futuro compatible.
- [ ] El orden DnD de hover-info persiste por ids y hace merge estable con cells añadidos después.
- [ ] IDs desconocidos guardados no rompen carga; defaults futuros aparecen de forma determinista.
- [ ] Saved View configs actuales migran sin cambiar su render visible.
- [ ] No se importa la infraestructura ActionNode 2.0 ni se crea un service god-object.

## Blocked by

None — can start immediately. Es foundation estrecha de BT5-011/012/013/015.
