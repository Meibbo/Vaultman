---
title: U121-010 plan — Cards projection
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

# Cards projection

### Task 6: Project file glyph color into Cards

**Files:**

- Modify: `test/unit/filesGridAnchorBehavior.test.ts`
- Modify: `test/unit/filesGridViewSource.test.ts`
- Modify: `src/components/layout/viewFilesGrid.ts`
- Modify: `src/components/containers/explorerFiles.ts`

- [ ] **Step 1: Write a failing Cards behavior test**

Import `type FilesGridViewCallbacks`. Change `makeHarness()` to accept:

```ts
overrides: Partial<FilesGridViewCallbacks> = {},
```

and spread `...overrides` after the three required no-op callbacks.

Add:

```ts
it('uses the global card index and glyph color wins the visible name', () => {
	const harness = makeHarness(40, ['name'], {
		getFileIcon: (_file, defaultIcon) => ({
			icon: defaultIcon,
			color: '#abcdef',
		}),
		getGlyphColor: (_file, index) => `glyph-${index}`,
	});
	harness.scrollEl.scrollTop = 20 * 72;
	harness.view.refreshViewport();

	const card = harness.contentEl.children.find(
		(child) => child.dataset.path === 'note-0020.md',
	);
	const name = card?.children.find((child) =>
		child.classes.has('vaultman-files-grid-card-name'),
	);

	expect(name?.style.color).toBe('glyph-20');
});
```

Add a source guard to `filesGridViewSource.test.ts`:

```ts
it('keeps Iconic precedence on card icons and glyph color in signatures', () => {
	expect(filesGridSource).toContain(
		'getGlyphColor?: (file: TFile, index: number) => string | null',
	);
	expect(filesGridSource).toContain('this.renderCard(item.row, item.index, {');
	expect(filesGridSource).toContain('glyphColor ??');
	expect(filesGridSource).toContain(
		'resolvedIcon.color ?? glyphColor ?? undefined',
	);
});
```

- [ ] **Step 2: Run RED**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/filesGridAnchorBehavior.test.ts test/unit/filesGridViewSource.test.ts
```

Expected: type/test failure because Cards lacks `getGlyphColor`, does not pass
`item.index`, and still colors the name from Iconic.

- [ ] **Step 3: Add Cards callback and global index**

Add to `FilesGridViewCallbacks`:

```ts
getGlyphColor?: (file: TFile, index: number) => string | null;
```

Pass the virtual item index:

```ts
this.renderCard(item.row, item.index, {
	top: item.top,
	left: this.gap + item.column * (metrics.cardWidth + this.gap),
	width: metrics.cardWidth,
});
```

Add `index: number` to `renderCard()` and calculate:

```ts
const glyphColor = this.callbacks.getGlyphColor?.(file, index) ?? null;
```

Include `glyphColor ?? ''` after the resolved icon color in the card signature.
Use:

```ts
renderIconValue(
	iconEl,
	resolvedIcon.icon,
	resolvedIcon.color ?? glyphColor ?? undefined,
);
```

For the name:

```ts
const nameColor = glyphColor ?? resolvedIcon?.color;
if (nameColor) name.style.color = nameColor;
```

This preserves existing Iconic name color only when glyph scope does not apply.

- [ ] **Step 4: Wire the panel callback**

In the `FilesGridView` callbacks:

```ts
getGlyphColor: (_file: TFile, index: number) =>
	this._explorerGlyphColorFor(false, index),
```

- [ ] **Step 5: Run GREEN and commit Geometry integration**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/filesGridAnchorBehavior.test.ts test/unit/filesGridViewSource.test.ts test/unit/gridViewSource.test.ts test/unit/glyphColor.test.ts
git add -- src/components/containers/explorerFiles.ts src/components/layout/viewGrid.ts src/components/layout/viewFilesGrid.ts test/unit/gridViewSource.test.ts test/unit/filesGridAnchorBehavior.test.ts test/unit/filesGridViewSource.test.ts
git commit -m "feat(explorer): project file glyph colors to geometry views"
```
