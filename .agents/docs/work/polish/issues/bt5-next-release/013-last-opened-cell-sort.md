---
title: "BT5-013 — Last opened persistente: cell y sort"
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-013 — Last opened persistente: cell y sort

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Persistir el último instante en que Obsidian abrió cada `TFile`, aunque la apertura haya
sido solo de lectura. Exponerlo como cell opcional y sort `Last opened`, cuyo primer orden
es más reciente primero. El alcance es el último timestamp por file, no un historial de
múltiples eventos.

## Acceptance criteria

- [ ] Un `file-open` real de cualquier tipo de `TFile` compatible actualiza `lastOpenedAt`.
- [ ] Hover sin apertura real no altera el timestamp; una apertura programática que activa el file sí.
- [ ] El valor persiste entre reinicios sin crecer por número de eventos.
- [ ] La persistencia es local al vault, guarda solo path/timestamp y no sincroniza contenido ni telemetría.
- [ ] Rename migra la key, delete la purga y archivos nunca abiertos tienen estado explícito/null.
- [ ] Cell default off usa formato de fecha relativo/absoluto consistente con otros cells temporales.
- [ ] Sort default desc muestra primero lo más reciente y ordena determinísticamente null/ties.
- [ ] La escritura está debounceada/coalescida para no guardar settings completos por cada evento.
- [ ] Tests cubren tipos no-Markdown, lectura, rename/delete y persistencia.

## Blocked by

[[010-shared-cell-registry-hover-info|BT5-010]].
