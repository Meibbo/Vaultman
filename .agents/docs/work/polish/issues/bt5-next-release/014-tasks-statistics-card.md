---
title: BT5-014 — Card Tasks en Statistics
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-032
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-014 — Card Tasks en Statistics

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-032.

## What to build

Añadir a Statistics una card Remaining tasks que consuma el cache reparado y respete
los tres scopes existentes de la página. No volver a leer archivos ni mantener un contador
paralelo; la card es una proyección agregada del servicio compartido.

## Acceptance criteria

- [ ] La card aparece con copy/icono coherentes y valor total para cada uno de los tres scopes.
- [ ] Cambiar scope recalcula desde snapshots/cache sin rescans síncronos.
- [ ] Hydration/backfill actualiza el valor progresivamente y distingue loading de cero real.
- [ ] Modificar, crear, mover o borrar un file actualiza la agregación.
- [ ] Tests cubren scopes, datos parciales, cero y actualizaciones incrementales.

## Blocked by

[[003-remaining-tasks-availability-pipeline|BT5-003]].
