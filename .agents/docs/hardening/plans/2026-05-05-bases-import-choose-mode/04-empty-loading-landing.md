---
title: Empty and loading landing
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/index|bases-import-plan]]"
created: 2026-05-05T02:36:37
updated: 2026-05-05T16:11:11
tags:
  - agent/plan
  - bases/import
---

# Empty And Loading Landing

## Files

- Create: `src/components/views/viewEmptyLanding.svelte`
- Modify: `src/types/typeViews.ts`
- Modify: `src/components/containers/panelExplorer.svelte`
- Test: `test/component/viewEmptyLanding.test.ts`

## Steps

- [x] Write a failing component test.

```ts
it('renders loading and empty explorer states', () => {
	const app = mount(ViewEmptyLanding as unknown as Component<Record<string, unknown>>, {
		target,
		props: { state: { kind: 'loading', title: 'Indexing Bases', detail: 'Scanning notes' }, icon },
	});
	flushSync();
	expect(target.textContent).toContain('Indexing Bases');
	expect(target.textContent).toContain('Scanning notes');
});
```

- [x] Run: `pnpm run test:component -- --run test/component/viewEmptyLanding.test.ts`

Expected: fail because component does not exist.

- [x] Add `ViewEmptyKind` and `ViewEmptyState` expansion in `typeViews.ts`:

```ts
export type ViewEmptyKind = 'loading' | 'empty' | 'search' | 'filters' | 'import';
export interface ViewEmptyState {
	kind?: ViewEmptyKind;
	label: string;
	detail?: string;
	icon?: string;
}
```

- [x] Implement `viewEmptyLanding.svelte` with icon, title, optional detail, and no cards-inside-cards.

- [x] Update `panelExplorer.svelte` to render the landing when the tree has no nodes or flat grid has no files; pass import-specific copy from provider when available.

- [x] Run component test and `pnpm run check`.

Expected: component test passes and Svelte check passes.
