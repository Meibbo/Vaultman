import { describe, expect, it } from 'vitest';
import {
	BADGE_KIND_ORDER,
	describeBadge,
	describeFabBadge,
	describeHoverBadge,
	detectBadgeContradictions,
	visibleHoverBadgeDescriptors,
	type BadgeKind,
} from '../../../src/badges/serviceBadge';

const t = (key: string): string =>
	({
		'ops.queue': 'Queue',
		'filters.active': 'Active filters',
	})[key] ?? key;

describe('serviceBadge', () => {
	it('owns the canonical badge vocabulary, labels, icons, and order', () => {
		expect(BADGE_KIND_ORDER).toEqual([
			'set',
			'rename',
			'convert',
			'delete',
			'filter',
			'node-note',
		]);
		expect(describeBadge('rename')).toMatchObject({
			kind: 'rename',
			label: 'Rename',
			icon: 'lucide-text-cursor-input',
			order: 1,
		});
		expect(describeBadge('delete')).toMatchObject({
			kind: 'delete',
			label: 'Delete',
			icon: 'lucide-trash-2',
			order: 3,
		});
		expect(describeBadge('node-note')).toMatchObject({
			kind: 'node-note',
			label: 'Node note',
			icon: 'lucide-notebook-tabs',
			order: 5,
		});
	});

	it('describes hover badges while keeping convert queue-only', () => {
		expect(describeHoverBadge('convert')).toBeNull();
		expect(describeHoverBadge('filter')).toMatchObject({
			kind: 'filter',
			label: 'Filter',
			icon: 'lucide-filter',
		});
	});

	it('returns hover badge descriptors in canonical visibility order', () => {
		const active = new Map<string, Set<BadgeKind>>([['n', new Set(['rename'])]]);

		expect(visibleHoverBadgeDescriptors({ id: 'n' }, active).map((badge) => badge.kind)).toEqual([
			'set',
			'delete',
			'filter',
			'node-note',
		]);
	});

	it('describes FAB count badges without component-specific conditionals', () => {
		expect(describeFabBadge('queue', 4, t)).toEqual({
			kind: 'queue',
			count: 4,
			text: '4',
			label: '4 Queue',
			title: '4 Queue',
		});
		expect(describeFabBadge('filters', 2, t)).toEqual({
			kind: 'filters',
			count: 2,
			text: '2',
			label: '2 Active filters',
			title: '2 Active filters',
		});
		expect(describeFabBadge('queue', 0, t)).toBeNull();
	});

	it('detects delete contradictions with mutating badge operations', () => {
		expect(detectBadgeContradictions(['delete', 'filter'])).toEqual([]);
		expect(detectBadgeContradictions(['rename', 'delete', 'set'])).toEqual([
			{
				code: 'delete-with-mutation',
				severity: 'warning',
				badgeKinds: ['set', 'rename', 'delete'],
				message: 'Delete conflicts with set or rename operations on the same node.',
			},
		]);
	});
});
