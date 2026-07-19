---
title: BT5-001 — Hang por settings toolbar/dock/auto-reveal
type: issue
status: completed
lifecycle: active
priority: P0
execution: AFK
source_ids:
  - BT4-028
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T12:43:51
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-001 — Hang por settings toolbar/dock/auto-reveal

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra BT4-028.

## What to build

Reproducir y eliminar el feedback loop que cuelga la aplicación completa al cambiar
settings que fuerzan re-render del frame: toolbar, dock y auto-reveal-current-file.
Auditar cada toggle por separado y en secuencia; reparar el seam compartido, no añadir
debounces ciegos que solo oculten el ciclo.

## Acceptance criteria

- [x] Existe RED focal que reproduce al menos el toggle culpable sin depender de timing arbitrario.
- [x] Se registra cuál de los tres settings y qué combinación dispara el hang.
- [x] Cada cambio de setting produce como máximo el save/render necesario y converge.
- [x] Toolbar, dock y auto-reveal conservan su comportamiento visible esperado.
- [x] Smoke vivo en Obsidian cambia cada toggle repetidamente sin freeze ni crecimiento sostenido de listeners.
- [x] Los tests cubren reentrada y teardown; gates estándar verdes.

## Outcome

Completado en `c60e3bc7`. La causa fue el incremento indiscriminado de
`pageRenderKey` por cada notificación de settings, sumado al `#key` de BottomNav. El
frame ahora conserva sus panels/virtualizers y usa `settingsRevision` para los reads
reactivos; `pageRenderKey` queda reservado al reorder real de páginas.

Smoke final en `plugin-dev`: 18 cambios secuenciales de `showToolbar`, `showDock` y
`toolbarToolsMenu`, seguidos por Auto-reveal desde Tools. El root DOM conservó identidad,
el listener set permaneció en 1, hubo filas visibles en cada paso, se restauraron los
valores iniciales y no aparecieron errores de runtime.

## Blocked by

None — can start immediately.
