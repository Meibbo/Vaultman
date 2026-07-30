---
title: BT3-002 — Sort level per-scope + parents-first interleave
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-002 — Sort level per-scope + parents-first interleave

**Diseño completo:**
[[docs/work/polish/specs/2026-07-17-v1-2-beta3-batch/01-sort-level|shard 01]] (leer ENTERO antes de tocar código). Decisiones D2/D3/D4.

**Resumen.** Estado `ExplorerSortState` v2 per-scope (`sorts` + `activeScope` + `drillNodeId` + `parentsFirst`); submenú "Sort level" en `openNativeSortMenu` y `popupSort.svelte`; `_applySort` de props/tags ordena ambos niveles siempre; files integra `All`/`drill` + fix interleave de parents-first OFF; drill via `longPressGesture` (patrón FTC-006); persistencia + migración en `SavedViewConfig.sortState`.

**Archivos:** `typeUI.ts` · `typeSettings.ts` · `explorerProps.ts` · `explorerTags.ts` · `explorerFiles.ts` · `logicFiles`(`buildFileTree`/`sortTree`) · `logicSort.ts` · `navbarFilters.svelte` · `popupSort.svelte` · `en.ts`/`es.ts`.

**DoD (AFK):**
- Suite de tests del shard 01 §Tests en verde (per-scope, invariante no-reshuffle, interleave, drill, migración, round-trip).
- Cambiar opción del submenú NO dispara re-sort (test de proyección estable).
- Labels: submenú `Sort level`; opciones según D3; `sort_props`/`sort_values` retirados.
- Gates estándar. `navbarFilters.svelte`/`popupSort.svelte` por autofixer.

**HITL dev:** feel del gesto drill + copy final de labels.
