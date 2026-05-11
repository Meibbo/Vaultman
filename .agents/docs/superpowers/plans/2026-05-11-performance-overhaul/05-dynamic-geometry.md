# Phase 5 - Dynamic Geometry With Pretext

Parent: [[index|Vaultman Explorer Performance Overhaul Implementation Plan]]

## Files

- Create: `src/services/serviceNodeRowMeasure.ts`
- Create: `src/services/serviceNodeRowStyle.ts`
- Create: `test/unit/services/serviceNodeRowMeasure.test.ts`
- Create: `test/unit/services/serviceNodeRowStyle.test.ts`
- Create: `test/component/viewNodeDynamicGeometry.test.ts`
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/styles/data/_table.scss`
- Modify: `src/styles/data/_grid.scss`

## Geometry Contract

- `@chenglou/pretext` stays isolated behind `src/services/serviceTextMeasure.ts`.
- Table/grid views consume `NodeRowMeasureService`, not Pretext directly.
- TanStack Virtual remains the source of `virtualRow.start`; CSS `translate3d` from Phase 4 consumes that start value exactly, including sub-pixel values.
- Height measurement must not read DOM layout during scroll. DOM style reads are allowed only on mount, resize/theme sync, or test-controlled style resolution.
- Row keys must remain ids. Never use `{#key width}` or any width-derived key that remounts row/tile DOM during resizing.

## Tasks

- [x] **Step 1: Add row measurement service tests.**

Create `test/unit/services/serviceNodeRowMeasure.test.ts` with mocked `TextMeasureService`. Cover repeated same `id`, text, width, style, and revision returning cached height; width changes recomputing layout while reusing prepared text; revision changes recomputing; and returned height preserving fractional Pretext output with only `Math.max(minHeight, measured.height + paddingBlock)` clamping.

Run:
`pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeRowMeasure.test.ts --fileParallelism=false`
Expected before implementation: fail because `serviceNodeRowMeasure.ts` does not exist.

- [x] **Step 2: Implement `serviceNodeRowMeasure.ts`.**

Create a small adapter:

```ts
import type { TextMeasureService, TextMeasureStyle } from './serviceTextMeasure';

export interface NodeRowMeasureInput {
	id: string;
	text: string;
	width: number;
	minHeight: number;
	paddingBlock: number;
	style: TextMeasureStyle;
	revision: string;
}

export class NodeRowMeasureService {
	private cache = new Map<string, number>();
	constructor(private readonly text: TextMeasureService) {}
	measure(input: NodeRowMeasureInput): number {
		const width = Math.max(1, Math.round(input.width));
		const key = [input.revision, input.id, width, input.text, input.style.font, input.style.lineHeight, input.style.letterSpacing ?? 0, input.style.whiteSpace ?? 'normal', input.style.wordBreak ?? 'normal'].join('\u0001');
		const cached = this.cache.get(key);
		if (cached !== undefined) return cached;
		const measured = this.text.measure(input.text, input.style, width);
		const height = Math.max(input.minHeight, measured.height + input.paddingBlock);
		this.cache.set(key, height);
		return height;
	}
	clear(): void {
		this.cache.clear();
		this.text.clear();
	}
}
```

- [x] **Step 3: Add theme-sync style resolver tests.**

Create `test/unit/services/serviceNodeRowStyle.test.ts`. Assert that `resolveNodeRowMeasureStyle(root)` maps Obsidian theme variables: `--font-interface` becomes the font family in `TextMeasureStyle.font`; `--nav-item-size` becomes the default line-height budget; computed `.vm-node-table-primary` or `.vm-node-grid-label` font values override fallbacks when rendered elements exist; and `nodeRowMeasureStyleKey(style)` changes when font, line height, letter spacing, white-space, or word-break changes.

- [x] **Step 4: Implement `serviceNodeRowStyle.ts`.**

Mirror the existing `serviceNodeCardStyle.ts` pattern. Export:

```ts
export const DEFAULT_NODE_ROW_MEASURE_STYLE = {
	font: '13px var(--font-interface)',
	lineHeight: 20,
	letterSpacing: 0,
	whiteSpace: 'normal',
	wordBreak: 'normal',
} satisfies TextMeasureStyle;
```

`resolveNodeRowMeasureStyle(root, selector, fallback, options)` should first inspect the target label element, then fall back to root variables. Root fallback mapping must read `getPropertyValue('--font-interface')` and `getPropertyValue('--nav-item-size')`; use the nav item size as the line-height if it parses as px, otherwise keep the fallback line-height.

- [x] **Step 5: Wire table estimate sizes to Pretext measurement.**

In `ViewNodeTable.svelte`, add optional prop `measure?: NodeRowMeasureService`; default it with `new NodeRowMeasureService(createTextMeasureService())`; add `tableMeasureStyle = $state(DEFAULT_NODE_ROW_MEASURE_STYLE)` and `tableLabelWidth = $state(TABLE_FALLBACK_WIDTH)`; derive `measuredTableRows` as `Map<string, number>` using `PerfMeter.time('explorer.table.measureRows', ...)`; and update `estimateSize` in both `createVirtualizer` and `setOptions` to `rows[index] ? measuredTableRows.get(rows[index].id) ?? TABLE_ROW_HEIGHT : TABLE_ROW_HEIGHT`.

The measured text must be the label column display, not the whole row string. The width must be the current label-column content width after padding, not the viewport width.

- [x] **Step 6: Wire grid estimate sizes to Pretext measurement.**

In `ViewNodeGrid.svelte`, add optional prop `measure?: NodeRowMeasureService`; derive a per-tile label width from current tile width minus icon/gap/badge allowance; measure each tile label; compute row height as the max tile measured height plus tile vertical padding; keep inline hierarchy extra panel height additive on top of measured base row height; and wrap the row map in `PerfMeter.time('explorer.grid.measureRows', ...)`.

Update `estimateSize` to consume `gridMeasuredRowHeights.get(rows[index]?.key ?? '') ?? rows[index]?.height ?? gridRowBaseHeight`.

- [x] **Step 7: Add resizer synergy without remounting.**

Create a single `scheduleVirtualizerRemeasure(surface)` helper per component. On column or tile resizer pointer-move: update only width state (`tableLabelWidth`, grid tile width, or existing column/tile width state); do not rebuild rows with width-derived keys; do not wrap the virtualized list in `{#key width}`; call `$rowVirtualizer.measure()` in the next animation frame; emit `PerfMeter.time('explorer.table.resizeRemeasure', ...)` or `PerfMeter.time('explorer.grid.resizeRemeasure', ...)`.

Pretext remeasurement remains memory-only because the row measure cache key includes width. Existing prepared text is reused by `serviceTextMeasure`; only the layout result changes for the new width.

- [x] **Step 8: Keep GPU positioning aligned to sub-pixel heights.**

Do not round measured row heights before giving them to TanStack Virtual. Preserve Pretext fractional `height` values in `estimateSize`. Keep CSS:

```scss
transform: translate3d(0, var(--vm-node-table-y, 0), 0);
transform: translate3d(0, var(--vm-node-grid-y, 0), 0);
```

Set `--vm-node-*-y` from `${virtualRow.start}px` exactly. TanStack Virtual will produce starts from cumulative measured sizes; CSS must consume those starts directly to avoid height/start mismatch jitter.

- [x] **Step 9: Add multiline stress validation.**

Create `test/component/viewNodeDynamicGeometry.test.ts` with 10,000 synthetic rows/tiles containing long multiline labels, including adopted-header-like labels:

```ts
`Adopted Header ${index}: ${'nested inherited context '.repeat(8)}`
```

Assert virtual row count remains bounded by visible window plus overscan; row `style` contains decimal-capable `--vm-node-table-y` / `--vm-node-grid-y` values; resizing the label/tile width remeasures heights without changing row DOM identities; and fast scroll after resize does not move the first visible id backwards or create a blank window.

Run:
`pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeRowMeasure.test.ts test/unit/services/serviceNodeRowStyle.test.ts --fileParallelism=false`
Then:
`pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeDynamicGeometry.test.ts test/component/viewTableStress.test.ts --fileParallelism=false`

- [x] **Step 10: Final phase verification.**

Run:
`npx @sveltejs/mcp svelte-autofixer ./src/components/views/ViewNodeTable.svelte --svelte-version 5`
`npx @sveltejs/mcp svelte-autofixer ./src/components/views/ViewNodeGrid.svelte --svelte-version 5`
`pnpm run check`
`pnpm run build`

Manual smoke target: in a generated 10,000-file vault, resize table columns and grid tiles while multiline adopted-header labels are visible. Definition of done for this phase is variable height rows rendering at 60fps during column resizing with no scroll jump.
