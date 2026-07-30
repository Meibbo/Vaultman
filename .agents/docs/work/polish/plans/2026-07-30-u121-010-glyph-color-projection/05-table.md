---
title: U121-010 plan — Table projection
type: plan
status: active
parent: "[[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/index|U121-010 plan]]"
created: 2026-07-30T00:00:00
updated: 2026-07-30T00:00:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/plan
  - initiative/polish
  - release/1.2.1
  - explorer/files
  - glyph-color
---

# Table projection

### Task 5: Project file glyph color into Table

**Files:**

- Modify: `test/unit/gridViewSource.test.ts`
- Modify: `src/components/layout/viewGrid.ts`
- Modify: `src/components/containers/explorerFiles.ts`

- [ ] **Step 1: Write failing Table wiring guards**

Add one focused source test:

```ts
it('projects file glyph color by global virtual index without changing link state', () => {
	expect(gridViewSource).toContain(
		'getGlyphColor?: (file: TFile, index: number) => string | null',
	);
	expect(gridViewSource).toContain(
		'this._renderRow(this.tbodyEl, row.row, row.index, row.top, layout)',
	);
	expect(gridViewSource).toContain('glyphColor,');
	expect(gridViewSource).toContain(
		'resolvedIcon.color ?? glyphColor ?? undefined',
	);
	expect(gridViewSource).toContain(
		'if (glyphColor) nameEl.style.color = glyphColor',
	);
	for (const className of [
		'tree-item-self',
		'nav-file-title',
		'tappable',
		'is-clickable',
		'is-active',
	]) {
		expect(gridViewSource).toContain(className);
	}
});
```

- [ ] **Step 2: Run RED**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/gridViewSource.test.ts
```

Expected: FAIL on the missing callback/index/color plumbing.

- [ ] **Step 3: Add callback and row plumbing**

Add to `GridViewCallbacks`:

```ts
getGlyphColor?: (file: TFile, index: number) => string | null;
```

Pass `row.index` from `_renderWindow()`:

```ts
this._renderRow(this.tbodyEl, row.row, row.index, row.top, layout);
```

Add `index: number` before `top` in `_renderRow()`, calculate:

```ts
const glyphColor = this.callbacks.getGlyphColor?.(file, index) ?? null;
```

Add `glyphColor: string | null` to `rowSignature()` and include
`glyphColor ?? ''` immediately after the resolved icon color. Pass the value
into `_renderIconCell()` and `_renderNameCell()`.

Use this icon precedence:

```ts
renderIconValue(
	iconEl,
	resolvedIcon.icon,
	resolvedIcon.color ?? glyphColor ?? undefined,
);
```

After active classes are applied to `nameEl`, add:

```ts
if (glyphColor) nameEl.style.color = glyphColor;
```

Do not assign an Iconic color to Table names when glyph color is absent; current
Table behavior has no such assignment.

- [ ] **Step 4: Wire the panel callback**

In the `FilesTableView` callbacks:

```ts
getGlyphColor: (_file: TFile, index: number) =>
	this._explorerGlyphColorFor(false, index),
```

The `file` parameter stays in the callback contract for future file-specific
decoration, even though this patch only needs the global displayed index.

- [ ] **Step 5: Run GREEN**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/gridViewSource.test.ts test/unit/tableVirtualization.test.ts test/unit/glyphColor.test.ts
```

Expected: all selected files PASS.
