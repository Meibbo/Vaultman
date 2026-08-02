import { describe, expect, it } from 'vitest';
import {
	hasPriorityBadge,
	sortNodesByBadges,
	type NodeBadgeKind,
} from '../../src/logic/logicBadgeSort';

describe('logicBadgeSort semantic badge sorting', () => {
	it('identifies nodes with priority semantic badges', () => {
		expect(hasPriorityBadge({ badge: { kind: 'pending-delete' } })).toBe(true);
		expect(hasPriorityBadge({ badge: { kind: 'conflict' } })).toBe(true);
		expect(hasPriorityBadge({ badge: null })).toBe(false);
		expect(hasPriorityBadge({})).toBe(false);
	});

	it('stably groups priority badged nodes first', () => {
		const items = [
			{ id: '1', name: 'Alpha' },
			{ id: '2', name: 'Beta', badge: { kind: 'pending-rename' as NodeBadgeKind } },
			{ id: '3', name: 'Gamma' },
			{ id: '4', name: 'Delta', badge: { kind: 'conflict' as NodeBadgeKind } },
		];

		const sorted = sortNodesByBadges(items);
		expect(sorted.map((i) => i.id)).toEqual(['2', '4', '1', '3']);
	});
});
