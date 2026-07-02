---
title: Proto v12 design inputs — importados de Downloads (2026-07-02)
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-02T18:10:00
updated: 2026-07-02T18:10:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/research
  - umbrella-v2/absorption
  - proto-v12
---

# Proto v12 design inputs (import 2026-07-02)

Tres documentos de diseño del dev que vivían SOLO en `C:/Users/vic_A/Downloads/vaultman/`
(sin indexar en pkm-ai), importados verbatim por decisión del dev (grill 2026-07-02).
Provenance: el dev escribe estos specs junto a los prototipos.

## Canon raw del proto (registrado aquí, decisión dev 2026-07-02)

- **Home**: `C:/Users/vic_A/Downloads/vaultman/` — carpetas `proto-vXX/` por versión
  (+ `Vaultman Prototype vXX.html`). **La carpeta SIN sufijo `proto/` es STALE (v7-era).**
- **Canónico actual = `proto-v12/`**. Seguirá subiendo (v13+); ante cualquier duda,
  la carpeta `proto-vXX` de número más alto es el canon, y se verifica con el dev.
- **Drift conocido**: el "vertical read v12" citado por umbrella/ledger ES el shard
  `04-proto-design-v7-vertical-read` (v7). Decisión dev (opción b): NO re-read completo
  de v12; los deltas v7→v12 se verifican POR SISTEMA contra el raw al absorber cada uno
  (patrón PAI-001: el implementador lee el `proto-v12/<archivo>.jsx` del sistema).

## Documentos

| Doc | Qué aporta | Consumidor |
|---|---|---|
| [[icon-system-v10-to-v11-migration-spec\|Icon system migration v10→v11]] | trabajo del icon-system implementado en v10 y portado a v11 (resolver/packs/overrides evolución) | PAI-002/003 (verificar contra `proto-v12/icons.jsx`, que supersede) |
| [[icon-pack-scene-surface-research\|Icon-pack scene/surface research (v10)]] | update path del icon-pack v5→v10; distinción arquitectural pack↔scene/surface | PAI-005 (packs, lane C) + spec v5-era icon-pack-cache |
| [[view-taxonomy-v12-implementation-notes\|View taxonomy v12 notes]] | los 4 ejes del view contract v12 (`engine/mode/…`, naming `lineal/grid/matrix/canvas`) | thread B (typeViewConfig al canon; reconciliar naming C-12/ADR 0012) |

## Regla de uso

Estos docs son INPUT de diseño del dev, no canon técnico del repo: al consumirlos,
verificar contra el raw `proto-v12/` y contra el canon lockeado
([[docs/architecture/explorer-model/05-view-canon|05-view-canon]] + ADR 0012 — p.ej.
el naming de engines del canon YA supersede `lineal/grid/matrix/canvas` de las notas v12).
