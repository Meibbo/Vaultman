## Task 6b: ViewNodeTable adopta builder

**Files:**
- Modify: `src/components/views/ViewNodeTable.svelte` (row root carrying `handleRowClick` 439-450; delete `handleTableKeydown` Ctrl+A-only 509)
- Test: `test/component/viewTableActionAdoption.test.ts`

- [ ] **Step 1: Write the failing test** — mismo patrón que 6a, montando `ViewNodeTable`, role `'row'`:
  assert `data-row-key` presente, keydown → `onRowKeydown(id, e)`, click sigue llamando `onRowClick(id, e)`.
  (Construir filas vía el shape que `ViewNodeTable` espera; reusar el helper de
  `test/component/viewTableSelection.test.ts`.)

- [ ] **Step 2: Run → FAIL** (`pnpm vitest run test/component/viewTableActionAdoption.test.ts`).

- [ ] **Step 3: Adopt** — añadir el builder block (role `'row'`). Spread
  `{...rowAction.getRowProps(id, { selected: ..., expandable: false, expanded: false })}` en el row root
  (el elemento que hoy lleva el `onclick` que llama `handleRowClick`, 439-450), conservando `onclick`/
  `onauxclick`. Borrar `handleTableKeydown` (509, Ctrl+A-only) — el keyboard ahora delega vía el
  `onkeydown` del spread → `onRowKeydown` → controller (que ya maneja Ctrl/Cmd+A → `onSelectAll`).
  Tablas son `linear` → `expandable: false`.

- [ ] **Step 4: Run** `pnpm vitest run test/component/viewTableActionAdoption.test.ts test/component/viewTableSelection.test.ts` → PASS.

- [ ] **Step 5: Commit** `refactor(A.R): ViewNodeTable adopts row-action builder; drop Ctrl+A-only handler`.

---
