---
title: PAI-001 — Resolver semántico core + tracer end-to-end en tree
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

# PAI-001 — Resolver semántico core + tracer en tree

**Tag: AFK** · **Nivel: N2** · **Preset: n-a (base) / flag (packs)** · **Executor sugerido: Sonnet 5 con spec inline**

## Goal

Módulo puro `src/logic/logicIconResolver.ts` con el algoritmo de resolución del proto
(canon: prioridad `folder → role → type → ext → override → fallback`) + los **16 roles
semánticos** (folder/file/md/tag/prop/value/content/match…, lista completa en proto
`icons.jsx`), cableado end-to-end SOLO en la vista tree (tracer bullet): el icono
`leading` de NodeRow en tree se resuelve vía el resolver.

## Tracer slice

- **IN**: resolver puro TDD · tipo `IconResolution` (role/source/iconId) · adaptación del
  camino existente `serviceDecorate` para tree de modo que el icono pase por el resolver ·
  fallback final = comportamiento actual (lucide + Iconic bridge si disponible — Iconic
  GANA sobre el resolver, paridad con inyección actual).
- **OUT**: overrides persistidos (PAI-002) · picker (PAI-003) · otros explorers (PAI-004) ·
  packs/registry/caché (PAI-005) · cualquier cambio en NodeRow.svelte más allá de consumir
  el id resuelto (el contrato de celda es turf N.R — no se re-abre).

## Source rows

Ledger 06 tabla "Iconos semánticos": resolver (SOLO-PROTO RESHAPE) · roles (OVERLAP
RESHAPE) · prioridad (OVERLAP RESHAPE, proto=canon) · TYPE_ICON_MAP (COMPARTIDA
ADOPT-sandbox — el resolver lo CONSUME, no lo reemplaza). Bridge Iconic: COMPARTIDA
ADOPT-sandbox, degradación graceful obligatoria.

## Reglas de traducción (proto §29 — duras)

- NUNCA `window.*` (proto usa `__vmIconOverrides` global — prohibido; el estado vive en
  el módulo/servicio).
- NUNCA DOM-query para navegación/estado.
- NUNCA copiar mock data del proto; roles se declaran como const tipada.
- Svelte 5 idiomático: módulo puro sin runas; el consumo reactivo queda en el servicio
  existente.

## DoD (tool-checkable — todos obligatorios)

1. Unit tests del resolver: cadena de prioridad completa + degradación sin Iconic +
   role desconocido → fallback. RED antes de GREEN.
2. `svelte-check` 0 errores / 0 warnings · autofixer `issues:[]` en componentes tocados.
3. Suites focales tree verdes + unit completo sin regresiones nuevas (known-ajeno:
   `explorerNotebookNavigatorComparison`).
4. Build prod → sync plugin-dev → `plugin:reload` → `dev:errors` limpio.
5. DOM smoke obsidian-cli: tree renderiza iconos idénticos al estado previo (paridad
   visual por defecto — el tracer NO cambia el look, cambia el camino de resolución).

## Dependencias

Ninguna (arranca ya). No toca V.D slice 2.
