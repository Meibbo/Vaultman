---
title: "BT5-003 — Remaining tasks: migración, hidratación y prioridad"
type: issue
status: pending
lifecycle: active
priority: P0
execution: AFK
source_ids:
  - BT4-012-regression
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T12:43:51
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish, release/bt5, performance]
---

# BT5-003 — Remaining tasks: migración, hidratación y prioridad

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Regresión de la entrega BT4-012.

## What to build

Hacer que Remaining tasks esté disponible de forma correcta y progresiva desde caché, incluidos records legacy sin `tasks`. El mismo tracer debe: detectar incompletitud de schema, backfillear sin freeze, repintar cells visibles cuando hidrata IndexedDB y priorizar Files visibles antes del resto por `mtime` descendente, garantizando que los archivos viejos también terminen.

## Acceptance criteria

- [x] Un record fresco por mtime/size pero sin `tasks` se considera incompleto y se migra.
- [x] El round-trip IndexedDB conserva `tasks` en el mismo record que words/characters.
- [x] La notificación de stats repinta cells de tasks visibles sin requerir scroll.
- [x] La cola procesa visibles primero y luego stale/incompletos por `mtime` descendente.
- [x] La cola es time-sliced, cancelable/reanudable y starvation-free bajo modificaciones continuas.
- [x] Sort por tasks converge a medida que llegan datos sin saltos infinitos ni bloqueo del main thread.
- [ ] Benchmark vivo en `Start of The Road` registra time-to-first-visible, progreso total y ausencia de freeze contra el baseline 2026-07-19.
- [x] Tests incluyen record legacy, malformed values, hydrate tardío, prioridad y garantía de progreso.

## Blocked by

None — can start immediately.

## Implementation checkpoint

Implementado y commiteado en `c60e3bc7`. Los records legacy incompletos o con counts malformados se recomputan; `tasks` persiste junto a words/characters; la cola usa visibles en orden DOM y después `mtime desc + path`, con lotes, yield, cancelación, reanudación y métricas `statistics.ensure.visible/total`.

Medición controlada del build en `plugin-dev`: 10 prioritarios visibles en 416.5 ms y 85 files totales en 10,329.5 ms; el orden computado coincidió exactamente con el esperado, 85/85 records quedaron completos en memoria e IndexedDB y un fixture real con una tarea devolvió `1` antes y después de recargar el plugin. Tras reload se hidrataron 88 records con `tasks`. No se ejecutó el build modificado en `Start of The Road`: el dev restringió todo runtime testing a `plugin-dev`, así que el benchmark final en el vault grande queda HITL.
