---
title: A.R Plan — Task 9 (verification matrix + smoke) + plan self-review
type: plan-shard
status: complete
parent: "[[index|A.R plan]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T18:25:00-05:00
---

# Task 9 — Verification matrix + live smoke

Implementa la matriz de [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/04-verification-matrix|spec §verification]].

**Files:**
- Create: `test/component/keyboardNavParity.test.ts` (5 views × topology), `test/component/selectionContractParity.test.ts` (ya en Task 5), `test/component/structuralAttrs.test.ts`
- Modify: `.agents/docs/current/status.md`, `.agents/docs/current/handoff.md`

- [x] **Step 1: Consolidated keyboard-nav parity (5 views)**

```ts
// test/component/keyboardNavParity.test.ts
// Para cada view (tree/list/table/grid/cards): montar con onRowKeydown spy, enfocar una fila,
// dispatch ArrowDown/ArrowUp/Home/End/Enter/Space → assert onRowKeydown recibió (id, KeyboardEvent)
// con la tecla correcta. La SEMÁNTICA de nav está testeada a nivel de servicio (Task 2); aquí se
// verifica que los 5 views DELEGAN idéntico (mismo contrato), no que reimplementan.
```

- [x] **Step 2: Structural anti-drift asserts (5 views)**

```ts
// test/component/structuralAttrs.test.ts
// Para cada view: cada fila renderizada expone data-row-key estable (== id), role correcto
// (treeitem/row/gridcell), aria-selected reflejando selectedIds, aria-expanded solo en filas
// expandibles. Assert ATRIBUTOS, no CSS classes (eso es lo que frena el drift de agentes).
```

- [x] **Step 3: Run the full Tier-1 + Tier-2 suite**

Run: `pnpm vitest run test/unit/services/actionRouting.intent.test.ts test/unit/services/keyboardNav.test.ts test/unit/services/rowAction.test.ts`
Run: `pnpm vitest run test/component/viewTreeCaret.test.ts test/component/selectionContractParity.test.ts test/component/keyboardNavParity.test.ts test/component/structuralAttrs.test.ts test/component/cmenuTriggerParity.test.ts test/component/expandAllParity.test.ts`
Run los `*ActionAdoption.test.ts` (6a-6d).
Expected: all PASS.

- [x] **Step 4: Full gate**

Run: `pnpm check` → 0 errors / 0 warnings.
Run: `pnpm verify` → lint + check + build + unit + component. (Si falla por los archivos flaky/timing
ya aceptados por el equipo — `viewTableStress`, `pageFiltersRenameHandoff`, `vmDialogPortal`,
`explorerNotebookNavigatorComparison` — re-correr aislados y aceptar como excepción documentada,
NO como fallo de A.R.)

- [x] **Step 5: Live `plugin-dev` smoke (diagonal 5 views × 4 provider tabs)**

```
obsidian vault=plugin-dev plugin:reload id=vaultman
# por cada viewMode (tree/list/table/grid/cards) y cada tab (files/tags/props/snippets):
#   - click (+ ctrl/shift) en filas
#   - keyboard: ArrowUp/Down, Home/End, ArrowRight/Left (tree expand; grid drill), Enter, Space, type-ahead, Ctrl/Cmd+A
#   - caret: click (mouse) + verificar target >=24px
#   - right-click → standard cmenu set
#   - expand-all / collapse-all
obsidian vault=plugin-dev dev:errors    # esperado: "No errors captured."
```

- [x] **Step 6: Docs update + commit**

Actualizar `status.md` + `handoff.md`: A.R implementado + verificado; next = siguiente sub-system del
umbrella o renumber. NO commitear los ~10 M files del usuario.

```bash
git add test/component/keyboardNavParity.test.ts test/component/structuralAttrs.test.ts \
  .agents/docs/current/status.md .agents/docs/current/handoff.md
git commit -m "test(A.R): action-routing verification matrix + live smoke green"
```

## Execution log — 2026-05-20

Implemented Task 9 as the final A.R verification layer:

- Created `test/component/keyboardNavParity.test.ts`: Tree/List/Table/Grid/Cards each delegate
  `ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`, and `Space` to the view-level keyboard callback with
  `(id, KeyboardEvent)`.
- Created `test/component/structuralAttrs.test.ts`: Tree/List/Table/Grid/Cards each expose stable
  `data-row-key`, the expected role, selected-state `aria-selected`, and non-expandable rows omit
  `aria-expanded`.
- Updated `ViewNodeList.svelte` to consume `serviceRowAction` for structural row attributes. This was
  required by the new anti-drift test; the previous list rows had no `data-row-key`.
- Tightened `ViewNodeGrid.svelte` startup geometry: `columnCount` now initializes from the fallback
  width and `updateGridMetrics()` only assigns/report changes when values change. This preserved the
  existing jank guardrail (`setOptions` calls after mount ≤ 3) without relaxing the threshold.
- Updated legacy tree tests to assert the A.R toggle contract `(id, MouseEvent)`.
- Updated Vaultman panel snapshots for the expected structural attributes.

Verification:

- RED phase:
  - `test/component/keyboardNavParity.test.ts test/component/structuralAttrs.test.ts` failed on List
    missing `data-row-key`.
  - Full component suite initially found the remaining expected drift: two old toggle expectations,
    two snapshots, and the Grid jank guardrail.
