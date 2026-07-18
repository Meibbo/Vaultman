---
title: BT3-006 — Tabs cmenu + view cmenu + In mode
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-006 — Tabs cmenu + view cmenu + In mode

Superficie: `navbarFilters.svelte` (`openNativeTabsMenu` L749-808,
`openNativeViewMenu` L670-747) + estados en `pageFilters.svelte` + explorers.
Minimal-only: paridad popupView = DEFER (D20). **No paralelizar con BT3-002**
(mismo archivo).

## Tabs cmenu (D14)

Orden nuevo: Files → Props → Tags → Content / sep Filters+Queue / sep Floating TOC /
sep **Statistics → Snippets → Plugins** / sep toggle Toolbar. (Hoy Snippets/Plugins
van pegados a Content y Statistics al final; mover ambos detrás de Statistics, antes
del divider del toggle.)

## View cmenu (D12)

Orden nuevo:
1. **Layouts** (submenu, ex "Config"): lista de layouts guardados → divider →
   **Save layout al FINAL** (hoy va primero, L704-709).
2. **In mode** (submenu nuevo, ver abajo).
3. **Cells**: `nested` PRIMERO, luego el resto por tab (hoy `nested` va último,
   `CELL_LABELS` L186-210).
4. **Modos/engines** (tree/list/table/grid/cards — hoy abren el menú; bajan al final).
El item suelto "ADD mode" (L735-745) desaparece (absorbido).

## In mode (D13)

Reemplaza `addModeActive` global (L361, `handleAddModeChange` L1028-1032:
`setAddMode` en props/files/tags) por **modo de interacción por tab**
(`inModeByTab: Record<FiltersTab, InteractionMode>`):

- **Files**: `Open` (default) · `Add` · `Select`. Open = comportamiento actual
  (click abre). Add = ADD mode actual renombrado. **Select** = port semántico de
  sandbox (click selecciona/deselecciona; base local `logicFileSelection.ts` de
  beta.2; referencia de semántica: comandos P.D slice 3 `select-visible-active-explorer`
  / `clear-active-explorer-selection`). Entra MÍNIMO: click=toggle selección, sin
  box-select.
- **Props/Tags**: `Open` (nuevo, PRIMERO en la lista) · `Filter` (default) · `Add`.
  Open = click solo expand/collapse; **ctrl+click = activa búsqueda por content** del
  nodo. Filter = comportamiento actual. Add = ADD mode actual.
- Radio-check del modo activo por tab; persiste en el per-tab view state (mismo canal
  que sort/cells; entra en saved layouts si el shape lo permite sin reshape — si no,
  session-state y se anota).

**DoD (AFK):**
- Source-guards de orden de ambos menús (tests estilo `contextMenuSource.test.ts` /
  tabs-menu guard existente).
- Unit: dispatch por modo (Open/Add/Select en files; Open/Filter/Add en props/tags;
  ctrl+click de Open dispara content-search callback).
- `addModeActive` global retirado; grep sin referencias muertas.
- i18n en+es (`In mode`, `Open`, `Add`, `Select`, `Filter`).
- Gates estándar + autofixer.

**HITL dev:** copy final + feel de Select (extensión box-select queda para refactor).
