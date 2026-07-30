---
title: A.R Migration Sequence — TDD red→green
type: spec-shard
status: draft
parent: "[[index|A.R Action Routing]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T00:00:00
---

# Migration Sequence (TDD red→green)

Cada step: escribir test que falla (RED) → implementar mínimo (GREEN) → commit. ~8-12 commits.
Estrategia de bajo riesgo: **service-first** (lógica pura primero, jsdom), luego caret, luego normalización del seam, luego adopción por-view (paralelizable), luego expand-all + cmenu, luego gate final. Los services salen de extracción de código existente, no greenfield → menor riesgo de regresión.

## Gate-0 (pre-código, NO commit)

Asserta que **0-A está cerrado**: C12 (flicker fix) + C13 (verification gates) checkeados y `pnpm verify` verde en 0-A. A.R consume el View Feature Contract commiteado (C1-C11), pero no se toca código de A.R hasta que 0-A cierre, para no rebasar sobre markup en flujo. Ver [[05-risks-and-deferred]] (§Gate 0-A).
También: confirmar que los ~10 M files pre-existentes del usuario (incluyen ViewNodeList.svelte + viewTree.svelte modificados) **no se commitean**; A.R debe layerar limpio sobre ellos o coordinar.

## Step 1 — Tipos + intent resolver (RED→GREEN)

- **RED**: `test/unit/services/actionRouting.intent.test.ts` — `resolveActionIntent` para `{row,caret}×{click,aux,keyboard}×{mouse,keyboard}`; `selectionModifiersFromEvent` (ctrl/meta→additive, shift→range, alt no-selección); combos reservados → `{kind:'ignored'}`.
- **GREEN**: `src/types/typeActionRouting.ts` + `resolveActionIntent` + `selectionModifiersFromEvent`.
  Rutea por `resolveNodeMouseActions` preservando primary=`filter`.
- Commit: `feat(A.R): add action-routing intent resolver + modifier translation`.

## Step 2 — serviceKeyboardNav (RED→GREEN)

- **RED**: `test/unit/services/keyboardNav.test.ts` — tabla de teclas de [[02-contract-shapes]] §4 por topology `linear`/`planar`/`planar-drill`. Incluye los gaps: Home/End universal + type-ahead (buffer + timeout). Casos de paridad con la lógica actual de `panelExplorer.handleRowKeydown` (Up/Down/Page/Space/Enter/tree-arrows/folder-drill/inline-expand).
- **GREEN**: `src/services/serviceKeyboardNav.ts`. **Extrae** la lógica de `panelExplorer.handleRowKeydown` (632-704), `handleTreeArrowLeft/Right`, `handleGridNavigationKeydown`, `handleInlineGridExpansionKeydown`, `handlePageNavigation`, `keyboardTargetId` → controller topology-aware. Añade Home/End + type-ahead. NO borra aún el llamador del panel (eso es Step 5/6).
- Commit: `feat(A.R): add topology-aware serviceKeyboardNav (extract + Home/End + type-ahead)`.

## Step 3 — serviceRowAction builder (RED→GREEN)

- **RED**: `test/unit/services/rowAction.test.ts` — `getRowProps`/`getCaretProps`/ `getKeyboardHandlers`: `data-row-key === callbackId`, `aria-selected`/`aria-expanded` correctos, click→intent→dispatch, caret `onclick` hace `stopPropagation` + toggle, gateado por feature flags.
- **GREEN**: `src/services/serviceRowAction.ts` (`createRowAction`). Consume serviceKeyboardNav + serviceSelection + serviceMouse + feature flags.
- Commit: `feat(A.R): add serviceRowAction builder (Melt-UI prop-bags)`.

## Step 4 — Caret fix (RED→GREEN)

- **RED**: `test/component/viewTreeCaret.test.ts` — (a) `.vm-tree-toggle` clickable target ≥24×24 CSS px (computed min-width/min-height); (b) caret rama sigue haciendo `stopPropagation` (solo `onToggle`, no `onRowClick`) — regresión-guard del comportamiento ya testeado en `viewTreeSelection.test.ts`.
  NOTA: NO se asserta "leaf swallows click" — `viewTreeSelection.test.ts:139` ya prueba que el placeholder de hoja es inerte by-design y el row-click funciona; no se toca.
- **GREEN**: `_tree.scss` — `.vm-tree-toggle { min-width: 24px; min-height: 24px; }` (padea el área;
  `--vm-tree-toggle-size` del icono permanece 20px → no rompe asserts de `--vm-tree-icon-size`). El `aria-hidden`/role decorativo del caret de rama llega con `getCaretProps` en Task 6a (no aquí).
  ArrowRight/Left a nivel treeitem ya funciona vía `panelExplorer.handleRowKeydown`.
- Commit: `fix(A.R): caret WCAG 2.5.8 hit-target (>=24x24)`.

## Step 5 — Normalización del seam: drop Contract B (RED→GREEN)