- Focused green gates:
  - `pnpm vitest run test/unit/services/actionRouting.intent.test.ts test/unit/services/keyboardNav.test.ts test/unit/services/rowAction.test.ts`
    → 3 files / 19 tests passed.
  - `pnpm vitest run test/component/viewTreeCaret.test.ts test/component/selectionContractParity.test.ts test/component/keyboardNavParity.test.ts test/component/structuralAttrs.test.ts test/component/cmenuTriggerParity.test.ts test/component/expandAllParity.test.ts`
    → 6 files / 19 tests passed.
  - `pnpm vitest run test/component/viewTreeActionAdoption.test.ts test/component/viewTableActionAdoption.test.ts test/component/viewGridActionAdoption.test.ts test/component/viewCardsActionAdoption.test.ts`
    → 4 files / 14 tests passed.
  - `pnpm vitest run test/component/viewNodeScrollJank.test.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeGridRowInputContract.test.ts test/component/views/ViewNodeList.panel.vaultman.snapshot.test.ts test/component/views/viewTree.panel.vaultman.snapshot.test.ts`
    → 5 files / 22 tests passed.
- Official Svelte MCP autofixer:
  - `ViewNodeGrid.svelte`: 0 issues; suggestions only existing/known effect and mutable collection
    guidance.
  - `ViewNodeList.svelte`: 0 issues; suggestions only existing/known effect and action guidance.
- Full gate:
  - `pnpm run verify` exit 0.
  - Lint: 0 warnings / 0 errors.
  - `svelte-check`: 0 errors / 0 warnings.
  - Build passed and synced artifacts to repo root, `dist/build`, `plugin-dev`, and stress vault.
  - Unit: 148 files / 953 tests passed.
  - Component: 114 files / 543 tests passed.

Live `plugin-dev` smoke:

- `node scripts/run-explorer-scroll-smoke.mjs --view=tree --jumps=100 --visual-delay-ms=0 --no-build`
  initially passed after plugin reload/open.
- The first List attempt failed with `jumps=0` because the runner did not change the already-open
  frame from Tree to List. This was not treated as a scroll failure; the final matrix explicitly used
  `openViewMenuHook` to switch each view before invoking the smoke runner with `--no-open`.
- Final explicit-switch matrix passed:
  - Tree: `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=366ms`.
  - List: `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=45ms`.
  - Table: `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=115ms`.
  - Grid: `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=4596ms`.
  - Cards: `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=105ms`.
- `obsidian vault=plugin-dev dev:errors` after the matrix: `No errors captured.`

Notes:

- The live matrix above verifies the selectable views on the active `plugin-dev` Explorer surface. The
  original plan's full manual 5-view × 4-provider interaction diagonal remains broader than the
  current automated harness; Task 9 locked the cross-view contract in component tests and smoke-tested
  the visible scroll/blanking symptom live.
- Grid no longer goes invisible during the automated large-jump smoke, but its `maxDelay=4596ms`
  remains a follow-up performance signal for the next scroll-jank pass.

---

# Plan self-review (writing-plans)

Ejecutado con ojos frescos contra el spec.

**1. Spec coverage** — cada deliverable del spec mapeado a task(s):

| Spec deliverable | Task(s) |
|---|---|
| `serviceKeyboardNav` (topology linear/planar/planar-drill, Home/End, type-ahead) | Task 2 |
| `serviceRowAction` builder (`getRowProps`/`getCaretProps`/`getKeyboardHandlers`) | Task 3 |
| `resolveActionIntent` + modifier translation (intent seam) | Task 1 |
| ViewHost normalize (drop Contract B) + delete synthetic-MouseEvent bridge | Task 5 |
| ViewNodeList → Contract A | Task 5 |
| Caret WCAG ≥24×24 | Task 4 |
| Caret decorativo (aria-hidden) | Task 6a |
| Per-view structural attrs (`data-row-key`/role/aria) + keyboard delegation | Tasks 6a-6d |
| Keyboard 2D (planar) + 3D (drill) | Task 2 (servicio) + Task 5 (drill wiring) + Task 6c (columns) |
| Expand/collapse-all data-gated | Task 7 |
| cmenu trigger unify + standard set | Task 8 |
| Verification matrix (diagonal, ARIA, parity, anti-drift, smoke) | Task 9 |
| Forward-compat seam (hover/swipe/FAB/touch reserved) | Task 1 (`resolveActionIntent` uniones reservadas) |

Sin gaps. DnD + scoped-views = fuera de scope por diseño (spec §05).

**2. Placeholder scan** — sin TBD/TODO. Donde un test referencia un harness existente
(`panelExplorerSelection`, `viewGridSelection`, `cmenuSetAction`), es por reuso explícito del patrón, no
placeholder. El único valor a descubrir en ejecución es el `columnCount` real del grid (Task 6c, punto
de integración nombrado) y el set exacto de cmenu por provider (Task 8, verificación contra código real)
— ambos son acciones definidas, no huecos.

**3. Type consistency** — nombres consistentes entre tasks:
- `RowActionContext` (sin getters de estado) + `RowState` (per-call) + `getRowProps(id, state)` —
  Task 3 ↔ Tasks 6a-6d.
- `KeyboardNavContext` callbacks (`moveFocus`/`focusEdge`/`focusId`/`movePage`/`toggleSelect`/`selectAll`/
  `expand`/`collapse`/`activate(id,e)`/`drill`) — Task 2 ↔ Task 5 (panel los implementa).
- `RowInteractionContract` + `ActionIntent*` + `selectionModifiersFromEvent` — Task 1 ↔ Tasks 5/6.
- `data-row-key` (== id) — Tasks 3/6/9 idénticos.
- El builder NO provee `onclick`/`onauxclick` (views conservan gestos) — Task 3 ↔ Tasks 6a-6d coherente.

Sin inconsistencias detectadas.
