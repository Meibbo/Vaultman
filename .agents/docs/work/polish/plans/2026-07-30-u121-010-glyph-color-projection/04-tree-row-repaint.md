---
title: U121-010 plan — Tree row repaint
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

# Tree row repaint

### Task 4: Repaint Tree names when glyph color changes

**Files:**

- Modify: `test/unit/viewTreeBehavior.test.ts`
- Modify: `src/components/layout/viewTree.ts`

- [ ] **Step 1: Write the failing recycled-row test**

Extend `TinyElement` with no new API; its current style record already captures
direct `style.color` assignments. Add:

```ts
it('repaints a recycled row when only labelColor changes', async () => {
	const { UnifiedTreeView } =
		await import('../../src/components/layout/viewTree');
	const container = new TinyElement('div');
	const view = new UnifiedTreeView(
		container as unknown as HTMLElement,
	);
	const options = {
		expandedIds: new Set<string>(),
		onToggle: () => {},
		onRowClick: () => {},
		onContextMenu: () => {},
	};

	view.render({
		...options,
		nodes: [{
			id: 'Alpha.md',
			label: 'Alpha',
			depth: 0,
			meta: {},
			labelColor: '#111111',
		}],
	});
	const firstLabel = container.querySelector(
		'.vaultman-tree-label',
	) as unknown as TinyElement | null;

	view.render({
		...options,
		nodes: [{
			id: 'Alpha.md',
			label: 'Alpha',
			depth: 0,
			meta: {},
			labelColor: '#222222',
		}],
	});
	const secondLabel = container.querySelector(
		'.vaultman-tree-label',
	) as unknown as TinyElement | null;

	expect(firstLabel?.style.color).toBe('#111111');
	expect(secondLabel?.style.color).toBe('#222222');
	expect(secondLabel).not.toBe(firstLabel);
});
```

- [ ] **Step 2: Run RED**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/viewTreeBehavior.test.ts
```

Expected: FAIL because `rowSignature()` omits `labelColor` and returns the old
label node unchanged.

- [ ] **Step 3: Add `node.labelColor ?? ''` immediately after icon color**

```ts
node.icon ?? '',
node.iconColor ?? '',
node.labelColor ?? '',
node.typeText ?? '',
```

- [ ] **Step 4: Run GREEN and commit Tree integration**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/viewTreeBehavior.test.ts test/unit/viewTreeSource.test.ts test/unit/explorerGlyphProjection.test.ts
git add -- src/components/containers/explorerFiles.ts src/components/layout/viewTree.ts test/unit/explorerGlyphProjection.test.ts test/unit/viewTreeBehavior.test.ts
git commit -m "fix(explorer): preserve Tree glyph colors"
```
