import { describe, expect, it } from 'vitest';

import {
	collectExplorerDeletionIds,
	resolveExplorerHighlight,
	resolveExplorerStatusDots,
} from '../../src/logic/logicExplorerHighlight';

describe('U121-013 explorer highlight contract', () => {
	it.each([
		['hover', { hover: true }],
		['inclusive', { inclusive: true }],
		['exclusive', { exclusive: true }],
		['deletion', { deletion: true }],
	] as const)('keeps the %s channel independent', (channel, input) => {
		const resolved = resolveExplorerHighlight(input);

		expect(resolved[channel]).toBe(true);
		for (const other of ['hover', 'inclusive', 'exclusive', 'deletion'] as const) {
			if (other !== channel) expect(resolved[other]).toBe(false);
		}
	});

	it('preserves simultaneous inclusive, exclusive, deletion and hover state', () => {
		expect(
			resolveExplorerHighlight({
				hover: true,
				inclusive: true,
				exclusive: true,
				deletion: true,
			}),
		).toEqual({
			hover: true,
			inclusive: true,
			exclusive: true,
			deletion: true,
		});
	});

	it('emits inclusive and exclusive collapsed-descendant status independently', () => {
		expect(
			resolveExplorerStatusDots({ inclusive: true, exclusive: true }),
		).toEqual([
			{ channel: 'inclusive', tone: 'filter' },
			{ channel: 'exclusive', tone: 'filter-excluded' },
		]);
	});

	it('bounds status to two deterministic dots when three channels compete', () => {
		expect(
			resolveExplorerStatusDots({
				inclusive: true,
				exclusive: true,
				deletion: true,
			}),
		).toEqual([
			{ channel: 'deletion', tone: 'deletion' },
			{ channel: 'exclusive', tone: 'filter-excluded' },
		]);
	});

	it('does not turn hover into persistent status or operation badge data', () => {
		const dots = resolveExplorerStatusDots({ hover: true });

		expect(dots).toEqual([]);
		expect(dots.some((dot) => 'queueIndex' in dot || 'badge' in dot)).toBe(false);
	});

	it('maps only exact red operation badges to deletion highlight ids', () => {
		const ids = collectExplorerDeletionIds([
			{
				id: 'parent',
				label: 'Parent',
				depth: 0,
				meta: {},
				badges: [{ color: 'red', isInherited: true }],
				children: [
					{
						id: 'child',
						label: 'Child',
						depth: 1,
						meta: {},
						badges: [{ color: 'red' }],
					},
				],
			},
		]);

		expect([...ids]).toEqual(['child']);
	});
});
