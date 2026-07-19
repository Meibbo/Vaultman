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
| BT4-002 | Tags explorer hang + memory leak (regresión) | 01 | ✅ CERRADO (retest dev OK, `5f571932`) |
| BT4-003 | Rail no se mueve al lane reservado (regresión) | 01 | ✅ `736a9e62` (shift 14px restaurado) |
| BT4-004 | Addon index reveal al top + unificar seam | 02 | ✅ `8ace5549` |
| BT4-005 | Niagara tap vs scrub (intent threshold) | 02 | ✅ `62429f1a` (450ms/8px + gate deform/slide) |
| BT4-006 | Plugin toggle cell stale ante cambios externos | 02 | ✅ `f199ed64` (firma + poll visible + css-change) |
| BT4-007 | Orden cells plugins: config antes de toggle | 02 | ✅ `8ace5549` |
| BT4-008 | Content search solo .md + sin freeze | 02 | ✅ `82f254ca` (allowlist md + pending tras debounce) |
| BT4-009 | By level sort (redesign, shard 01 del spec) | 03 | ✅ fase 2 `e82efc53` (grupo D29 + fixed folders + drill click/dashed/label-6 + inline D32 + sync D31 + contextual D33). Residual: paridad popupSort (experimental) pendiente tipo D20; toolbar de tags no refleja scope externo del sync D31 (files sí) |
| BT4-010 | Settings IA: dock, context menus, Explorer page | 03 | ✅ `bccd7750` (dock bajo preset; Context menus y Explorer como sub-pages al cierre de Layout Settings) |
| BT4-011 | Iconic addons + iconos emitidos por plugins | 03 | ✅ `3b95a9ae` (ribbon `pluginId:Title` + override Iconic ribbonIcons + Change icon en cmenu plugins; snippets sin item-kind Iconic = as-is) |
| BT4-012 | Cell+sort+hover "remaining inline tasks" | 03 | pending |
| BT4-013 | Files cmenu configurable (DnD + dividers) | 03 | pending |
| BT4-014 | Rainbow folders opt-in (research BT3-010 mecanismo c, D38) | 03 | pending |
| BT4-015 | Option "Exclude file" en files explorer (D39) | 03 | pending |
| BT4-016 | Floating index state+scope en view-config (D40) | 03 | pending |
| BT4-021 | Color de glyphs | 03 | ✅ `7c471e15` (dropdown vars+accent+rainbow · modo static/always) |
| BT4-022 | Explorers vacíos al volver de tab | 02 | ✅ `038b1278` (refreshViewport() en 5 paneles + rAF on-activate) |
| BT4-023 | Custom icons only + change-icon props/tags | 02 | ✅ `d9443386` — gate exigía `openIconPicker` inexistente; ahora managers `onContextMenu(path,event)` (verificado runtime vivo) + rename; scope custom: re-verificar tras 024 |
| BT4-024 | Refresh externo de Iconic | 02 | ✅ `09ae0859`+`8f054966` (watch mtime data.json 2.5s → reload+invalidate+notify; cubre todos los providers vía el service) |
| BT4-025 | Hover info: toggle de label + TODOS los cells presentes/futuros (registro compartido de cells) | 03 | pending |
| BT4-026 | Option: icon cell en el slot del caret | 03 | pending |
| BT4-027 | Rework exclusión: files = FILTRO (como exclude-folder, por nodo, cualquier explorer); no-files = settings especiales | 03 | pending (rework de 015) |
| BT4-028 | Toggle toolbar/dock (settings que re-renderizan) rompe algo — repro pendiente de detallar con dev | 02 | pending (frase cortada en el reporte; confirmar síntoma) |
| BT4-029 | Engine "grid" → rename "cards" + box ajustado al contenido cuando no hay cells activos (no reservar espacio) | 03 | pending |
| BT4-030 | Iconic round 3 | 02 | watch ✅ `31657f56` (root cause: throttling congela timers; trigger real = vault `raw` event, PROBADO vivo <2s) · doble-cmenu ribbon QUITADO · PENDIENTE: registro propio snippets/plugins + picker |
| BT4-031 | tasks cell solo | 02 | ✅ `7dc846b5` (tasks entra al gate del badgeZone) |
| BT4-032 | Card "Tasks" en Statistics con los 3 scopes | 03 | pending |
| BT4-033 | Icono tasks pill | 02 | ✅ `7dc846b5` (lucide-square-check-big) |
| BT4-034 | Botón "view" en view configs / filter templates / operation presets: lista completa de lo que cargará (index, cells, by-level, sorts…) — no description, segundo botón | 03 | pending |
| BT4-017 | Niagara: pared de desplazamiento según frame (proto v13) | 02 | ✅✅ `86512e06` — root cause REAL: host medía el wrap de 30px (offsetParent), no el viewport → room≈0 congelaba el rail y cap clavado en 40px; + stretch mode D45 (`tocStretch`) |
| BT4-018 | Content search: pausar/reanudar | 02 | ✅ `7da6426d` (freeze parcial→filtro efectivo, quita loading, habilita replace; resume re-corre) |
| BT4-019 | Content search: conteo de resultados ≠ core search (3 vs 1) | 02 | ✅ `a0e1e3f1` (offsets locales autoritativos) |
| BT4-020 | Content search: refresh tras replace | 02 | ✅ `be2cce4a` (vault modify re-keys, debounce 400ms) |

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
