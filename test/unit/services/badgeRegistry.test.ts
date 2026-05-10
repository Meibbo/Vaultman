import { describe, it, expect } from 'vitest';
import {
	ORDER,
	visibleHoverBadges,
	activeBadges,
	type BadgeKind,
} from '../../../src/services/badgeRegistry';

describe('badgeRegistry', () => {
	describe('ORDER', () => {
		it('is the canonical fixed order', () => {
			expect(ORDER).toEqual(['set', 'rename', 'convert', 'delete', 'filter', 'node-note']);
		});
	});

	describe('visibleHoverBadges', () => {
		it('returns the five hover kinds in canonical order when no ops are active', () => {
			const result = visibleHoverBadges({ id: 'n' }, new Map());
			expect(result).toEqual(['set', 'rename', 'delete', 'filter', 'node-note']);
		});

		it('omits convert from hover render even when no ops are active', () => {
			expect(visibleHoverBadges({ id: 'n' }, new Map())).not.toContain('convert');
		});

		it('hides a hover badge whose kind is already queued', () => {
			const active = new Map<string, Set<BadgeKind>>([['n', new Set(['rename'])]]);
			expect(visibleHoverBadges({ id: 'n' }, active)).toEqual([
				'set',
				'delete',
				'filter',
				'node-note',
			]);
		});

		it('hides multiple already-queued kinds', () => {
			const active = new Map<string, Set<BadgeKind>>([
				['n', new Set<BadgeKind>(['set', 'rename'])],
			]);
			expect(visibleHoverBadges({ id: 'n' }, active)).toEqual([
				'delete',
				'filter',
				'node-note',
			]);
		});

		it('returns only [filter] when delete is queued for the node', () => {
			const active = new Map<string, Set<BadgeKind>>([['n', new Set<BadgeKind>(['delete'])]]);
			expect(visibleHoverBadges({ id: 'n' }, active)).toEqual(['filter']);
		});

		it('still returns only [filter] when delete coexists with other queued ops', () => {
			const active = new Map<string, Set<BadgeKind>>([
				['n', new Set<BadgeKind>(['set', 'rename', 'delete', 'filter'])],
			]);
			expect(visibleHoverBadges({ id: 'n' }, active)).toEqual(['filter']);
		});

		it('treats a missing entry the same as no active ops', () => {
			expect(visibleHoverBadges({ id: 'absent' }, new Map())).toEqual([
				'set',
				'rename',
				'delete',
				'filter',
				'node-note',
			]);
		});

		it('accepts a plain object map shape', () => {
			const active = { n: ['rename'] as BadgeKind[] };
			expect(visibleHoverBadges({ id: 'n' }, active)).toEqual([
				'set',
				'delete',
				'filter',
				'node-note',
			]);
		});
	});

	describe('activeBadges', () => {
		it('returns queued kinds in canonical ORDER', () => {
			const active = new Map<string, Set<BadgeKind>>([
				['n', new Set<BadgeKind>(['filter', 'set', 'convert', 'rename'])],
			]);
			expect(activeBadges({ id: 'n' }, active)).toEqual([
				'set',
				'rename',
				'convert',
				'filter',
			]);
		});

		it('preserves convert (unlike visibleHoverBadges)', () => {
			const active = new Map<string, Set<BadgeKind>>([
				['n', new Set<BadgeKind>(['convert'])],
			]);
			expect(activeBadges({ id: 'n' }, active)).toEqual(['convert']);
		});

		it('returns [] for a node with no active ops', () => {
			expect(activeBadges({ id: 'n' }, new Map())).toEqual([]);
		});
	});
});
