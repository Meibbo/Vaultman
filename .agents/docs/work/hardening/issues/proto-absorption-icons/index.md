---
title: Proto Absorption — Icons (PAI) — piloto del absorption loop
type: issue-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-02T13:30:00
updated: 2026-07-02T13:30:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/issues
  - initiative/hardening
  - umbrella-v2/absorption
  - explorer/icons
---

# PAI — Proto Absorption: Icons (piloto)

Primer issue-set del **absorption loop** (workflow 2026-07-02, ver [[docs/current/norte|norte]]): convierte las filas del [[docs/work/hardening/research/2026-06-11-function-union-ledger/06-theme-style-icons-decorations|ledger cluster 06]] del subsistema de iconos en slices verticales tracer-bullet. Además de entregar el subsistema, **valida el formato de issue AFK/HITL** que escala al resto de sistemas proto.

## Por qué iconos primero

- **Gap SOLO-PROTO total** (ledger 06 hallazgo #4): ni stable ni sandbox tienen resolver semántico/overrides/picker — todo el subsistema = RESHAPE desde diseño puro.
- **Gate N2** de la pirámide ("iconos semánticos base: resolver + overrides persistidos").
- **No bloquea ni es bloqueado por V.D slice 2** (los iconos viven DENTRO de la celda NodeRow — turf N.R —, no en el layout del runtime).
- Canon del algoritmo = proto v12 (prioridad `folder→role→type→ext→override→fallback`).

## Anatomía del issue (formato piloto)

Cada issue declara: **Goal** · **Tag AFK|HITL** · **Tracer slice** (in/out de scope) · **Source rows** (ledger + proto refs) · **Reglas de traducción** (proto §29: nunca `window.*`, nunca DOM-query nav, nunca mock data) · **DoD tool-checkable** · **Executor sugerido** · **Dependencias**.

- **AFK** = DoD 100% verificable por herramientas (svelte-check 0/0 · autofixer `issues:[]` · unit/component focales verdes · build→plugin-dev · reload + `dev:errors` limpio · DOM smoke por obsidian-cli). Delegable sin dev.
- **HITL** = requiere juicio visual/UX del dev en plugin-dev. Los gates AFK aplican igualmente ANTES de la review humana.

## Issues

| # | Issue | Tag | Nivel | Estado |
|---|---|---|---|---|
| 001 | [[001-resolver-core-tree-tracer\|Resolver semántico core + tracer en tree]] | AFK | N2 | ✅ done 2026-07-02 (sandbox `a38c731`) |
| 002 | [[002-override-model-persistence\|Override model + persistencia PSS-shaped]] | AFK | N2 | ✅ done 2026-07-02 (`9c3ae29`; smoke live ✅) |
| 003 | [[003-icon-picker-island\|Icon picker island (polish)]] | HITL | N2 | **desbloqueado** (001+002 done) — próximo, requiere dev |
| 004 | [[004-resolver-rollout-explorers\|Rollout del resolver a props/tags/content]] | AFK | N2 | ✅ done 2026-07-02 (`09ba424`) |
| 005 | [[005-icon-packs-deferred\|Icon packs como assets — registro DEFER]] | DEFER | N4 | registro, no accionable |

Orden: 001 → (002 ∥ 004) → 003. 005 no se ejecuta en esta wave.

## Canon raw (⚠ leer antes de tocar cualquier PAI)

**Proto canónico = `C:/Users/vic_A/Downloads/vaultman/proto-v12/`** (carpetas `proto-vXX/` por versión; la carpeta `proto/` SIN sufijo es STALE v7-era — costó una corrección a mitad de PAI-001). El "vertical read v12" citado abajo ES el shard v7; deltas v7→v12 se verifican por sistema contra el raw. Detalle + convención de versiones:
[[docs/work/hardening/research/2026-07-02-proto-v12-design-inputs/index|Proto v12 design inputs]].

## Prior art y fuentes

- Ledger: [[docs/work/hardening/research/2026-06-11-function-union-ledger/06-theme-style-icons-decorations|cluster 06]] (tablas "Iconos semánticos", "Icon packs", "Bridge Iconic").
- Proto: [[docs/work/hardening/research/2026-05-29-version-streams-vertical-codebase-analysis/04-proto-design-v12-vertical-read|shard 04 vertical read]] (§9/§22-24 `icons.jsx` `Icon`/`resolveIconPackKey`/`normalizeIconOverride`/ `IconPickerIsland`; reglas duras de traducción en §29).
- Spec v5-era a RE-VALIDAR (no duplicar):
  [[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/index|Explorer Icon Pack Cache]] — cubre la parte packs/caché (aquí DEFER en 005; el descriptor-model de ese spec es input directo cuando 005 se active en lane C).
- Umbrella opens relacionados: índice de primitives Obsidian · icon packs importables (freedesktop) — [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|umbrella §Opens]].
- Código sandbox tocado: `src/services/serviceIcons.ts` (Iconic bridge — se CONSERVA), `src/services/serviceDecorate.ts` (DecorationManager + TYPE_ICON_MAP), `src/components/views/NodeRow.svelte` (`leading` affordance, N.R A1).

## Workflow de ejecución

Patrón de slice probado (handoff): worktree manual `C:/tmp/vaultman-pai-NNN` desde sandbox HEAD (NO `isolation:worktree`) → `pnpm install` 1ª vez → implementar (subagente con spec inline, o coordinador) → commit selectivo (no `.snap` EOL-only) → verify → FF a sandbox → actualizar este index + status/handoff/session-log + norte si cierra wave.
