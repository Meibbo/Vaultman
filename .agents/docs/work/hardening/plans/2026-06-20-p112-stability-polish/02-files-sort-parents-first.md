---
title: P112 Task 2 Files Sort Parents First
type: implementation-plan-task
status: active
lifecycle: active
parent: "[[docs/work/hardening/plans/2026-06-20-p112-stability-polish/index|P112 Stability Polish plan]]"
created: 2026-06-20T02:18:00
updated: 2026-06-20T02:18:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - vaultman/p112
  - vaultman/plan
---

# Task 2: Files Sort Parents First

**Files:**
- Modify: `src/types/typeUI.ts`
- Modify: `src/logic/logicsFiles.ts`
- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/components/layout/navbarFilters.svelte`
- Modify: `src/components/layout/popupSort.svelte`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Test: `test/unit/filesLogic.test.ts`
- Test: `test/unit/explorerFilesSource.test.ts`
- Test: `test/unit/navbarFiltersSource.test.ts`
- Test: `test/unit/sortUiSource.test.ts`

- [ ] **Step 1: Add RED tree projection tests**

In `test/unit/filesLogic.test.ts`, add:

```ts
it('can preserve normal sibling order instead of hoisting folders first', () => {
	const files = [
		makeFile('alpha/zeta.md'),
		makeFile('alpha/beta/deep.md'),
		makeFile('alpha/alpha.md'),
	];
	const logic = new FilesLogic(makeApp({}));
	const tree = logic.buildFileTree(files, [], { parentsFirst: false });
	expect(tree[0].children?.map((node) => node.label)).toEqual(['zeta', 'beta', 'alpha']);
});

it('keeps parents first as the default nested tree behavior', () => {
	const files = [makeFile('alpha/zeta.md'), makeFile('alpha/beta/deep.md')];
	const logic = new FilesLogic(makeApp({}));
	const tree = logic.buildFileTree(files);
	expect(tree[0].children?.map((node) => node.label)).toEqual(['beta', 'zeta']);
});
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/filesLogic.test.ts --config vitest.unit.config.mts
```

Expected: FAIL because `BuildFileTreeOptions` has no `parentsFirst`.

- [ ] **Step 2: Add RED source guards for state transport**

Extend source tests to assert:

```ts
expect(explorerFilesSource).toContain('private parentsFirst = true;');
expect(explorerFilesSource).toContain('parentsFirst: this.parentsFirst');
expect(explorerFilesSource).toContain('parentsFirst = true');
expect(navbarFiltersSource).toContain('parentsFirst: true');
expect(navbarFiltersSource).toContain("translate('sort.parents_first')");
expect(popupSource).toContain('parentsFirst');
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/explorerFilesSource.test.ts test/unit/navbarFiltersSource.test.ts test/unit/sortUiSource.test.ts --config vitest.unit.config.mts
```

Expected: FAIL.

- [ ] **Step 3: Extend sort and tree types**

In `src/types/typeUI.ts`:

```ts
export interface ExplorerSortState {
	sortBy: string;
	direction: ExplorerSortDirection;
	childLevel: boolean;
	nodeTypeFilter: string | null;
	parentsFirst?: boolean;
}
```

In `src/logic/logicsFiles.ts`:

```ts
export interface BuildFileTreeOptions {
	rebaseFolderPaths?: string[];
	parentsFirst?: boolean;
}
```

Inside `buildFileTree`, derive:

```ts
const parentsFirst = options.parentsFirst !== false;
```

Then guard the split:

```ts
if (parentsFirst) {
	const folders = nodes.filter((node) => node.meta?.isFolder);
	const files = nodes.filter((node) => !node.meta?.isFolder);
	nodes.splice(0, nodes.length, ...folders, ...files);
}
```

- [ ] **Step 4: Wire Files explorer sort state**

In `src/components/containers/explorerFiles.ts`, add field:

```ts
private parentsFirst = true;
```

Change `setSortBy` signature:

```ts
setSortBy(
	sortBy: string,
	direction: 'asc' | 'desc',
	_childLevel = false,
	nodeTypeFilter: string | null = null,
	parentsFirst = true,
): void {
```

Include it in the equality check and assignment, pass to `buildFileTree`, and include in `_sortState`:

```ts
parentsFirst: this.parentsFirst,
```

For `clearNodeTypeFilter`, preserve current `parentsFirst`:

```ts
this.setSortBy(this.sortBy, this.sortDir, false, null, this.parentsFirst);
```

- [ ] **Step 5: Wire native sort menu**

In `src/components/layout/navbarFilters.svelte`, set Files default:

```ts
files: {
	sortBy: 'name',
	direction: 'asc',
	childLevel: false,
	nodeTypeFilter: null,
	parentsFirst: true,
},
```

Update `applySortState`, `sameSortState`, and `normalizeSortState` to carry `parentsFirst`. In Files native menu, insert a separator after order options and add:

```ts
if (activeTab === 'files') {
	menu.addSeparator();
	menu.addItem((item) => {
		const parentsFirst = current.parentsFirst !== false;
		item
			.setTitle(translate('sort.parents_first'))
			.setIcon('lucide-folder-tree')
			.setChecked(parentsFirst)
			.onClick(() =>
				handleSortChange({ ...current, parentsFirst: !parentsFirst }),
			);
	});
}
```

Keep the existing node type section behind a following `menu.addSeparator()`.

- [ ] **Step 6: Wire popup sort menu**

In `src/components/layout/popupSort.svelte`, add state:

```ts
let parentsFirst = $state(untrack(() => initialSortState?.parentsFirst !== false));
```

Reset it in the existing `$effect`, include it in `emitSortChange`, and replace Files `toggleDrawer` behavior with:

```ts
if (activeTab === 'files') {
	parentsFirst = !parentsFirst;
	emitSortChange();
	return;
}
```

Use labels `sort.parents_first` and icon `lucide-folder-tree` for the Files vertical button.

- [ ] **Step 7: Add i18n labels**

In `src/i18n/en.ts`:

```ts
'sort.parents_first': 'Parents First',
```

In `src/i18n/es.ts`:

```ts
'sort.parents_first': 'Parents First',
```

Keep English text for the product term unless dev requests Spanish copy.

- [ ] **Step 8: Run focused GREEN gate**

```powershell
corepack pnpm exec vitest run test/unit/filesLogic.test.ts test/unit/explorerFilesSource.test.ts test/unit/navbarFiltersSource.test.ts test/unit/sortUiSource.test.ts --config vitest.unit.config.mts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/types/typeUI.ts src/logic/logicsFiles.ts src/components/containers/explorerFiles.ts src/components/layout/navbarFilters.svelte src/components/layout/popupSort.svelte src/i18n/en.ts src/i18n/es.ts test/unit/filesLogic.test.ts test/unit/explorerFilesSource.test.ts test/unit/navbarFiltersSource.test.ts test/unit/sortUiSource.test.ts
git commit -m "feat(files): add parents first sort toggle"
```
