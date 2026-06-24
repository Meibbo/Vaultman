---
title: P112 Task 3 View Filters Scope Counters
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

# Task 3: View Filters And Scope Counters

**Files:**
- Modify: `src/VaultmanFrame.svelte`
- Modify: `src/components/pages/pageFilters.svelte`
- Modify: `src/components/pages/tabContent.svelte`
- Test: `test/unit/pageFiltersContentSource.test.ts`
- Test: `test/unit/pageFiltersSource.test.ts`

- [ ] **Step 1: Add RED source guards for derived view filter counts**

In `test/unit/pageFiltersContentSource.test.ts`, add assertions:

```ts
expect(frameSource).toContain('activeFilterViewStates().length');
expect(frameSource).toContain('displayedFilterRuleCount');
expect(frameSource).toContain('displayedFilteredCount');
expect(pageFiltersSource).toContain('contentScopeFilteredCount');
expect(pageFiltersSource).toContain('contentScopeTotalCount');
expect(pageFiltersSource).toContain('contentScopeFilterCount');
```

If the test does not import `VaultmanFrame.svelte?raw`, add:

```ts
import frameSource from '../../src/VaultmanFrame.svelte?raw';
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/pageFiltersContentSource.test.ts --config vitest.unit.config.mts
```

Expected: FAIL.

- [ ] **Step 2: Add frame-level derived counters**

In `src/VaultmanFrame.svelte`, keep `filterRuleCount` as the global `FilterService` count. Add the derived values
after the existing explorer refs so `fileList` is initialized before a Svelte derived reads it:

```ts
let fileList = $state<FilesExplorerPanel | undefined>(undefined);
let queueList: QueueListComponent | undefined;
let propExplorer = $state<PropsExplorerPanel | undefined>(undefined);
let tagsExplorer = $state<TagsExplorerPanel | null>(null);

const activeViewFilterCount = $derived(activeFilterViewStates().length);
const displayedFilterRuleCount = $derived(filterRuleCount + activeViewFilterCount);
const displayedFilteredCount = $derived.by(() => {
	if (filtersActiveTab === 'files' && fileList?.hasViewFilters()) {
		return fileList.getVisibleFileCount();
	}
	return filteredCount;
});
```

Add `getVisibleFileCount()` in Task 3 Step 3 before using this code if TypeScript requires it.

- [ ] **Step 3: Expose Files visible count**

In `src/components/containers/explorerFiles.ts`, add:

```ts
getVisibleFileCount(): number {
	return this._filesForDisplay().length;
}
```

No extra state is needed; this uses the current filtered source plus node type filter.

- [ ] **Step 4: Pass displayed counters into PageFilters and BottomNav**

In `src/VaultmanFrame.svelte`, replace props where UI should explain current user-visible scope:

```svelte
filteredCount={displayedFilteredCount}
filterRuleCount={displayedFilterRuleCount}
contentScopeFilteredCount={plugin.filterService.getFilesIgnoringContentSearch(true).length}
contentScopeTotalCount={plugin.app.vault.getFiles().length}
contentScopeFilterCount={displayedFilterRuleCount}
```

For `BottomNav`, pass:

```svelte
filterRuleCount={displayedFilterRuleCount}
filterResultCount={displayedFilteredCount}
```

Keep `filteredCount` internal for raw `FilterService` updates.

- [ ] **Step 5: Update PageFilters props and content scope hint**

In `src/components/pages/pageFilters.svelte`, add props:

```ts
contentScopeFilteredCount: number;
contentScopeTotalCount: number;
contentScopeFilterCount: number;
```

Change `contentScopeHint` to return one compact string:

```ts
const contentScopeHint = $derived.by(() => {
	const scope = operationScope;
	const selected = getSelectedFiles();
	if (scope === 'selected' || (scope === 'auto' && selected.length > 0)) {
		return translate('content.scope_hint_selected').replace('{count}', String(selected.length));
	}
	return translate('content.scope_hint_filtered')
		.replace('{count}', String(contentScopeFilteredCount))
		.replace('{total}', String(contentScopeTotalCount))
		.replace('{filters}', String(contentScopeFilterCount));
});
```

Add i18n updates in a later label task if the existing string lacks `{total}` or `{filters}`.

- [ ] **Step 6: Make the Content scope hint clickable**

In `src/components/pages/tabContent.svelte`, add prop:

```ts
onOpenFilters?: () => void;
```

Replace the scope hint div with a button:

```svelte
<button
	type="button"
	class="vaultman-content-scope-hint"
	onclick={() => onOpenFilters?.()}
>
	{contentScopeHint}
</button>
```

In `pageFilters.svelte`, pass:

```svelte
{onOpenFilters}
```

- [ ] **Step 7: Run focused GREEN gate**

```powershell
corepack pnpm exec vitest run test/unit/pageFiltersContentSource.test.ts test/unit/pageFiltersSource.test.ts --config vitest.unit.config.mts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/VaultmanFrame.svelte src/components/pages/pageFilters.svelte src/components/pages/tabContent.svelte src/components/containers/explorerFiles.ts test/unit/pageFiltersContentSource.test.ts test/unit/pageFiltersSource.test.ts
git commit -m "fix(filters): count view filters in scope"
```
