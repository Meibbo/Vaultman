---
title: UI integration
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/index|bases-import-plan]]"
created: 2026-05-05T02:36:37
updated: 2026-05-05T16:11:11
tags:
  - agent/plan
  - bases/import
---

# UI Integration

## Files

- Modify: `src/components/explorers/explorerActiveFilters.svelte`
- Modify: `src/components/pages/pageFilters.svelte`
- Modify: `src/components/layout/navbarTabs.svelte`
- Modify: `src/components/frame/frameVaultman.svelte`
- Modify: `src/components/frame/framePages.ts`
- Test: focused component test under `test/component/`

## Steps

- [x] Add failing component coverage for active filters toolbar labels/icons and import flyout visibility.

```ts
expect(target.querySelectorAll('.vm-squircle')).toHaveLength(4);
target.querySelector<HTMLButtonElement>('[aria-label="Import/export"]')?.click();
flushSync();
expect(target.textContent).toContain('Import');
expect(target.textContent).toContain('Export');
```

- [x] Run the focused component test.

Expected: fail because toolbar still has five buttons and no flyout.

- [x] Update `explorerActiveFilters.svelte`: four squircles, import/export flyout state, disabled export, templates accent first, clear last.

- [x] Add `filtersBaseChooseMode` bindable state to `pageFilters.svelte`. In choose mode, force `filtersActiveTab = 'files'`, render disabled/faint tabs, keep `NavbarExplorer`, and render files body with `explorerBasesImport`.

- [x] Add props to `navbarTabs.svelte` for disabled/faint tab ids. Disabled tabs keep visual orientation but do not switch active tab.

- [x] Update `frameVaultman.svelte` and `framePages.ts` so filters FAB becomes `lucide-x` and exits choose mode while mode is active.

- [x] On compatible target selection, call `previewBasesImport`, then `plugin.filterService.setFilter(preview.filter)`, refresh active filters, store/report preview on an implementation-local state, and exit choose mode.

- [x] Run: `npx @sveltejs/mcp svelte-autofixer ./src/components/explorers/explorerActiveFilters.svelte --svelte-version 5`, plus the same command for touched Svelte files.

- [x] Run: `pnpm run test:component -- --run test/component/viewEmptyLanding.test.ts test/component/viewList.test.ts` and `pnpm run check`.

Expected: targeted component tests and Svelte check pass.
