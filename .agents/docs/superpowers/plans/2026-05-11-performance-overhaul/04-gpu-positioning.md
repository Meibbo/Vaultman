# Phase 4 - GPU Positioning

Parent: [[index|Vaultman Explorer Performance Overhaul Implementation Plan]]

## Files

- Modify: `src/styles/data/_table.scss`
- Modify: `src/styles/data/_grid.scss`
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Create: `test/unit/styles/nodeVirtualPositioning.test.ts`

## Hardware Contract

- Keep `.vm-node-table-inner` and `.vm-node-grid-inner` as relative spacer elements whose height equals TanStack Virtual total size.
- Keep each virtual row `position: absolute; top: 0`; the row's visual y-offset must come only from `transform`.
- Keep Svelte writing `--vm-node-table-y` and `--vm-node-grid-y` from `virtualRow.start`; do not write `top: ${virtualRow.start}px`.
- Apply `will-change: transform` only to mounted virtual rows. Overscan bounds the actual layer count; do not apply it to every logical 10,000-node item or to nested cells/tiles.

## Tasks

- [ ] **Step 1: Add SCSS source tests.**

Assert `.vm-node-table-row` and `.vm-node-grid-row` contain `position: absolute`, `top: 0`, `transform: translate3d(0, var(--vm-node-*-y, 0), 0)`, and `will-change: transform`. Assert they do not use `top: var(--vm-node-*-y`.

- [ ] **Step 2: Apply table compositor positioning.**

In `_table.scss`, change the row block to:

```scss
.vm-node-table-row {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	transform: translate3d(0, var(--vm-node-table-y, 0), 0);
	will-change: transform;
}
```

Keep `style:--vm-node-table-y={`${virtualRow.start}px`}` in `ViewNodeTable.svelte`; do not set `top` from JS.

- [ ] **Step 3: Apply grid compositor positioning.**

In `_grid.scss`, change only the transform:

```scss
transform: translate3d(0, var(--vm-node-grid-y, 0), 0);
```

Keep `.vm-node-grid-inner` height as `--vm-node-grid-total-h`, keep each `.vm-node-grid-row` absolute with `top: 0`, and keep row height from `--vm-node-grid-row-h`.

- [ ] **Step 4: Instrument scroll-to-index paths.**

In `scrollTableRowIntoView()` and `scrollGridRowIntoView()`, wrap only the imperative scroll block with `PerfMeter.time('explorer.table.scrollIntoView', ...)` and `PerfMeter.time('explorer.grid.scrollIntoView', ...)`. Add `PerfMeter.mark('perf.phase04.gpu-positioning.ready', 'mark', { surface: 'table' | 'grid' })` once when the component first has `outerEl`.

- [ ] **Step 5: Verify Phase 4.**

Run:
`pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/nodeVirtualPositioning.test.ts --fileParallelism=false`
Run Svelte checks:
`npx @sveltejs/mcp svelte-autofixer ./src/components/views/ViewNodeTable.svelte --svelte-version 5`
`npx @sveltejs/mcp svelte-autofixer ./src/components/views/ViewNodeGrid.svelte --svelte-version 5`
Run final gates:
`pnpm run check`
`pnpm run build`

