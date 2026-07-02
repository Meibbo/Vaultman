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
