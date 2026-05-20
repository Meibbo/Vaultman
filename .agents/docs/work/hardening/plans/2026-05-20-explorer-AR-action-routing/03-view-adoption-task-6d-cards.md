## Task 6d: ViewNodeCards adopta builder

**Files:**
- Modify: `src/components/views/ViewNodeCards.svelte` (card root carrying `handleCardClick` 256-272; keydown 546)
- Test: `test/component/viewCardsActionAdoption.test.ts`

- [ ] **Step 1: Write the failing test** — montar `ViewNodeCards`, role `'gridcell'`: assert
  `data-row-key`, keydown → `onRowKeydown(id, e)`, click → `onRowClick(id, e)`. Reusar
  `test/component/viewNodeCards.test.ts`.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Adopt** — builder block (role `'gridcell'`). Spread `getRowProps(id, { selected: ...,
  expandable: false, expanded: false })` en el card root (donde está el `onclick`→`handleCardClick`,
  256-272), conservando handlers de puntero. Cards = `planar` (`columnsAt` → 1 aceptable; el panel lo
  resuelve por layout si aplica).

- [ ] **Step 4: Run** `pnpm vitest run test/component/viewCardsActionAdoption.test.ts test/component/viewNodeCards.test.ts` → PASS.

- [ ] **Step 5: Commit** `refactor(A.R): ViewNodeCards adopts row-action builder`.

---

## Cierre de Task 6

Tras 6a-6d: `pnpm check` (0 errors) + `pnpm vitest run test/component/` (suite de views verde). Los 5
views ahora emiten el mismo Contract A + attrs estructurales (`data-row-key`/`role`/`aria-*`) + delegan
keyboard al controller. Esto habilita la matriz de [[05-verification]].
