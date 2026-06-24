---
title: P112 Task 4 Content Auto Reveal
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

# Task 4: Content Auto-Reveal Current File

**Files:**
- Modify: `src/components/pages/pageFilters.svelte`
- Modify: `src/components/pages/tabContent.svelte`
- Test: `test/unit/pageFiltersSource.test.ts`
- Test: `test/unit/tabContentSource.test.ts`

- [ ] **Step 1: Add RED source guards**

In `test/unit/pageFiltersSource.test.ts`, assert:

```ts
expect(pageFiltersSource).toContain('revealActiveContentFile');
expect(pageFiltersSource).toContain("id: 'content-reveal'");
expect(pageFiltersSource).toContain("icon: 'lucide-gallery-vertical'");
```

In `test/unit/tabContentSource.test.ts`, assert:

```ts
expect(tabContentSource).toContain('activeContentRevealPath');
expect(tabContentSource).toContain('bind:this={contentResultsEl}');
expect(tabContentSource).toContain('scrollIntoView({ block:');
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/pageFiltersSource.test.ts test/unit/tabContentSource.test.ts --config vitest.unit.config.mts
```

Expected: FAIL.

- [ ] **Step 2: Add reveal state and action in PageFilters**

In `src/components/pages/pageFilters.svelte`, add state:

```ts
let activeContentRevealPath = $state<string | null>(null);
```

Add function:

```ts
function revealActiveContentFile() {
	const file = plugin.app.workspace.getActiveFile();
	if (!file) {
		new Notice(translate('content.reveal_no_active_file'));
		return;
	}
	const paths = new Set(sortedContentFiles.map((entry) => entry.file.path));
	if (!paths.has(file.path)) {
		new Notice(translate('content.reveal_not_in_results'));
		return;
	}
	activeContentRevealPath = file.path;
	contentPreviewOpen = true;
	collapsedContentFilePaths = collapsedContentFilePaths.filter((path) => path !== file.path);
}
```

- [ ] **Step 3: Add Content header button**

In `contentHeaderActions`, insert before expand:

```ts
{
	id: 'content-reveal',
	label: translate('filter.auto_reveal'),
	icon: 'lucide-gallery-vertical',
	disabled: sortedContentFiles.length === 0,
	onClick: () => revealActiveContentFile(),
},
```

Use the existing `filter.auto_reveal` copy for parity with Files.

- [ ] **Step 4: Add reveal seam in TabContent**

In `src/components/pages/tabContent.svelte`, add prop:

```ts
activeContentRevealPath: string | null;
```

Add state and effect:

```ts
let contentResultsEl = $state<HTMLElement | null>(null);

$effect(() => {
	const path = activeContentRevealPath;
	if (!path || !contentResultsEl) return;
	const row = contentResultsEl.querySelector<HTMLElement>(`[data-vm-content-path="${CSS.escape(path)}"]`);
	row?.scrollIntoView({ block: 'center' });
	row?.focus();
});
```

Add `bind:this={contentResultsEl}` to the `.search-results-children` container and add row attrs:

```svelte
data-vm-content-path={fileResult.file.path}
tabindex="0"
class:is-active={activeContentRevealPath === fileResult.file.path}
```

- [ ] **Step 5: Pass reveal path**

In `pageFilters.svelte`, pass:

```svelte
{activeContentRevealPath}
```

- [ ] **Step 6: Add i18n notices**

In `src/i18n/en.ts`:

```ts
'content.reveal_no_active_file': 'No active Markdown file',
'content.reveal_not_in_results': 'Active file is outside current Content results',
```

In `src/i18n/es.ts`:

```ts
'content.reveal_no_active_file': 'No hay un archivo Markdown activo',
'content.reveal_not_in_results': 'El archivo activo esta fuera de los resultados de Content',
```

- [ ] **Step 7: Run focused GREEN gate**

```powershell
corepack pnpm exec vitest run test/unit/pageFiltersSource.test.ts test/unit/tabContentSource.test.ts --config vitest.unit.config.mts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/components/pages/pageFilters.svelte src/components/pages/tabContent.svelte src/i18n/en.ts src/i18n/es.ts test/unit/pageFiltersSource.test.ts test/unit/tabContentSource.test.ts
git commit -m "feat(content): reveal current file in results"
```
