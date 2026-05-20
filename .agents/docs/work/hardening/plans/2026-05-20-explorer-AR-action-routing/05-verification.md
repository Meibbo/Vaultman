---
title: A.R Plan — Task 9 (verification matrix + smoke) + plan self-review
type: plan-shard
status: draft
parent: "[[index|A.R plan]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T00:00:00
---

# Task 9 — Verification matrix + live smoke

Implementa la matriz de [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/04-verification-matrix|spec §verification]].

**Files:**
- Create: `test/component/keyboardNavParity.test.ts` (5 views × topology), `test/component/selectionContractParity.test.ts` (ya en Task 5), `test/component/structuralAttrs.test.ts`
- Modify: `.agents/docs/current/status.md`, `.agents/docs/current/handoff.md`

- [ ] **Step 1: Consolidated keyboard-nav parity (5 views)**

```ts
// test/component/keyboardNavParity.test.ts
// Para cada view (tree/list/table/grid/cards): montar con onRowKeydown spy, enfocar una fila,
// dispatch ArrowDown/ArrowUp/Home/End/Enter/Space → assert onRowKeydown recibió (id, KeyboardEvent)
// con la tecla correcta. La SEMÁNTICA de nav está testeada a nivel de servicio (Task 2); aquí se
// verifica que los 5 views DELEGAN idéntico (mismo contrato), no que reimplementan.
```

- [ ] **Step 2: Structural anti-drift asserts (5 views)**

```ts
// test/component/structuralAttrs.test.ts
// Para cada view: cada fila renderizada expone data-row-key estable (== id), role correcto
// (treeitem/row/gridcell), aria-selected reflejando selectedIds, aria-expanded solo en filas
// expandibles. Assert ATRIBUTOS, no CSS classes (eso es lo que frena el drift de agentes).
```

- [ ] **Step 3: Run the full Tier-1 + Tier-2 suite**

Run: `pnpm vitest run test/unit/services/actionRouting.intent.test.ts test/unit/services/keyboardNav.test.ts test/unit/services/rowAction.test.ts`
Run: `pnpm vitest run test/component/viewTreeCaret.test.ts test/component/selectionContractParity.test.ts test/component/keyboardNavParity.test.ts test/component/structuralAttrs.test.ts test/component/cmenuTriggerParity.test.ts test/component/expandAllParity.test.ts`
Run los `*ActionAdoption.test.ts` (6a-6d).
Expected: all PASS.

- [ ] **Step 4: Full gate**

Run: `pnpm check` → 0 errors / 0 warnings.
Run: `pnpm verify` → lint + check + build + unit + component. (Si falla por los archivos flaky/timing
ya aceptados por el equipo — `viewTableStress`, `pageFiltersRenameHandoff`, `vmDialogPortal`,
`explorerNotebookNavigatorComparison` — re-correr aislados y aceptar como excepción documentada,
NO como fallo de A.R.)

- [ ] **Step 5: Live `plugin-dev` smoke (diagonal 5 views × 4 provider tabs)**

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

- [ ] **Step 6: Docs update + commit**

Actualizar `status.md` + `handoff.md`: A.R implementado + verificado; next = siguiente sub-system del
umbrella o renumber. NO commitear los ~10 M files del usuario.

```bash
git add test/component/keyboardNavParity.test.ts test/component/structuralAttrs.test.ts \
  .agents/docs/current/status.md .agents/docs/current/handoff.md
git commit -m "test(A.R): action-routing verification matrix + live smoke green"
```

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
