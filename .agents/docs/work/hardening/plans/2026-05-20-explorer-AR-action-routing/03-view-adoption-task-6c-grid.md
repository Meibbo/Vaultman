## Task 6c: ViewNodeGrid adopta builder + expone columns

**Files:**
- Modify: `src/components/views/ViewNodeGrid.svelte` (tile root carrying `handleTileClick` 453-469; keydown delegate 508; expose column count)
- Test: `test/component/viewGridActionAdoption.test.ts`

- [ ] **Step 1: Write the failing test** — montar `ViewNodeGrid`, role `'gridcell'`: assert `data-row-key`,
  keydown → `onRowKeydown(id, e)`, click → `onRowClick(id, e)`. Reusar helpers de
  `test/component/viewGridSelection.test.ts`.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Adopt** — builder block (role `'gridcell'`). Spread `getRowProps(id, state)` en el tile
  root (donde está el `onclick`→`handleTileClick`, 453-469), conservando los handlers de puntero.
  **Exponer el column count para keyboard 2D**: el grid ya calcula columnas para su layout; exponerlo
  como prop bindable o callback que el panel lee para `KeyboardNavContext.columnsAt` (Task 5 lo
  referencia como `gridColumnCount`). Si el grid usa CSS `grid-template-columns`, derivar el conteo del
  layout resuelto y publicarlo (`export function columnCount(): number` o `bind:`). Grid en folder/inline
  = `planar-drill`; el `drill` ya está cableado en el panel.

- [ ] **Step 4: Run** `pnpm vitest run test/component/viewGridActionAdoption.test.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts` → PASS.

- [ ] **Step 5: Commit** `refactor(A.R): ViewNodeGrid adopts row-action builder + exposes column count for 2D nav`.

---
