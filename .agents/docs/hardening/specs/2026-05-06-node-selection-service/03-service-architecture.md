---
title: Service architecture
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/spec
  - architecture
  - explorer/selection
---

# Service Architecture

## Module

Create a dedicated selection module.

Preferred files:

- `src/types/typeSelection.ts`
- `src/services/serviceSelection.svelte.ts`
- `test/unit/services/serviceSelection.test.ts`

The service should use Svelte 5 reactive classes/collections because selection
state is user-interface state and must update Svelte views directly.

## Interface

The interface should hide anchor/focus bookkeeping and expose user intent.

Proposed public types:

```ts
export type SelectionModifierState = {
	additive?: boolean;
	range?: boolean;
};

export type SelectionMoveDirection = -1 | 1;

export interface NodeSelectionSnapshot {
	ids: ReadonlySet<string>;
	anchorId: string | null;
	focusedId: string | null;
	hoveredId: string | null;
	activeId: string | null;
}

export interface NodeSelectionService {
	snapshot(explorerId: string): NodeSelectionSnapshot;
	selectPointer(
		explorerId: string,
		orderedIds: readonly string[],
		targetId: string,
		modifiers?: SelectionModifierState,
	): NodeSelectionSnapshot;
	selectBox(
		explorerId: string,
		orderedIds: readonly string[],
		targetIds: readonly string[],
		modifiers?: Pick<SelectionModifierState, 'additive'>,
	): NodeSelectionSnapshot;
	moveFocus(
		explorerId: string,
		orderedIds: readonly string[],
		direction: SelectionMoveDirection,
		modifiers?: SelectionModifierState,
	): NodeSelectionSnapshot;
	toggleFocused(
		explorerId: string,
		orderedIds: readonly string[],
		modifiers?: SelectionModifierState,
	): NodeSelectionSnapshot;
	setFocused(explorerId: string, id: string | null): NodeSelectionSnapshot;
	setHovered(explorerId: string, id: string | null): NodeSelectionSnapshot;
	clear(explorerId: string): NodeSelectionSnapshot;
	prune(explorerId: string, orderedIds: readonly string[]): NodeSelectionSnapshot;
}
```

The final implementation can use a class instead of an interface export if that
better matches the service style. The important contract is that callers no
longer mutate selected ids, anchor ids, or focused ids independently.

## State

Per explorer id:

- `selectedIds: SvelteSet<string>`;
- `anchorId: string | null`;
- `focusedId: string | null`;
- `hoveredId: string | null`.

`activeId` is derived:

- prefer `focusedId` when present;
- otherwise use `hoveredId`;
- otherwise `null`.

The service should return immutable snapshots to callers. Internally it can use
`SvelteMap` and `SvelteSet` for reactivity.

## Relationship To Existing Modules

`logicKeyboard.ts` can either:

- remain as a pure helper used by `serviceSelection.svelte.ts`; or
- be renamed later to `logicSelection.ts` if the name becomes misleading.

Do not delete it in the first slice unless tests prove the service fully covers
its public behavior.

`serviceViews.svelte.ts` should not remain the owner of detailed selection
semantics in this slice. It can keep its existing simple selection mirror while
the new service lands. Once tree and grid consume the new selection service,
`ViewService` can either delegate to `NodeSelectionService` or expose snapshots
from it in a later cleanup.

`panelExplorer.svelte` is the first adapter site. It should stop owning
`selectedNodeIds`, `selectionAnchorId`, and `focusedNodeId` as primary state.
It should read snapshots from the selection service and pass them to views.

## Deepening Rationale

The current module split fails the deletion test for `logicKeyboard.ts` as the
primary selection module. Deleting it would not eliminate complexity; it would
reappear immediately in `panelExplorer.svelte` and `viewGrid.svelte`, because
callers still own the behavior. A service with command methods concentrates
selection behavior behind a smaller interface and gives tests one stable public
surface.
