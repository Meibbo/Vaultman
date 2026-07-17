---
title: BT3-002 — Sort level per-scope + parents-first interleave
type: issue
status: completed
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T13:10:30
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish]
---

# BT3-002 — Sort level per-scope + parents-first interleave

**Diseño completo:**
[[docs/work/polish/specs/2026-07-17-v1-2-beta3-batch/01-sort-level|shard 01]]
(leer ENTERO antes de tocar código). Decisiones D2/D3/D4.

**Resumen.** Estado `ExplorerSortState` v2 per-scope (`sorts` + `activeScope` +
`drillNodeId` + `parentsFirst`); submenú "Sort level" en `openNativeSortMenu` y
`popupSort.svelte`; `_applySort` de props/tags ordena ambos niveles siempre; files
integra `All`/`drill` + fix interleave de parents-first OFF; drill via
`longPressGesture` (patrón FTC-006); persistencia + migración en
`SavedViewConfig.sortState`.

**Archivos:** `typeUI.ts` · `typeSettings.ts` · `explorerProps.ts` · `explorerTags.ts` ·
`explorerFiles.ts` · `logicFiles`(`buildFileTree`/`sortTree`) · `logicSort.ts` ·
`navbarFilters.svelte` · `popupSort.svelte` · `en.ts`/`es.ts`.

**DoD (AFK):**
- Suite de tests del shard 01 §Tests en verde (per-scope, invariante no-reshuffle,
  interleave, drill, migración, round-trip).
- Cambiar opción del submenú NO dispara re-sort (test de proyección estable).
- Labels: submenú `Sort level`; opciones según D3; `sort_props`/`sort_values` retirados.
- Gates estándar. `navbarFilters.svelte`/`popupSort.svelte` por autofixer.

**HITL dev:** feel del gesto drill + copy final de labels.

## Implementation closeout (2026-07-17)

- Code-only commit: `ee7bc0f2 feat(explorer): add scoped sort levels`.
- Añadido estado v2 canónico (`sorts`, `activeScope`, `drillNodeId`,
  `parentsFirst`) con normalización, defaults por explorer, migración del shape legacy
  y fallback de targets drill huérfanos. `SavedViewConfig` persiste y recupera el estado
  completo; `childLevel` legacy se descarta por diseño.
- Props ordena Properties y Values con comparadores independientes. Tags y Files aplican
  `All` recursivo y el override `Drill` solo bajo el nodo elegido. Files permite
  interleave real cuando `parentsFirst=false` y conserva la partición folders-first
  cuando está activo.
- Native menu y popup exponen `Sort level`; Props ofrece Properties/Values y Tags/Files
  All/Drill. Files muestra Parents First antes del divisor. Retiradas las keys i18n
  obsoletas `sort_props`/`sort_values`; copy nueva en inglés y español.
- El selector Drill usa `LongPressGesture` sobre el pane activo y `data-id`, con captura
  de eventos, cancelación/timeout y supresión separada del click posterior. Elegir scope
  o target solo actualiza estado de UI; no aplica un sort hasta cambiar la opción del
  scope activo. Los filtros de tipo usan callback separado y preservan la proyección de
  orden aplicada, incluido el caso scope-pendiente + filtro.
- TDD observado en rojo y verde para migración/round-trip/scopes, estabilidad de
  proyección, interleave, drill y guards de wiring. Gate final: 7 files / 71 tests
  focales; full unit 93 files / 485 tests; `pnpm run check` 0/0; ESLint, Prettier,
  build y `git diff --check` verdes; autofixer `issues:[]` en ambos `.svelte`.

### Adversarial pass C2

Verificados layouts legacy y desconocidos, targets drill válidos/huérfanos, jerarquías
profundas, selectores reales del pane/row, click residual del long-press y la interacción
entre un scope seleccionado pero aún no aplicado y los filtros de tipo. Las carpetas no
tienen métricas agregadas equivalentes a archivos para todos los sorts: usan su valor
sintético/neutral dentro del interleave, sin inventar agregados. Se pierde el reorder
inmediato del toggle legacy por D5. Feel visual, mobile y Obsidian, copy final del gesto y
métricas agregadas de folders no se validan aquí; los tres primeros quedan HITL/delistados
y el último no forma parte del diseño locked.
