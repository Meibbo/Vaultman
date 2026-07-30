---
title: PAI-003 — Icon picker island (polish)
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

# PAI-003 — Icon picker island

**Tag: HITL** · **Nivel: N2** · **Preset: polish** · **Executor sugerido: Fable/Opus (traducción UI proto→Svelte con juicio) + review visual dev**

## Goal

Traducir `IconPickerIsland` del proto (packs + 4 modos de búsqueda/preview) a un island Svelte 5 que asigna overrides (PAI-002) desde el cmenu de nodo. Look = canon polish del proto; estructura headless `data-vm-*` (D-PSS-2/4+3).

## Tracer slice

- **IN**: island con búsqueda + grid virtualizada simple de iconos lucide + emoji · preview usando el resolver runtime (paridad con proto, que preview-ea con su `Icon`) · entrada por cmenu de nodo → asigna override por nodo.
- **OUT**: packs remotos/importados (solo lucide + emoji en esta slice) · scope scene/workspace · settings page dedicada.

## Source rows

Ledger 06: icon picker (SOLO-PROTO RESHAPE, preset polish). Proto shard 04 §22-24.

## Reglas de traducción

§29 duras + ley de estilo headless 4+3 (`data-vm-*`; clases `vm-*` solo rung polish).
El island se monta por el patrón de islands existente (FnR island como referencia de estructura — ledger 03).

## DoD

**Gates AFK previos (obligatorios antes de la review):** svelte-check 0/0 · autofixer `issues:[]` · unit/component focales · build → plugin-dev → reload → `dev:errors` limpio · smoke: abrir picker desde cmenu, buscar, asignar, icono cambia en DOM.

**Cierre HITL (dev en plugin-dev):** paridad de sensación con el proto (layout, densidad, responsividad de búsqueda) · decisión de entrada UX (¿solo cmenu o también header?) · aprobación del look polish.

## Dependencias

PAI-001 + PAI-002. No arranca hasta que ambos cierren (gated).
