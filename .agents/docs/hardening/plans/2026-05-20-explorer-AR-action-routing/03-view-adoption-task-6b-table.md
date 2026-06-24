## Task 6b: ViewNodeTable adopta builder

**Files:**
- Modify: `src/components/views/ViewNodeTable.svelte` (row root carrying `handleRowClick` 439-450; delete `handleTableKeydown` Ctrl+A-only 509)
- Test: `test/component/viewTableActionAdoption.test.ts`

- [x] **Step 1: Write the failing test** — mismo patrón que 6a, montando `ViewNodeTable`, role `'row'`:
  assert `data-row-key` presente, keydown → `onRowKeydown(id, e)`, click sigue llamando `onRowClick(id, e)`.
  (Construir filas vía el shape que `ViewNodeTable` espera; reusar el helper de
  `test/component/viewTableSelection.test.ts`.)

- [x] **Step 2: Run → FAIL** (`pnpm vitest run test/component/viewTableActionAdoption.test.ts`).

- [x] **Step 3: Adopt** — añadir el builder block (role `'row'`). Spread
  `{...rowAction.getRowProps(id, { selected: ..., expandable: false, expanded: false })}` en el row root
  (el elemento que hoy lleva el `onclick` que llama `handleRowClick`, 439-450), conservando `onclick`/
  `onauxclick`. Borrar `handleTableKeydown` (509, Ctrl+A-only) — el keyboard ahora delega vía el
  `onkeydown` del spread → `onRowKeydown` → controller (que ya maneja Ctrl/Cmd+A → `onSelectAll`).
  Tablas son `linear` → `expandable: false`.

- [x] **Step 4: Run** `pnpm vitest run test/component/viewTableActionAdoption.test.ts test/component/viewTableSelection.test.ts` → PASS.

Actual verification:
- `pnpm vitest run test/component/viewTableActionAdoption.test.ts` — RED first, missing `data-row-key`.
- `pnpm vitest run test/component/viewTableActionAdoption.test.ts test/component/viewTableSelection.test.ts test/component/viewNodeDelegation.test.ts test/component/views/ViewNodeTable.panel.vaultman.snapshot.test.ts test/component/views/ViewNodeTable.NodeElementMask.test.ts test/component/views/ViewNodeTable.NativeClassEmission.test.ts test/component/views/ViewNodeTable.DndStateMods.test.ts test/component/viewTableStress.test.ts` — PASS, 8 files / 25 tests.
- `pnpm vitest run test/component/panelExplorerSelection.test.ts test/component/viewNodeDelegation.test.ts` — PASS, 2 files / 50 tests.
- `npx @sveltejs/mcp svelte-autofixer src/components/views/ViewNodeTable.svelte --svelte-version 5` — no issues; pre-existing suggestions only.
- `pnpm run check` — PASS, 0 errors / 0 warnings.
- `pnpm run lint` — PASS, 0 errors / 0 warnings.
- `git diff --check` — PASS, CRLF working-copy warnings only.

Implementation note: Table keeps root-level click/aux/context/keydown delegation for performance
(`viewNodeDelegation.test.ts`) while using `serviceRowAction` for row structural props
(`role`, `tabindex`, `aria-selected`, `data-row-key`).

- [x] **Step 5: Commit** `refactor(A.R): ViewNodeTable adopts row-action builder; drop Ctrl+A-only handler`.

Actual commit: `refactor(A.R): ViewNodeTable adopts row-action builder`.

---
