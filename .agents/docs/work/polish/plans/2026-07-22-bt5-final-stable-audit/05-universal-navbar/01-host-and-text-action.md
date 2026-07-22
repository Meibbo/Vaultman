---
title: BT5 final stable audit plan — Navbar host and Text action
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Universal Navbar]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, navbar]
---

# One `panelWidget` Navbar host and Text action

## Task 12 — BT5-043 provider-fed universal Navbar host

**Before editing Svelte:** load `svelte-code-writer` and `svelte-core-bestpractices`; run the Svelte analysis tool required by those skills after each edited component.

**Create:**

- `src/types/typeNavbar.ts`
- `src/logic/logicNavbarContributions.ts`
- `src/components/layout/navbarPanelWidget.svelte`
- `test/unit/navbarContributions.test.ts`

**Modify:**

- `src/VaultmanFrame.svelte`
- `src/components/layout/navbarFilters.svelte` (decompose/reuse, then retire as mounted host)
- `src/components/pages/pageFilters.svelte`
- `src/components/pages/pageStatistics.svelte`
- `test/unit/navbarFiltersSource.test.ts`
- `test/unit/statisticsPageSource.test.ts`

### 12.1 Red — provider contribution schema

Define pure ordered contributions:

```ts
export interface NavbarActionContribution {
	id: string;
	icon: string;
	label: string;
	order: number;
	section: 'navigation' | 'provider' | 'view' | 'overflow';
	disabled?: boolean;
	run(event: MouseEvent): void;
}

export interface NavbarModel {
	provider: 'files' | 'props' | 'tags' | 'content' | 'snippets' | 'plugins' | 'statistics';
	actions: NavbarActionContribution[];
	showTabs: boolean;
	showSearch: boolean;
}
```

The registry/model builder must reject duplicate action IDs, sort stably, expose provider-specific contributions, and remain independent from Svelte DOM. Test all seven providers.

### 12.2 Red — exactly one mounted host

Source tests must assert `VaultmanFrame.svelte` mounts one `NavbarPanelWidget`, while `pageFilters.svelte` and `pageStatistics.svelte` mount none. This test must fail against the current two `NavbarFilters` imports.

### 12.3 Green — frame owns the panelWidget, providers feed it

- Mount the Navbar once adjacent to the pages viewport in `VaultmanFrame.svelte`.
- Move page-local action array construction into provider adapters/model builders. Pages keep data rendering, not Navbar ownership.
- Extract reusable menus/search/tabs/view/sort controls from the oversized `navbarFilters.svelte`; do not clone them into the new host.
- Preserve settings and commands through typed callbacks/ports, not module globals.
- Keep “Toolbar” only as legacy/user-facing terminology where migration compatibility requires it; code/domain identity is Navbar `panelWidget`.
- The Index contributes no Navbar tab/menu option because it cannot be a scene.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/navbarContributions.test.ts test/unit/navbarFiltersSource.test.ts test/unit/statisticsPageSource.test.ts
pnpm run check
pnpm run format:check
git diff --check
```

Commit only when the single host renders Files and Statistics: `refactor(navbar): introduce universal panel widget`.

## Task 13 — BT5-044 move Text Has/Hasn't into Navbar

**Modify:**

- `src/components/pages/tabContent.svelte`
- `src/logic/logicNavbarContributions.ts`
- `src/components/pages/pageFilters.svelte` only for callbacks/state ports
- `src/i18n/en.ts`, `src/i18n/es.ts`
- `test/unit/contentSearchScope.test.ts`
- `test/unit/navbarContributions.test.ts`

### 13.1 Red

Assert Content provider action order contains:

```ts
expect(ids).toEqual(expect.arrayContaining(['content-pause', 'content-has-text', 'content-sort']));
expect(ids.indexOf('content-pause')).toBeLessThan(ids.indexOf('content-has-text'));
expect(ids.indexOf('content-has-text')).toBeLessThan(ids.indexOf('content-sort'));
```

The action label/state reflects Has text vs Hasn't text, uses the existing exclusion state, and triggers exactly the same search rerun. `tabContent.svelte` must no longer render the body toggle.

### 13.2 Green

Contribute the action from the Content provider; do not add a Text-specific branch inside the Svelte host. Preserve keyboard/ARIA pressed semantics and persisted query behavior. Ensure the action participates in all three overflow strategies.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/contentSearchScope.test.ts test/unit/navbarContributions.test.ts
pnpm run check
pnpm run format:check
```

- [ ] Runtime: toggle appears between pause/resume and sort; changing it updates results; no duplicate remains in content body.
- [ ] Commit: `fix(content): move exclusion toggle to navbar`.
