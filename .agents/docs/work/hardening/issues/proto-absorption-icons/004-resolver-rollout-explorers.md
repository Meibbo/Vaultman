---
title: PAI-004 — Rollout del resolver a props/tags/content
type: issue
status: todo
parent: "[[docs/work/hardening/issues/proto-absorption-icons/index|PAI index]]"
created: 2026-07-02T13:30:00
updated: 2026-07-02T13:30:00
created_by: claude-fable-5
tags:
  - agent/issue
  - umbrella-v2/absorption
  - explorer/icons
---

# PAI-004 — Rollout del resolver a props/tags/content

**Tag: AFK** · **Nivel: N2** · **Executor sugerido: Sonnet 5 (patrón ya probado por PAI-001)**

## Goal

Ensanchar el tracer: los explorers props/tags/content resuelven su icono `leading` vía
`logicIconResolver` (roles `tag`/`prop`/`value`/`content`/`match`), eliminando los
if-chains básicos duplicados que el ledger marca OVERLAP.

## Tracer slice

- **IN**: adopción por provider (mismo camino que tree en PAI-001) · roles restantes
  cableados · limpieza del if-chain duplicado en `serviceDecorate` (queda UN punto de
  resolución) · TYPE_ICON_MAP sigue siendo el mapa tipo-de-prop→icono consumido por el
  resolver (ADOPT-sandbox, no se reescribe).
- **OUT**: vistas Geometry nuevas de V.D slice 2 (adoptan solas al montar NodeRow) ·
  overrides UI · packs.

## DoD (tool-checkable)

1. Unit focal por provider (rol correcto por tipo de nodo) + paridad: icono resultante
   idéntico al previo para el corpus de tipos existente (test de caracterización antes
   de tocar — anti-regresión).
2. `svelte-check` 0/0 · autofixer `issues:[]` · unit completo sin regresiones nuevas.
3. Build → plugin-dev → reload → `dev:errors` limpio · DOM smoke en los 3 explorers.

## Dependencias

PAI-001. Paralelizable con PAI-002.
