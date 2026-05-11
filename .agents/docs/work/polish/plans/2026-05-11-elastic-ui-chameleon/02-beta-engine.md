---
title: BETA Engine
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - beta
created_by: codex
updated_by: codex
---

# BETA Engine

## Ownership

- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/services/serviceTextMeasure.ts`
- Create: `src/services/serviceNodeRowMeasure.ts`
- Create: `test/unit/services/serviceNodeRowMeasure.test.ts`
- Modify or create focused component tests:
  `test/component/viewTableStress.test.ts`,
  `test/component/viewTableSelection.test.ts`,
  `test/component/viewGridSelection.test.ts`,
  `test/component/viewNodeCards.test.ts`

## Task B1: Add Row Measurement Adapter

Create `src/services/serviceNodeRowMeasure.ts`:

```ts
import type { TextMeasureService, TextMeasureStyle } from './serviceTextMeasure';

export interface NodeRowMeasureInput {
	id: string;
	text: string;
	width: number;
	minHeight: number;
	paddingY: number;
	style: TextMeasureStyle;
	revision: string;
}

export class NodeRowMeasureService {
	private cache = new Map<string, number>();

	constructor(private readonly text: TextMeasureService) {}

	measure(input: NodeRowMeasureInput): number {
		const width = Math.max(1, Math.round(input.width));
		const key = [
			input.revision,
			input.id,
			width,
			input.text,
			input.style.font,
			input.style.lineHeight,
		].join('\u0001');
		const cached = this.cache.get(key);
		if (cached) return cached;
		const measured = this.text.measure(input.text, input.style, width);
		const height = Math.max(input.minHeight, Math.ceil(measured.height + input.paddingY * 2));
		this.cache.set(key, height);
		return height;
	}

	clear(): void {
		this.cache.clear();
		this.text.clear();
	}
}
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeRowMeasure.test.ts --fileParallelism=false
```

Expected: repeated same id/revision/width uses cache; changing width or revision
recomputes; returned height never drops below `minHeight`.

## Task B2: Table Virtualizer Dynamic Heights

Modify `src/components/views/ViewNodeTable.svelte`:

- Add prop `measure?: NodeRowMeasureService`.
- Replace `TABLE_ROW_HEIGHT` as fixed estimate with a derived row-height map.
- Keep absolute positioning and existing `role="grid"` semantics.
- Do not use a real `<table>` element while rows are absolutely positioned; if
  Bits UI/shadcn table wrappers force table semantics, keep current `div` grid
  DOM in Thin/Balanced and gate Thick table styling through classes only.

Core snippet:

```svelte
const measuredRowHeights = $derived.by(() => {
	const out = new Map<string, number>();
	for (const row of tableRows) {
		const label = cellDisplay(row, columns.find((c) => c.id === 'label') ?? columns[0]);
		out.set(
			row.id,
			measure?.measure({
				id: row.id,
				text: label,
				width: outerEl?.clientWidth ?? TABLE_FALLBACK_WIDTH,
				minHeight: TABLE_ROW_HEIGHT,
				paddingY: 6,
				style: {
					font: '14px var(--font-interface)',
					lineHeight: 20,
					whiteSpace: 'normal',
				},
				revision: `${tableRows.length}:${columnTemplate}`,
			}) ?? TABLE_ROW_HEIGHT,
		);
	}
	return out;
});
```

Virtualizer update:

```ts
estimateSize: (index) => measuredRowHeights.get(rows[index]?.id ?? '') ?? TABLE_ROW_HEIGHT,
```

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableStress.test.ts test/component/viewTableSelection.test.ts --fileParallelism=false
obsidian vault=plugin-dev eval code="window.__vaultmanPerfProbe.run('tree-scroll',{steps:12}).then(r=>JSON.stringify(r))"
```

Expected: component tests pass; perf probe returns JSON and no Vaultman error is
reported by `obsidian vault=plugin-dev dev:errors`.

## Task B3: Table Chameleon Classes

Add root classes in `ViewNodeTable.svelte`:

```svelte
<div
	class={[
		'vm-node-table',
		theme.mode === 'thin' && 'obsidian-mimic-metadata-container',
		theme.identity === 'bases' && 'vm-id-bases-table vm-daisy-table',
		theme.mode === 'thick' && 'vm-daisy-card',
	]}
>
```

Keep row classes:

```svelte
class={[
	'vm-node-table-row',
	'nav-file',
	row.cls,
	isSelected && 'is-selected',
	isFocused && 'is-focused',
	isActive && 'is-active-node',
]}
```

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableSelection.test.ts --fileParallelism=false
obsidian vault=plugin-dev eval code="Array.from(activeDocument.querySelectorAll('.vm-node-table-row')).every(el => el.classList.contains('nav-file'))"
```

Expected: tests pass and eval returns `true` when the table is visible.

## Task B4: Grid Chameleon Classes

Modify `src/components/views/ViewNodeGrid.svelte` tile root:

```svelte
class={[
	'vm-node-grid-tile',
	'nav-file',
	hierarchyMode === 'inline' && 'tree-item-self',
	node.cls,
	isSelected && 'is-selected',
	isFocused && 'is-focused',
	isActive && 'is-active-node',
	manualDndEnabled && 'is-manual-dnd',
	dndState.dragging && 'is-dnd-dragging',
	dndState.dropTarget && 'is-dnd-drop-target',
	nodeExpanded && 'is-expanded',
]}
```

Keep `.vm-node-grid-inner` and `.vm-node-grid-tile` stable because existing
tests and CSS target them.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts --fileParallelism=false
```

Expected: existing selection and hover badge behavior remains unchanged and
native mirror classes are present.

## Task B5: Pretext And Fallback Policy

`serviceTextMeasure.ts` already uses `@chenglou/pretext` through `prepare` and
`layout`. BETA must not import Pretext directly into views. Views receive
`TextMeasureService` or `NodeRowMeasureService` props. Tests may inject
`fallbackTextMeasureEngine`.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeRowMeasure.test.ts --fileParallelism=false
rg -n "@chenglou/pretext" src\\components src\\services
```

Expected: Pretext import appears in `src/services/serviceTextMeasure.ts` only.

## Task B6: Svelte 5 Snippet Contract For Reusable Rows

When splitting row/tile markup, use snippets instead of legacy slots:

```svelte
{#snippet nodeLabel(row: ViewRow<TNode>, display: string)}
	<span class="vm-node-table-primary nav-file-title" data-vm-table-primary>
		{display}
	</span>
{/snippet}

{#snippet nodeCell(row: ViewRow<TNode>, column: ViewColumn<TNode>)}
	{@const display = cellDisplay(row, column)}
	<div class="vm-node-table-cell" role="gridcell" data-vm-table-cell={cellDataId(row, column.id)}>
		{#if column.id === 'label'}
			{@render nodeLabel(row, display)}
		{:else}
			{display}
		{/if}
	</div>
{/snippet}
```

Verification:

```bash
pnpm run check
pnpm exec svelte-check --tsconfig ./tsconfig.json
```

Expected: no Svelte snippet typing errors.

## Task B7: Large Vault Scroll Smoke

Use the existing performance probe after build:

```bash
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="window.__vaultmanPerfProbe.run('tree-scroll',{steps:24}).then(r=>JSON.stringify(r))"
obsidian vault=plugin-dev dev:errors
```

Expected: JSON result is returned, scroll does not freeze, and no Vaultman stack
is captured.
