import { describe, expect, it } from 'vitest';

import {
	nextIndexJump,
	type IndexJumpCursor,
} from '../../src/logic/logicIndexJump';
import type { IndexGroup } from '../../src/logic/logicIndexGroups';

describe('nextIndexJump pure helper API', () => {
	it('returns null when group has empty memberIds', () => {
		const group: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: [],
		};
		expect(nextIndexJump(group, null)).toBeNull();
	});

	it('returns first member when previous cursor is null', () => {
		const group: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-1', 'node-2', 'node-3'],
		};
		const cursor = nextIndexJump(group, null);
		expect(cursor).toEqual({
			key: 'A',
			memberIds: ['node-1', 'node-2', 'node-3'],
			targetId: 'node-1',
		});
	});

	it('cycles to next member in encounter order when repeated on same group', () => {
		const group: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-1', 'node-2', 'node-3'],
		};
		const first = nextIndexJump(group, null);
		expect(first?.targetId).toBe('node-1');

		const second = nextIndexJump(group, first);
		expect(second?.targetId).toBe('node-2');

		const third = nextIndexJump(group, second);
		expect(third?.targetId).toBe('node-3');
	});

	it('wraps around to first member after reaching the end of the group', () => {
		const group: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-1', 'node-2'],
		};
		const cursor1 = nextIndexJump(group, null);
		const cursor2 = nextIndexJump(group, cursor1);
		const cursor3 = nextIndexJump(group, cursor2);

		expect(cursor1?.targetId).toBe('node-1');
		expect(cursor2?.targetId).toBe('node-2');
		expect(cursor3?.targetId).toBe('node-1');
	});

	it('resets to first member when switching to a different group key', () => {
		const groupA: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-a1', 'node-a2'],
		};
		const groupB: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'B',
			memberIds: ['node-b1', 'node-b2'],
		};

		const cursorA = nextIndexJump(groupA, null);
		expect(cursorA?.targetId).toBe('node-a1');

		const cursorB = nextIndexJump(groupB, cursorA);
		expect(cursorB?.targetId).toBe('node-b1');
		expect(cursorB?.key).toBe('B');
	});

	it('resets to first member when member order changes within the same key', () => {
		const groupV1: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-1', 'node-2', 'node-3'],
		};
		const cursor1 = nextIndexJump(groupV1, null);
		expect(cursor1?.targetId).toBe('node-1');

		const groupReordered: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-2', 'node-1', 'node-3'],
		};
		const cursorResetOrder = nextIndexJump(groupReordered, cursor1);
		expect(cursorResetOrder?.targetId).toBe('node-2');
	});

	it('resets to first member when member membership changes within the same key', () => {
		const groupV1: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-1', 'node-2', 'node-3'],
		};
		const cursor1 = nextIndexJump(groupV1, null);
		expect(cursor1?.targetId).toBe('node-1');

		const groupFiltered: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-2', 'node-3'],
		};
		const cursorResetMembers = nextIndexJump(groupFiltered, cursor1);
		expect(cursorResetMembers?.targetId).toBe('node-2');
	});

	it('resets to first member if previous targetId is not found in memberIds', () => {
		const group: Pick<IndexGroup, 'key' | 'memberIds'> = {
			key: 'A',
			memberIds: ['node-1', 'node-2'],
		};
		const staleCursor: IndexJumpCursor = {
			key: 'A',
			memberIds: ['node-1', 'node-2'],
			targetId: 'stale-id',
		};
		const cursor = nextIndexJump(group, staleCursor);
		expect(cursor?.targetId).toBe('node-1');
	});

	it('does not mutate input group or previous cursor', () => {
		const memberIds = Object.freeze(['n1', 'n2']);
		const group: Pick<IndexGroup, 'key' | 'memberIds'> = Object.freeze({
			key: 'K',
			memberIds,
		});
		const prev: IndexJumpCursor = Object.freeze({
			key: 'K',
			memberIds,
			targetId: 'n1',
		});
		const next = nextIndexJump(group, prev);
		expect(next?.targetId).toBe('n2');
		expect(prev.targetId).toBe('n1');
	});
});
