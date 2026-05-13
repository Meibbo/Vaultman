export interface SelectionModifierState {
	additive?: boolean;
	range?: boolean;
}

export type SelectionBoxModifierState = Pick<SelectionModifierState, 'additive'>;

export type SelectionMoveDirection = -1 | 1;

export interface NodeSelectionSnapshot {
	ids: ReadonlySet<string>;
	selected: ReadonlyMap<string, boolean>;
	anchorId: string | null;
	focusedId: string | null;
	hoveredId: string | null;
	activeId: string | null;
}

export interface INodeSelectionService {
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
		modifiers?: SelectionBoxModifierState,
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

export interface NodeSelectionAuthorityProvider {
	readonly selectionService: INodeSelectionService;
}
