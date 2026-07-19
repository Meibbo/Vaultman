---
title: BT5-009 — Exclusión de files como filtro por nodo
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-027
  - BT4-015-rework
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-009 — Exclusión de files como filtro por nodo

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-027,
que reabre el alcance de BT4-015.

## What to build

Convertir la exclusión de files en un filtro composable por nodo, disponible en cualquier
explorer donde aparezca ese file y coherente con exclude-folder. Las exclusiones de nodos
no-file permanecen como settings especiales de su dominio; no forzar una abstracción falsa.

## Acceptance criteria

- [ ] Exclude file puede invocarse desde cada explorer que representa files.
- [ ] El file desaparece mediante el pipeline de filtros, no mediante listas paralelas en render.
- [ ] Show again/restauración actualiza todas las superficies afectadas.
- [ ] Rename/delete migra o purga la exclusión sin paths huérfanos.
- [ ] Saved configs y datos existentes de BT4-015 migran sin perder exclusiones.
- [ ] Props/tags/snippets/plugins mantienen sus settings de exclusión específicos cuando no representan files.

## Blocked by

None — can start immediately.
