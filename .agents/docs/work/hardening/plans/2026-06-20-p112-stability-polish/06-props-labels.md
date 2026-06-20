---
title: P112 Task 6 Props Labels
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

# Task 6: Rename Prop Count Labels To Props

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Modify: `src/components/layout/navbarFilters.svelte`
- Modify: `src/components/layout/popupSort.svelte`
- Test: `test/unit/propCountLabelSource.test.ts`
- Test: `test/unit/sortUiSource.test.ts`

- [ ] **Step 1: Add RED label expectations**

In `test/unit/propCountLabelSource.test.ts`, change expectations:

```ts
expect(enSource).toContain("'viewmode.pill.prop_count': 'Props'");
expect(esSource).toContain("'viewmode.pill.prop_count': 'Props'");
expect(enSource).toContain("'files.col.props': 'Props'");
expect(esSource).toContain("'files.col.props': 'Props'");
```

Keep expectations proving generic Props/Tags count labels remain generic:

```ts
expect(enSource).toContain("'viewmode.pill.count': 'Count'");
```

In `test/unit/sortUiSource.test.ts`, add:

```ts
expect(navbarSource).toContain("labelKey: 'sort.by.props'");
expect(popupSource).toContain("labelKey: 'sort.by.props'");
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/propCountLabelSource.test.ts test/unit/sortUiSource.test.ts --config vitest.unit.config.mts
```

Expected: FAIL because English still says `Prop Count`, Files columns say `# Props`, and Files sort uses `sort.by.count`.

- [ ] **Step 2: Update Files labels**

In `src/i18n/en.ts`:

```ts
'files.col.props': 'Props',
'viewmode.pill.prop_count': 'Props',
'sort.by.props': 'Props',
```

In `src/i18n/es.ts`:

```ts
'files.col.props': 'Props',
'viewmode.pill.prop_count': 'Props',
'sort.by.props': 'Props',
```

Do not change `viewmode.pill.count` or `sort.by.count`; Props/Tags still use those generic count labels.

- [ ] **Step 3: Use Files-specific sort label**

In `src/components/layout/navbarFilters.svelte`, change the Files sort option for `count`:

```ts
{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.props' },
```

In `src/components/layout/popupSort.svelte`, do the same in `SORT_OPTIONS.files`.

- [ ] **Step 4: Run focused GREEN gate**

```powershell
corepack pnpm exec vitest run test/unit/propCountLabelSource.test.ts test/unit/sortUiSource.test.ts --config vitest.unit.config.mts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/i18n/en.ts src/i18n/es.ts src/components/layout/navbarFilters.svelte src/components/layout/popupSort.svelte test/unit/propCountLabelSource.test.ts test/unit/sortUiSource.test.ts
git commit -m "fix(files): label prop counts as props"
```
