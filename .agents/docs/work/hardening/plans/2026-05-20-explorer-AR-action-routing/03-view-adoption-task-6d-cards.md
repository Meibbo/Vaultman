## Task 6d: ViewNodeCards adopta builder

**Files:**
- Modify: `src/components/views/ViewNodeCards.svelte` (card root carrying `handleCardClick` 256-272; keydown 546)
- Test: `test/component/viewCardsActionAdoption.test.ts`

- [x] **Step 1: Write the failing test** — montar `ViewNodeCards`, role `'gridcell'`: assert
  `data-row-key`, keydown → `onRowKeydown(id, e)`, click → `onRowClick(id, e)`. Reusar
  `test/component/viewNodeCards.test.ts`.

- [x] **Step 2: Run → FAIL.**

- [x] **Step 3: Adopt** — builder block (role `'gridcell'`). Spread `getRowProps(id, { selected: ...,
  expandable: false, expanded: false })` en el card root (donde está el `onclick`→`handleCardClick`,
  256-272), conservando handlers de puntero. Cards = `planar` (`columnsAt` → 1 aceptable; el panel lo
  resuelve por layout si aplica).

- [x] **Step 4: Run** `pnpm vitest run test/component/viewCardsActionAdoption.test.ts test/component/viewNodeCards.test.ts` → PASS.

Actual verification:
- `pnpm vitest run test/component/viewCardsActionAdoption.test.ts` — RED first: missing
  `data-row-key` for default cards and callback-id row-input cards.
- `pnpm vitest run test/component/viewCardsActionAdoption.test.ts` — PASS, 1 file / 4 tests.
- `npx @sveltejs/mcp svelte-autofixer src/components/views/ViewNodeCards.svelte --svelte-version 5` — no issues; pre-existing suggestions only.
- `pnpm vitest run test/component/views/ViewNodeCards.panel.vaultman.snapshot.test.ts -u` — PASS, snapshot updated for `data-row-key` and Svelte spread attribute order.
- `pnpm vitest run test/component/viewCardsActionAdoption.test.ts test/component/viewNodeCards.test.ts test/component/viewNodeVariableScrollFallback.test.ts test/component/virtualizerItemKeys.test.ts test/component/views/ViewNodeCards.panel.vaultman.snapshot.test.ts test/component/views/ViewNodeCards.NodeElementMask.test.ts test/component/views/ViewNodeCards.NativeClassEmission.test.ts test/component/views/ViewNodeCards.DndStateMods.test.ts test/component/panelExplorerSelection.test.ts` — PASS, 9 files / 70 tests.
- `pnpm run check` — PASS, 0 errors / 0 warnings.
- `pnpm run lint` — PASS, 0 errors / 0 warnings.
- `git diff --check` — PASS, CRLF working-copy warnings only.

Implementation note: Cards use `rowInputCallbackId(input)` as the row-action id, matching the A.R seam
(`id === ExplorerRowInput.callbackId`). Existing pointer gestures remain on `onclick`/`onauxclick`;
`serviceRowAction` now owns `role`, `tabindex`, `aria-selected`, `data-row-key`, context menu, and
keyboard delegation.

- [x] **Step 5: Commit** `refactor(A.R): ViewNodeCards adopts row-action builder`.

Actual commit: `refactor(A.R): ViewNodeCards adopts row-action builder`.

---

## Cierre de Task 6

Tras 6a-6d: los 5 views emiten el mismo Contract A + attrs estructurales
(`data-row-key`/`role`/`aria-*`) + delegan keyboard al controller. Esto desbloquea
[[04-expand-and-cmenu]] y, después, la matriz de [[05-verification]].
