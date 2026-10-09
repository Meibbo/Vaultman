import type { IndexGroup } from './logicIndexGroups';

export interface IndexJumpCursor {
	readonly key: string;
	readonly memberIds: readonly string[];
	readonly targetId: string;
}

function areMemberIdsEqual(
	a: readonly string[],
	b: readonly string[],
): boolean {
	if (a === b) return true;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

/**
 * Pure helper cycling through matching group member IDs.
 *
 * Rules:
 * - Empty members => null
 * - Different key or changed members/order => first member
 * - Same key and members => next after previous.targetId, wrapping to first
 */
export function nextIndexJump(
	group: Pick<IndexGroup, 'key' | 'memberIds'>,
	previous: IndexJumpCursor | null,
): IndexJumpCursor | null {
	const { key, memberIds } = group;
	if (!memberIds || memberIds.length === 0) {
		return null;
	}

	if (
		previous === null ||
		previous.key !== key ||
		!areMemberIdsEqual(previous.memberIds, memberIds)
	) {
		return {
			key,
			memberIds,
			targetId: memberIds[0],
		};
	}

	const currentIndex = memberIds.indexOf(previous.targetId);
	if (currentIndex === -1) {
		return {
			key,
			memberIds,
			targetId: memberIds[0],
		};
	}

	const nextIndex = (currentIndex + 1) % memberIds.length;
	return {
		key,
		memberIds,
		targetId: memberIds[nextIndex],
	};
}
