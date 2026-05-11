export interface SelectionGestureInput {
	orderedIds: readonly string[];
	selectedIds: ReadonlySet<string>;
	anchorId?: string | null;
	focusedId?: string | null;
	targetId: string;
	additive?: boolean;
	range?: boolean;
}

export interface KeyboardMoveInput {
	orderedIds: readonly string[];
	selectedIds: ReadonlySet<string>;
	anchorId?: string | null;
	focusedId?: string | null;
	direction: -1 | 1;
	additive?: boolean;
	range?: boolean;
}

export interface SelectionGestureResult {
	ids: Set<string>;
	anchorId: string | null;
	focusedId: string | null;
}

export interface BoxSelectionInput {
	orderedIds: readonly string[];
	selectedIds: ReadonlySet<string>;
	targetIds: readonly string[];
	additive?: boolean;
}

export type DiffKeyboardAction =
	| 'diff.prev-change'
	| 'diff.next-change'
	| 'diff.prev-file'
	| 'diff.next-file';

export interface DiffKeyboardShortcutInput {
	key: string;
	altKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
}

export function applyPointerSelection(input: SelectionGestureInput): SelectionGestureResult {
	const anchorId = resolveKnownId(input.orderedIds, input.anchorId) ?? input.targetId;
	const additiveRangeAnchorId =
		resolveKnownId(input.orderedIds, input.focusedId) ?? anchorId ?? input.targetId;

	if (input.range) {
		const rangeIds = idsInRange(
			input.orderedIds,
			input.additive ? additiveRangeAnchorId : anchorId,
			input.targetId,
		);
		if (input.additive) {
			return {
				ids: unionSets(input.selectedIds, rangeIds),
				anchorId,
				focusedId: input.targetId,
			};
		}
		return {
			ids: rangeIds,
			anchorId,
			focusedId: input.targetId,
		};
	}

	if (input.additive) {
		const ids = new Set(input.selectedIds);
		if (ids.has(input.targetId)) ids.delete(input.targetId);
		else ids.add(input.targetId);
		return {
			ids,
			anchorId: input.targetId,
			focusedId: input.targetId,
		};
	}

	return {
		ids: new Set([input.targetId]),
		anchorId: input.targetId,
		focusedId: input.targetId,
	};
}

export function applyKeyboardMove(input: KeyboardMoveInput): SelectionGestureResult {
	const currentIndex = input.focusedId ? input.orderedIds.indexOf(input.focusedId) : -1;
	const fallbackIndex = input.direction > 0 ? 0 : input.orderedIds.length - 1;
	const nextIndex = clamp(
		currentIndex === -1 ? fallbackIndex : currentIndex + input.direction,
		0,
		Math.max(input.orderedIds.length - 1, 0),
	);
	const focusedId = input.orderedIds[nextIndex] ?? null;
	if (!focusedId)
		return { ids: new Set(input.selectedIds), anchorId: input.anchorId ?? null, focusedId: null };

	const anchorId =
		input.anchorId && input.orderedIds.includes(input.anchorId) ? input.anchorId : focusedId;
	if (input.range) {
		const rangeIds = idsInRange(input.orderedIds, anchorId, focusedId);
		if (input.additive) {
			return {
				ids: unionSets(input.selectedIds, rangeIds),
				anchorId,
				focusedId,
			};
		}
		return {
			ids: rangeIds,
			anchorId,
			focusedId,
		};
	}

	return {
		ids: new Set([focusedId]),
		anchorId: focusedId,
		focusedId,
	};
}

export function applyBoxSelection(input: BoxSelectionInput): SelectionGestureResult {
	const targetSet = new Set(input.targetIds);
	const orderedTargets = input.orderedIds.filter((id) => targetSet.has(id));
	const ids = input.additive ? new Set(input.selectedIds) : new Set<string>();
	for (const id of orderedTargets) ids.add(id);
	const focusedId = orderedTargets.at(-1) ?? null;
	return {
		ids,
		anchorId: focusedId,
		focusedId,
	};
}

export function resolveDiffKeyboardAction(
	input: DiffKeyboardShortcutInput,
): DiffKeyboardAction | null {
	if (!input.altKey || input.shiftKey) return null;
	if (input.key !== '[' && input.key !== ']') return null;
	const fileScope = input.ctrlKey === true || input.metaKey === true;
	if (input.key === '[') return fileScope ? 'diff.prev-file' : 'diff.prev-change';
	return fileScope ? 'diff.next-file' : 'diff.next-change';
}

function idsInRange(orderedIds: readonly string[], a: string, b: string): Set<string> {
	const aIndex = orderedIds.indexOf(a);
	const bIndex = orderedIds.indexOf(b);
	if (aIndex === -1 || bIndex === -1) return new Set([b]);
	const start = Math.min(aIndex, bIndex);
	const end = Math.max(aIndex, bIndex);
	return new Set(orderedIds.slice(start, end + 1));
}

function resolveKnownId(orderedIds: readonly string[], id: string | null | undefined): string | null {
	return id && orderedIds.includes(id) ? id : null;
}

function unionSets(left: ReadonlySet<string>, right: ReadonlySet<string>): Set<string> {
	const out = new Set(left);
	for (const id of right) out.add(id);
	return out;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
