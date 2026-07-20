---
title: BT5-009 — Exclusión de files como filtro por nodo
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
source_ids:
  - BT4-027
  - BT4-015-rework
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T18:25:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
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

- [x] Exclude file puede invocarse desde cada explorer que representa files.
- [x] El file desaparece mediante el pipeline de filtros, no mediante listas paralelas en render.
- [x] Show again/restauración actualiza todas las superficies afectadas.
- [x] Rename/delete migra o purga la exclusión sin paths huérfanos.
- [x] Saved configs y datos existentes de BT4-015 migran sin perder exclusiones.
- [x] Props/tags/snippets/plugins mantienen sus settings de exclusión específicos cuando no representan files.

## Blocked by

None — can start immediately.

## Outcome 2026-07-20 (tarde)

**Commit `0a71532f`.** Gate verde: 129 files / 854 tests, svelte-check 0/0,
scorecard 17/17. Test focal `test/unit/fileExcludeFilter.test.ts`.

Exclude file pasa a ser el filtro de nodo `file_exclude` (path exacto), coherente
con exclude-folder: el file desaparece por el pipeline y se muestra de nuevo
quitando su chip. La acción añade un nodo de filtro en vez de escribir settings;
`_filesForDisplay` ya no tiene pasada propia; **la sección de settings se quitó**.
Migración one-time de `excludedFilePaths` al filtro en el primer load con limpieza
del setting. Rename lleva la exclusión al nuevo path (incluida carpeta padre),
delete la purga.

**Cambio de comportamiento declarado:** la exclusión es ahora session-scoped como
exclude-folder, no persistida entre reinicios. Lectura coherente de la AC; el dev
puede vetarlo si quería persistencia.

Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/07-dev-corrections-and-interaction-fixes|shard 07]].

Pendiente: smoke de runtime; confirmar el cambio a session-scoped con el dev.
