---
title: BT4 — v1.2.0-beta.4 batch (issue-set)
type: issue-index
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-18T00:00:00
created_by: claude-fable-5
tags:
  - agent/issues
  - initiative/polish
  - release/1.2.0
---

# BT4 — v1.2.0-beta.4 batch

Issue-set del spec
[[docs/work/polish/specs/2026-07-18-v1-2-beta4-batch/index|beta.4 batch]] (D21-D37).
Base `dev` @ `fa48b96a` (beta.3 publicada); rama `v12/bt4`. Detalle por grupo en
shards: [[01-regressions|01 regresiones]] · [[02-bugs|02 bugs]] ·
[[03-redesign-ia-features|03 redesign/IA/features]].

| Issue | Título | Grupo | Estado |
|---|---|---|---|
| BT4-001 | Toolbar tool-case collapse (regresión) | 01 | ✅ `736a9e62` (search yield + threshold label-aware) |
| BT4-002 | Tags explorer hang + memory leak (regresión) | 01 | in-progress (leak `onLoaded` hallado; hang pende repro dev) |
| BT4-003 | Rail no se mueve al lane reservado (regresión) | 01 | ✅ `736a9e62` (shift 14px restaurado) |
| BT4-004 | Addon index reveal al top + unificar seam | 02 | pending |
| BT4-005 | Niagara tap vs scrub (intent threshold) | 02 | pending |
| BT4-006 | Plugin toggle cell stale ante cambios externos | 02 | pending |
| BT4-007 | Orden cells plugins: config antes de toggle | 02 | pending |
| BT4-008 | Content search solo .md + sin freeze | 02 | pending |
| BT4-009 | By level sort (redesign, shard 01 del spec) | 03 | pending |
| BT4-010 | Settings IA: dock, context menus, Explorer page | 03 | pending |
| BT4-011 | Iconic addons + iconos emitidos por plugins | 03 | pending |
| BT4-012 | Cell+sort+hover "remaining inline tasks" | 03 | pending |
| BT4-013 | Files cmenu configurable (DnD + dividers) | 03 | pending |

Orden recomendado: 002 → 001 → 003 → 008 → 004 → 006 → 007 → 005 → 009 → 011 →
010 → 012 → 013. **001 y 009 comparten `navbarFilters.svelte`: serial.**

## Reglas comunes

- Regresiones (001-003): skill **`vm-regression-resolver`** obligatorio — oráculo
  beta.2 = `5e5fa1df`; rango culpable `03fe92bc..7ba6a3c9`; commit fix cita
  `COMMIT_BUENO`/`COMMIT_MALO`.
- Gates por issue: RED/GREEN focal · check 0/0 · autofixer `issues:[]` en `.svelte`
  tocados · lint/stylelint · build · scorecard · full unit al integrar. Testing
  visual/UI/Obsidian/mobile delistado para agentes.
- Two-commit código/docs; `.agents` jamás en pushes; sin push/tag/FF sin el dev.
- i18n en+es sincronizados; adversarial pass C2 al cerrar cada slice.
