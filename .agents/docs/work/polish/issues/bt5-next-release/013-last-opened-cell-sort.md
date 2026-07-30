---
title: "BT5-013 — Last opened persistente: cell y sort"
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T16:30:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-013 — Last opened persistente: cell y sort

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Persistir el último instante en que Obsidian abrió cada `TFile`, aunque la apertura haya sido solo de lectura. Exponerlo como cell opcional y sort `Last opened`, cuyo primer orden es más reciente primero. El alcance es el último timestamp por file, no un historial de múltiples eventos.

## Acceptance criteria

- [x] Un `file-open` real de cualquier tipo de `TFile` compatible actualiza `lastOpenedAt`.
- [x] Hover sin apertura real no altera el timestamp; una apertura programática que activa el file sí.
- [x] El valor persiste entre reinicios sin crecer por número de eventos.
- [x] La persistencia es local al vault, guarda solo path/timestamp y no sincroniza contenido ni telemetría.
- [x] Rename migra la key, delete la purga y archivos nunca abiertos tienen estado explícito/null.
- [x] Cell default off usa formato de fecha relativo/absoluto consistente con otros cells temporales.
- [x] Sort default desc muestra primero lo más reciente y ordena determinísticamente null/ties.
- [x] La escritura está debounceada/coalescida para no guardar settings completos por cada evento.
- [x] Tests cubren tipos no-Markdown, lectura, rename/delete y persistencia.

## Blocked by

[[010-shared-cell-registry-hover-info|BT5-010]].

## Outcome 2026-07-20

**Commit `843da5ab`.** Gate verde: 122 files / 806 tests, svelte-check 0/0, scorecard 17/17. Test focal `test/unit/lastOpened.test.ts` (10 casos).

Modelo puro en `src/logic/logicLastOpened.ts` (un timestamp por path, nunca un historial) y `src/services/serviceLastOpened.ts`, que persiste en `last-opened.json` al lado del data del plugin en vez de dentro de settings: abrir un archivo no reescribe el payload completo. Escritura coalescida en un flush trailing por ráfaga más flush final en unload.

Solo un `file-open` real registra apertura —los hover previews no emiten ese evento— y cuenta cualquier `TFile`, no solo markdown. Rename migra la key (incluida carpeta padre renombrada, sin tocar hermanos con prefijo parecido), delete purga, y el arranque poda entradas huérfanas. Nunca abierto = `null` explícito: celda en blanco y cola estable al final del orden desc por defecto.

Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].

Pendiente: smoke de runtime.
