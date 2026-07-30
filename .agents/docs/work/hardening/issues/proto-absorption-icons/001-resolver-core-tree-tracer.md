---
title: PAI-001 — Resolver semántico core + tracer end-to-end en tree
type: issue
status: done
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

Módulo puro `src/logic/logicIconResolver.ts` con el algoritmo de resolución del proto (canon: prioridad `folder → role → type → ext → override → fallback`) + los **16 roles semánticos** (folder/file/md/tag/prop/value/content/match…, lista completa en proto `icons.jsx`), cableado end-to-end SOLO en la vista tree (tracer bullet): el icono `leading` de NodeRow en tree se resuelve vía el resolver.

## Tracer slice

- **IN**: resolver puro TDD · tipo `IconResolution` (role/source/iconId) · adaptación del camino existente `serviceDecorate` para tree de modo que el icono pase por el resolver · fallback final = comportamiento actual (lucide + Iconic bridge si disponible — Iconic GANA sobre el resolver, paridad con inyección actual).
- **OUT**: overrides persistidos (PAI-002) · picker (PAI-003) · otros explorers (PAI-004) · packs/registry/caché (PAI-005) · cualquier cambio en NodeRow.svelte más allá de consumir el id resuelto (el contrato de celda es turf N.R — no se re-abre).

## Source rows

Ledger 06 tabla "Iconos semánticos": resolver (SOLO-PROTO RESHAPE) · roles (OVERLAP RESHAPE) · prioridad (OVERLAP RESHAPE, proto=canon) · TYPE_ICON_MAP (COMPARTIDA ADOPT-sandbox — el resolver lo CONSUME, no lo reemplaza). Bridge Iconic: COMPARTIDA ADOPT-sandbox, degradación graceful obligatoria.

## Reglas de traducción (proto §29 — duras)

- NUNCA `window.*` (proto usa `__vmIconOverrides` global — prohibido; el estado vive en el módulo/servicio).
- NUNCA DOM-query para navegación/estado.
- NUNCA copiar mock data del proto; roles se declaran como const tipada.
- Svelte 5 idiomático: módulo puro sin runas; el consumo reactivo queda en el servicio existente.

## DoD (tool-checkable — todos obligatorios)

1. Unit tests del resolver: cadena de prioridad completa + degradación sin Iconic + role desconocido → fallback. RED antes de GREEN.
2. `svelte-check` 0 errores / 0 warnings · autofixer `issues:[]` en componentes tocados.
3. Suites focales tree verdes + unit completo sin regresiones nuevas (known-ajeno:
   `explorerNotebookNavigatorComparison`).
4. Build prod → sync plugin-dev → `plugin:reload` → `dev:errors` limpio.
5. DOM smoke obsidian-cli: tree renderiza iconos idénticos al estado previo (paridad visual por defecto — el tracer NO cambia el look, cambia el camino de resolución).

## Dependencias

Ninguna (arranca ya). No toca V.D slice 2.

## Closeout (2026-07-02 — sandbox `a38c731`)

- **Entregado**: `src/logic/logicIconResolver.ts` (16 roles v12 = claves de `LUCIDE_ROLE_ICONS`; alias de kinds/exts; type step gana a ext; orden v12 `resolveIconPackKey` :199-212) + `serviceDecorate` delega prop/tag/file al resolver (precedencia Iconic conservada) + 24 tests resolver + 8 de caracterización paridad.
  **Paridad visual = ids activos sin cambio**; look v12 = `PROTO_POLISH_ROLE_ICONS` exportado SIN cablear (preset polish, D8).
- **Ejecución**: subagente Sonnet (worktree `C:/tmp/vaultman-pai-001`) + recuperación del coordinador tras session-limit (patrón conocido). Incidente de canon: primer pass leyó `proto/` stale; corregido a `proto-v12/` vía mensaje al subagente + cierre del coordinador (ver §Canon raw del index).
- **Gates**: focal 49/49 · svelte-check **0/0** · unit 1155 pass (1 known-ajeno notebook-nav) · build→plugin-dev · reload + `dev:errors` limpio ×2 · DOM smoke:
  folder/file/tag renderizando ids de paridad, 0 fugas del mapa polish (`lucide-tags` único = dock chrome, no resolver).
- **Bonus (baseline, no PAI)**: commit `a38c731` reparó los 6 type-errors del upgrade de toolchain 2026-06-20 que ROMPÍAN `pnpm run build` (vite.config cast · svelte.d.ts TS2882 · explorerProps import · main.ts `declare settings`). Queda pendiente ajeno:
  crash de `eslint .` sobre `package.json` (chip/task aparte).
- Commits: `5fc80be`·`6f96ed0`·`27f8354`·`14916e4` (subagente) + `c7459bd` (v12 align) + `a38c731` (baseline build repair).
