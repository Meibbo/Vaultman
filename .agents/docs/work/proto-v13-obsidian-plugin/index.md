---
title: Proto v13 → Obsidian plugin (Desktop/refactor)
type: initiative-index
status: active
initiative: proto-v13-obsidian-plugin
created_by: deepseek-v4-opencode
dateCreated: 2026-08-07
tags:
  - proto/v13
  - obsidian/plugin
---

# Proto v13 → plugin Obsidian (Desktop/refactor)

Iniciativa para portar el prototipo `Vaultman Prototype v13` (React 18, HTML single-file +
13 JSX global-scope en `Downloads/Vaultman/`) al plugin Obsidian de `C:\Users\vic_A\Desktop\refactor`
(sample TS/esbuild), con paridad visual 1:1 y persistencia vía settings del plugin.

## Estado

- Espec: `specs/2026-08-07-proto-v13-integration/index.md` — **draft, review del dev pendiente**.
- Plan, issues e implementación: pendientes (checklist brainstorming).

## Decisiones (grill 2026-08-07)

1. Datos mock del proto (sin vault real).
2. React 18 bundleado en `main.js` (esbuild); JSX global-scope → módulos ES por archivo (opción B).
3. ItemView central en el workspace + ribbon + command.
4. Persistencia de estado proto vía settings (`data.json`).
5. Identidad `Vaultman` (id `vaultman-prototype` para no colisionar con el plugin real).

## Ruta

- [ ] Spec aprobada por el dev.
- [ ] Plan de implementación (`plans/`).
- [ ] Issues verticales.
- [ ] Implementación + gates (build, smoke visual, persistencia).