---
title: BT5-012 — Path visible en Files plano
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

# BT5-012 — Path visible en Files plano

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Cuando Files usa `nested=off`, ofrecer cell option `Path` como proyección alternativa
del label: apagado muestra `file.name`; encendido muestra `file.path`, que ya incluye el
filename. No crea una segunda columna textual duplicada. Mantener sort Name y sort Path
como criterios independientes, acercando el comportamiento al modelo de Bases de Obsidian.

## Acceptance criteria

- [ ] Path cell option solo es visible/aplicable con nested off.
- [ ] Path off muestra exactamente `file.name`; Path on muestra exactamente `file.path`.
- [ ] Sort Name siempre compara `file.name`, independientemente del label visible.
- [ ] Sort Path siempre compara `file.path` y permanece oculto con nested on.
- [ ] Duplicados de filename en carpetas distintas son distinguibles visualmente en modo Path.
- [ ] Tree/table/cards y hover accesible muestran el valor coherente sin overflow destructivo.
- [ ] Saved configs restauran el modo y configs antiguas conservan Name por default.

## Blocked by

[[010-shared-cell-registry-hover-info|BT5-010]].