- **RED**: `test/component/selectionContractParity.test.ts` — list emite las mismas mutaciones de selección que tree/table/grid/cards ante click + modifiers idénticos (sin MouseEvent sintético).
- **GREEN**:
  - ViewNodeList.svelte: emitir `onRowClick(id,e)` / `onRowKeydown(id,e)` / `onContextMenu(id,e)`;
    borrar `onSelect`/`onActivate`/`onFocus` props (51-53) y `SelectModifiers` (39-43); borrar `handleSelect` (230-237) y `handleKeydown` inline (239-269) — list ahora emite `onRowKeydown(id,e)` y pasa por el mismo `handleRowKeydown` del panel que los demás views (que migra a serviceKeyboardNav en Step 6).
  - ViewHost.svelte: borrar props 96-99 (`onSelect`/`onActivate`/`onFocus`/`onListContextMenu`) + `handleListContextMenu` (139-141); en el bloque list (174-186) wirear el contrato A.
  - panelExplorer.svelte: borrar `handleListSelect` (598-603), `handleListActivate` (605-607), `handleListFocus` (609-612), `handleListContextMenu` (614-616), `mouseEventFromListModifiers` (618-630); borrar props 1292-1295 del mount. `selectNode` mantiene la mutación pero la derivación de modifiers pasa a `serviceRowAction` (Step 6 las cablea).
- Commit: `refactor(A.R): drop list Contract B + synthetic MouseEvent bridge`.

## Step 6 — Adopción de builders por-view (RED→GREEN, paralelizable)

Un commit por view. Cada view spreadea `{...getRowProps(id)}` + (donde aplique) `{...getCaretProps(id)}` y delega keyboard a `getKeyboardHandlers`. El panel construye un `RowActionContext` por provider y lo pasa **por Svelte context** a ViewHost (mismo patrón que `NODE_ELEMENT_MASK_KEY` en viewHostContext.ts:6, usado por 0-A) → los views lo leen con `getContext`, evitando prop-drilling.

- **RED** (por view): `test/component/keyboardNavParity.<view>.test.ts` — mismas teclas → mismos movimientos de focus/selección que la tabla de [[02-contract-shapes]] §4; grid/cards usan geometría planar; grid folder/inline usan drill.
- **GREEN**: viewTree, ViewNodeTable (borra `handleTableKeydown` Ctrl+A-only, ahora vía servicio), ViewNodeGrid, ViewNodeCards adoptan los builders. panelExplorer: `handleRowKeydown` (632-704) ahora delega al controller vía el `RowActionContext` provisto por context.
- Commits: `refactor(A.R): adopt row-action builder in <view>` × (tree, table, grid, cards).

## Step 7 — Expand/collapse-all data-gated (RED→GREEN)

- **RED**: `test/component/expandAllParity.test.ts` — expand-all/collapse-all funciona en todo view con filas expandibles (no solo tree/grid); no aparece en views planos sin children; grid `inline` rutea a `gridExpandedIds`.
- **GREEN**: panelExplorer.svelte: reemplazar `hasExpansionSurface = viewMode==='tree'||'grid'` (137) por `hasExpandableRows` derivado de datos (`collectExpandableNodeIds(nodes).length > 0`); propagar `nodeExpansionCommand` a todos los views; en grid `inline` rutear a `gridExpandedIds`. Preserva el render inline-expand existente.
- Commit: `feat(A.R): data-gate expand/collapse-all across views`.

## Step 8 — cmenu trigger unificado (RED→GREEN)

- **RED**: `test/component/cmenuTriggerParity.test.ts` + `test/unit/services/serviceCMenu.test.ts` (extender el existente) — todos los views disparan `onContextMenu(id,e)`; el standard set aparece para el nodeType correcto; un solo path de apertura.
  - Nota de conteo: el umbrella dice "standard 10-item" pero nombra **8** acciones (Open/Rename/Move/Tag/Prop/Duplicate/Queue/Delete). El set exacto (8 nombradas + las extra que el registry per-provider ya tenga, ej. `file.set` "Set (append link)" en explorerFiles.ts) se reconcilia **aquí**, leyendo los `registerAction({...})` reales de los 6 providers. Registrar faltantes; NO rebuild del registry.
- **GREEN**: reconciliar `provider.handleContextMenu(node,e,...)` (panelExplorer:595) vs `ContextMenuService.openPanelMenu` (serviceCMenu.ts:62) — elegir un path único. Verificar que cada provider (explorerFiles/Tags/Props/Snippets/Plugins/Content) registra su parte del standard set;
  registrar faltantes (NO rebuild del registry). Pin del set exacto vs `02` se hace aquí contra el código real.
- Commit: `refactor(A.R): unify context-menu trigger + verify standard action set`.

## Step 9 — Gate final (verde + smoke + docs)

- Correr la matriz completa de [[04-verification-matrix]].
- Live `plugin-dev` smoke; `obsidian vault=plugin-dev dev:errors` = `No errors captured`.
- Actualizar `.agents/docs/current/status.md` + `handoff.md` (next = writing-plans del siguiente sub-system o ejecución).
- Commit: `test(A.R): action-routing verification matrix + live smoke green`.

## Resumen de deletions (anti-smell)

| Archivo | Borrar | Motivo |
|---|---|---|
| panelExplorer.svelte | `mouseEventFromListModifiers` (618-630) | MouseEvent sintético |
| panelExplorer.svelte | `handleListSelect/Activate/Focus/ContextMenu` (598-616) | bridge Contract B |
| ViewHost.svelte | props 96-99 + `handleListContextMenu` (139-141) | Contract B |
| ViewNodeList.svelte | `SelectModifiers` (39-43), `handleSelect` (230-237), `handleKeydown` (239-269) | divergencia |
| ViewNodeTable.svelte | `handleTableKeydown` Ctrl+A-only | subsumido por servicio |

`panelExplorer.handleRowKeydown` (632-704) y `selectNode` (511-519) se conservan/adelgazan (la lógica migra al servicio; el panel queda como cableador del `RowActionContext`).
