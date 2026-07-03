---
title: PAI-002 — Override model + persistencia PSS-shaped
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

# PAI-002 — Override model + persistencia PSS-shaped

**Tag: AFK** · **Nivel: N2** · **Preset: flag** · **Executor sugerido: Sonnet 5 o Codex con spec inline**

## Goal

Traducir `normalizeIconOverride` del proto a un tipo `IconOverrideSpec` con prefijos
(`emoji:` · `pack:` · id pelado → lucide) + override por nodo aplicado vía el camino
`data-vm-*`→CSS existente, **persistido** con forma compatible PSS.

## Tracer slice

- **IN**: tipo + normalizador puro TDD · override por nodo y por provider · persistencia
  en plugin settings PERO con payload en la forma de las 4 clases de storage D-PSS
  (scope `node`/`panel`, clase config) para que la migración a PSS core (N1) sea un move,
  no un reshape — regla "build the contract shape once".
- **OUT**: UI de picker (PAI-003) · scope scene/workspace (N3) · packs (PAI-005).

## Source rows

Ledger 06: override model (SOLO-PROTO RESHAPE — `__vmIconOverrides` SIN persistencia en
proto) · override por nodo data-attr→CSS (OVERLAP RESHAPE) · persistencia icon overrides
= marcada `(sin evidencia)` → esta issue la define.

## Reglas de traducción

Las de PAI-001 (§29). Además: el payload persistido usa ids namespaced D6
(`file.X`/`folder.X`/`tag.X`) — nunca paths crudos como clave.

## DoD (tool-checkable)

1. Unit: normalizador (3 prefijos + inválidos) · round-trip persistencia
   (set → reload → resolve aplica override).
2. `svelte-check` 0/0 · autofixer `issues:[]`.
3. Unit completo sin regresiones nuevas.
4. Build → plugin-dev → reload → `dev:errors` limpio.
5. Smoke obsidian-cli: override programático sobre un nodo (via servicio) → DOM refleja
   icono nuevo → reload → override persiste.

## Dependencias

PAI-001 (consume `IconResolution` y el slot `override` de la cadena).

## Closeout (2026-07-02 — sandbox `9c3ae29`, rebased sobre PAI-004)

- **Entregado**: `logicIconOverride.ts` (normalizador puro `IconOverrideSpec`: `emoji:`/
  `adw:`→pack adwaita-v10/`pack:iconId`/bare→lucide + forma objeto, modos auto/manual per
  v12 :236-257) · slot `override` cableado en `resolveIcon` (gana a toda la cadena,
  conserva el `role` clasificado; malformado/pack no-local cae a la cadena — packs
  remotos = PAI-005) · `serviceIconOverrides.ts` (store per-node D6-namespaced + default
  per-provider; node > provider) · `DecorationManager` lo consulta (override > Iconic >
  cadena) · persistencia vía settings con **documento PSS-shaped**
  (`{pssVersion, storageClass:'config', scope:'node', nodes, providers}` — migración a
  PSS core = mover el sobre, no reshape).
- **Paridad**: 0 overrides = output byte-idéntico (caracterización intacta).
- **Gates**: focal 105/105 · check 0/0 (1199) · unit integrado 1213 pass (1 known-ajeno
  notebook-nav) · build exit 0 → plugin-dev. **Smoke live (2026-07-02 noche, plugin-dev)**:
  reload + `dev:errors` limpio · round-trip runtime: `setForProvider('files','emoji:🧪')`
  → resolve provider-level OK · `setForNode('file.x','star')` → **node gana a provider**
  (`lucide/star`) · `toDocument()` emite envelope `{pssVersion:1, storageClass:'config',
  scope:'node'}` · clears → resolve null · paridad tree intacta. ✅ DoD 5/5.
- Ejecución: subagente Sonnet, worktree `C:/tmp/vaultman-pai-001`, commits
  `b91b136`→`9c3ae29` (5, rebased). Fence con PAI-004 respetado (0 conflictos de rebase).
