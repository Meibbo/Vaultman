---
title: Filter logic rename
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/index|bases-import-plan]]"
created: 2026-05-05T02:36:37
updated: 2026-05-05T16:11:11
tags:
  - agent/plan
  - bases/import
---

# Filter Logic Rename

## Files

- Modify: `src/types/typeFilter.ts`
- Modify: `src/utils/filter-evaluator.ts`
- Modify: `src/services/serviceFilter.svelte.ts`
- Test: `test/unit/utils/filter-evaluator.test.ts`
- Test: `test/unit/services/serviceFilter.test.ts`

## Steps

- [x] Add failing evaluator tests for `and | or | not` plus legacy normalization.

```ts
it('evaluates and/or/not group logic names', () => {
	const { universe, getMeta, a, c } = fixture();
	expect(evalNode(group([rule({ filterType: 'folder', values: ['Notes'] })], 'and'), universe, getMeta)).toEqual(new Set([a.path, 'Notes/done.md']));
	expect(evalNode(group([rule({ filterType: 'specific_value', property: 'status', values: ['draft'] }), rule({ filterType: 'folder', values: ['Archive'] })], 'or'), universe, getMeta)).toEqual(new Set([a.path, c.path]));
	expect(evalNode(group([rule({ property: 'status', filterType: 'has_property' })], 'not'), universe, getMeta)).toEqual(new Set([c.path]));
});

it('normalizes legacy all/any/none group logic', () => {
	expect(normalizeGroupLogic('all')).toBe('and');
	expect(normalizeGroupLogic('any')).toBe('or');
	expect(normalizeGroupLogic('none')).toBe('not');
});
```

- [x] Run: `pnpm run test:unit -- --run test/unit/utils/filter-evaluator.test.ts`

Expected: fail because `GroupLogic` does not accept `and | or | not` and `normalizeGroupLogic` is missing.

- [x] Update `src/types/typeFilter.ts`.

```ts
export type GroupLogic = 'and' | 'or' | 'not';
export type LegacyGroupLogic = 'all' | 'any' | 'none';
export type AnyGroupLogic = GroupLogic | LegacyGroupLogic;

export function normalizeGroupLogic(logic: AnyGroupLogic): GroupLogic {
	if (logic === 'all') return 'and';
	if (logic === 'any') return 'or';
	if (logic === 'none') return 'not';
	return logic;
}

export interface FilterGroup {
	type: 'group';
	logic: AnyGroupLogic;
	children: FilterNode[];
	id?: string;
	label?: string;
	kind?: string;
	enabled?: boolean;
}
```

- [x] Update `src/utils/filter-evaluator.ts` to switch on `normalizeGroupLogic(group.logic)`.

```ts
switch (normalizeGroupLogic(group.logic)) {
	case 'and':
		// existing intersection
	case 'or':
		// existing union
	case 'not':
		// existing universe minus union
}
```

- [x] Update `src/services/serviceFilter.svelte.ts` defaults and generated groups: root uses `and`, selected files uses `or`, loaded templates are normalized recursively.

- [x] Run: `pnpm run test:unit -- --run test/unit/utils/filter-evaluator.test.ts test/unit/services/serviceFilter.test.ts`

Expected: all targeted tests pass.
