---
title: BETA Table And Grid
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/02-beta-engine|beta-engine]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - beta
created_by: codex
updated_by: codex
---

# BETA Table And Grid

## Task B2: Table Virtualizer Dynamic Heights

Modify `src/components/views/ViewNodeTable.svelte`:

- Add prop `measure?: NodeRowMeasureService`.
- Replace fixed `estimateSize` with row-height lookup.
- Keep absolute positioning and `role="grid"` semantics.
- Keep current `div` grid DOM in Thin/Balanced; gate Thick table styling through classes only if Bits UI/shadcn table wrappers force real table DOM.

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
				style: { font: '14px var(--font-interface)', lineHeight: 20, whiteSpace: 'normal' },
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
```

Expected: table tests pass and wrapped labels no longer clip with measured rows.

## Task B3: Table Chameleon Classes

Add root and row class arrays:

```svelte
class={[
	'vm-node-table',
	theme.mode === 'thin' && 'obsidian-mimic-metadata-container',
	theme.identity === 'bases' && 'vm-id-bases-table vm-daisy-table',
	theme.mode === 'thick' && 'vm-daisy-card',
]}
```

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

Keep `.vm-node-grid-inner` and `.vm-node-grid-tile` stable because existing tests and CSS target them.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts --fileParallelism=false
```

Expected: existing selection and hover badge behavior remains unchanged and native mirror classes are present.
