## Task 6c: ViewNodeGrid adopta builder + expone columns

**Files:**
- Modify: `src/components/views/ViewNodeGrid.svelte` (tile root carrying `handleTileClick` 453-469; keydown delegate 508; expose column count)
- Test: `test/component/viewGridActionAdoption.test.ts`

- [x] **Step 1: Write the failing test** — montar `ViewNodeGrid`, role `'gridcell'`: assert `data-row-key`,
  keydown → `onRowKeydown(id, e)`, click → `onRowClick(id, e)`. Reusar helpers de
  `test/component/viewGridSelection.test.ts`.

- [x] **Step 2: Run → FAIL.**

- [x] **Step 3: Adopt** — builder block (role `'gridcell'`). Spread `getRowProps(id, state)` en el tile
  root (donde está el `onclick`→`handleTileClick`, 453-469), conservando los handlers de puntero.
  **Exponer el column count para keyboard 2D**: el grid ya calcula columnas para su layout; exponerlo
  como prop bindable o callback que el panel lee para `KeyboardNavContext.columnsAt` (Task 5 lo
  referencia como `gridColumnCount`). Si el grid usa CSS `grid-template-columns`, derivar el conteo del
  layout resuelto y publicarlo (`export function columnCount(): number` o `bind:`). Grid en folder/inline
  = `planar-drill`; el `drill` ya está cableado en el panel.

- [x] **Step 4: Run** `pnpm vitest run test/component/viewGridActionAdoption.test.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts` → PASS.

Actual verification:
- `pnpm vitest run test/component/viewGridActionAdoption.test.ts` — RED first: missing
  `data-row-key`; `onColumnCountChange` was not called.
- `pnpm vitest run test/component/viewGridActionAdoption.test.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts test/component/viewNodeDelegation.test.ts` — PASS, 4 files / 33 tests.
- `npx @sveltejs/mcp svelte-autofixer src/components/views/ViewNodeGrid.svelte --svelte-version 5` — no issues; pre-existing suggestions only.
- `npx @sveltejs/mcp svelte-autofixer src/components/explorer/ViewHost.svelte --svelte-version 5` — no issues; pre-existing suggestions only.
- `npx @sveltejs/mcp svelte-autofixer src/components/containers/panelExplorer.svelte --svelte-version 5` — no issues; pre-existing suggestions only.
- `pnpm vitest run test/component/views/ViewNodeGrid.panel.vaultman.snapshot.test.ts -u` — PASS, snapshot updated for `data-row-key` and Svelte spread attribute order.
- `pnpm vitest run test/component/viewGridActionAdoption.test.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts test/component/viewNodeDelegation.test.ts test/component/views/ViewNodeGrid.panel.vaultman.snapshot.test.ts test/component/views/ViewNodeGrid.NodeElementMask.test.ts test/component/views/ViewNodeGrid.NativeClassEmission.test.ts test/component/views/ViewNodeGrid.DndStateMods.test.ts test/component/panelExplorerSelection.test.ts` — PASS, 9 files / 84 tests.
- `pnpm run check` — PASS, 0 errors / 0 warnings.
- `pnpm run lint` — PASS, 0 errors / 0 warnings.
- `git diff --check` — PASS, CRLF working-copy warnings only.

Implementation note: Grid keeps root-level click/aux/context/keydown delegation for performance
(`viewNodeDelegation.test.ts`) while using `serviceRowAction` for tile structural props
(`role`, `tabindex`, `aria-selected`, `aria-expanded`, `data-row-key`). `ViewNodeGrid` reports its
resolved column count through `onColumnCountChange`; `panelExplorer` feeds that into
`KeyboardNavContext.columnsAt` so planar grid navigation uses the visible layout instead of a fixed
single column.

- [x] **Step 5: Commit** `refactor(A.R): ViewNodeGrid adopts row-action builder + exposes column count for 2D nav`.

Actual commit: `refactor(A.R): ViewNodeGrid adopts row-action builder`.

---
