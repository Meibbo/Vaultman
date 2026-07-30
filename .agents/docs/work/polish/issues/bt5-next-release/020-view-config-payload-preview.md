---
title: BT5-020 — Preview completo del payload de View configs
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-034
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-020 — Preview completo del payload de View configs

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-034.

## What to build

Añadir un segundo botón `View` a View configs, Filter templates y Operation presets que muestre la lista completa y normalizada de lo que se cargará —index, cells, By level, sorts, filtros, layout y demás payload relevante— sin ejecutar la carga. No usar una description truncada como sustituto del preview.

## Acceptance criteria

- [ ] Cada fila conserva su acción primaria y gana un botón View separado.
- [ ] El preview es read-only y no muta estado, selección ni timestamps de uso.
- [ ] Lista todos los campos efectivos, incluidos defaults/migraciones aplicados.
- [ ] Valores desconocidos o de versión futura se muestran con warning, no se descartan silenciosamente.
- [ ] El orden de secciones es estable y permite comparar dos payloads visualmente.
- [ ] Keyboard/focus/aria distinguen View de Apply/Load.
- [ ] Tests cubren los tres tipos de preset y garantizan cero side effects.

## Blocked by

None — can start immediately.
